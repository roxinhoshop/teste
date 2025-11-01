const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const fetch = require('node-fetch');
const { withRetry } = require('../utils/retry');
const { sequelize } = require('../config/db');
const SearchHistory = require('../models/SearchHistory');

// Classificação de categorias baseada em palavras-chave no título/descrição
function classificarProduto(p) {
  const persistedCategoria = typeof p.categoria === 'string' ? p.categoria.trim() : '';
  const persistedSub = typeof p.subcategoria === 'string' ? p.subcategoria.trim() : '';

  // Se ambos persistidos, prioriza e retorna imediatamente
  if (persistedCategoria && persistedSub) {
    return { categoria: persistedCategoria, subcategoria: persistedSub };
  }

  const texto = ((p.titulo || '') + ' ' + (p.descricao || '') + ' ' + (p.descricaoDetalhada || '')).toLowerCase();

  // Guarda de prioridade: tratar Processadores Ryzen como Hardware
  // quando não há sinais explícitos de smartphone/celular na descrição
  const ehRyzenHardware = /(\bryzen\b)/.test(texto);
  const ehSmartphone = /(smartphone|celular|iphone|android|galaxy|samsung|samsumg|ios)/.test(texto);
  if (ehRyzenHardware && !ehSmartphone) {
    const computed = { categoria: 'Hardware', subcategoria: 'Processadores' };
    return { categoria: persistedCategoria || computed.categoria, subcategoria: persistedSub || computed.subcategoria };
  }

  const regras = [
    // Caso específico: garantir que "Acer Nitro" caia em Notebooks (antes de PCs Gamer)
    { categoria: 'Computadores', subcategoria: 'Notebooks', palavras: ['acer nitro', 'nitro 5', 'nitro 16', 'nitro 17', 'nitro v15', 'nitro v 15'] },
    // Priorizar PCs Gamer antes de Processadores para evitar que "Intel Core" reclassifique PCs completos
    { categoria: 'Computadores', subcategoria: 'PCs Gamer', palavras: ['pc gamer', 'desktop gamer'] },
    // Consoles antes de Processadores para evitar falso positivo por "cpu"/"núcleos" em descrição de consoles
    { categoria: 'Games', subcategoria: 'Consoles', palavras: ['ps5', 'ps5 sony', 'sony ps5', 'playstation 5', 'playstation', 'sony playstation', 'playstation sony', 'xbox', 'nintendo switch', 'console'] },
    // Jogos e assinaturas de console (mapeia gift cards/assinaturas para categoria existente)
    { categoria: 'Games', subcategoria: 'Jogos Console', palavras: [
      'gift card xbox', 'xbox game pass', 'game pass', 'playstation plus', 'psn', 'nintendo switch online', 'eshop', 'cartao nintendo', 'codigo xbox', 'codigo psn', 'codigo nintendo'
    ] },
    // Jogos de PC e carteiras digitais
    { categoria: 'Games', subcategoria: 'Jogos PC', palavras: [
      'gift card steam', 'saldo steam', 'codigo steam', 'steam wallet', 'origin', 'battle.net', 'blizzard'
    ] },
    // Smartphones PRIORITÁRIOS antes de Hardware para evitar falso positivo por termos técnicos (cpu/ram etc.)
    { categoria: 'Celular & Smartphone', subcategoria: 'Smartphones', palavras: [
      'smartphone', 'celular', 'iphone', 'ios', 'android', 'galaxy', 'samsung', 'samsumg',
      // Casos específicos atuais
      'iphone 16', 'iphone16', 'iphone 16e',
      's24', 's 24', 'galaxy s24', 's24+', 's24 plus', 's24 ultra'
    ] },
    { categoria: 'Hardware', subcategoria: 'Processadores', palavras: ['ryzen'] },
    { categoria: 'Hardware', subcategoria: 'Placas de Vídeo', palavras: ['placa de vídeo', 'placa de video', 'gpu', 'rtx', 'gtx', 'radeon'] },
    { categoria: 'Hardware', subcategoria: 'Memórias RAM', palavras: ['memória', 'memoria', 'ram', 'ddr4', 'ddr5'] },
    { categoria: 'Hardware', subcategoria: 'Placas Mãe', palavras: ['placa mãe', 'placa mae', 'motherboard'] },
    { categoria: 'Periféricos', subcategoria: 'Teclados', palavras: ['teclado', 'keyboard'] },
    { categoria: 'Periféricos', subcategoria: 'Mouses', palavras: ['mouse', 'mouse gamer'] },
    // Colocar "Espaço Gamer" antes de Headsets para captar suportes/organizadores (sem conflitar com headsets/controles)
    // Foco em acessórios de organização/estética do setup
    { categoria: 'Espaço Gamer', subcategoria: 'Organização', palavras: ['suporte', 'organizador', 'stand', 'suporte headset', 'base de monitor', 'iluminação rgb', 'decoracao', 'tapete gamer'] },
    // Controles (evitar falso positivo de "controle remoto": usar termos específicos de gaming)
    { categoria: 'Games', subcategoria: 'Controles', palavras: ['controller', 'dualshock', 'dualsense', 'joycon', 'xbox wireless controller', 'pro controller'] },
    { categoria: 'Periféricos', subcategoria: 'Headsets', palavras: ['headset', 'fone', 'headphone'] },
    { categoria: 'Periféricos', subcategoria: 'Monitores', palavras: ['monitor', 'lcd', 'led', 'gaming monitor'] },
    { categoria: 'Computadores', subcategoria: 'Notebooks', palavras: ['notebook', 'laptop', 'pc montado', 'computador montado', 'pc completo', 'pc pronto'] },
    { categoria: 'Celular & Smartphone', subcategoria: 'Smartphones', palavras: ['smartphone', 'celular', 'iphone', 'android', 'galaxy', 'ios', 'samsung', 'samsumg'] },
    { categoria: 'TV & Áudio', subcategoria: 'Smart TVs', palavras: ['smart tv', 'televisão', 'televisao', 'tv 4k', 'tv 8k', 'uhd'] },
    { categoria: 'Áudio', subcategoria: 'Caixas de Som', palavras: ['caixa de som', 'soundbar', 'alto-falante', 'alto falante', 'speaker', 'bluetooth', 'boombox', 'jbl'] },
    { categoria: 'Casa Inteligente', subcategoria: 'Assistentes Virtuais', palavras: ['alexa', 'google home', 'assistant', 'echo'] },
  ];

  let computed = null;
  for (const regra of regras) {
    if (regra.palavras.some(palavra => texto.includes(palavra))) {
      computed = { categoria: regra.categoria, subcategoria: regra.subcategoria };
      break;
    }
  }
  if (!computed) {
    computed = { categoria: 'Hardware', subcategoria: '' };
  }
  return {
    categoria: persistedCategoria || computed.categoria,
    subcategoria: persistedSub || computed.subcategoria
  };
}

// Normalização simples para busca
function normalizarTexto(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Corrige mojibake típico (UTF-8 lido como Latin1): "numÃ©rico" -> "numérico"
function fixMojibake(str) {
  const s = typeof str === 'string' ? str : '';
  // Só tenta conversão quando há padrões comuns de mojibake
  if (!s || (!s.includes('Ã') && !s.includes('Â'))) return s;
  try {
    return Buffer.from(s, 'latin1').toString('utf8');
  } catch (_) {
    return s;
  }
}

function sanitizeProductText(p) {
  const c = { ...p };
  ['titulo', 'descricao', 'descricaoDetalhada', 'marca', 'categoria', 'subcategoria'].forEach(k => {
    if (typeof c[k] === 'string') c[k] = fixMojibake(c[k]);
  });
  return c;
}

// Pontuação de relevância semelhante ao cabeçalho
function pontuarProduto(produto, tokens, termoRaw) {
  const titulo = produto?.titulo || produto?.nome || '';
  const marca = produto?.marca || '';
  const categoria = produto?.categoria || '';
  const termo = normalizarTexto(termoRaw);
  const tituloNorm = normalizarTexto(titulo);
  const marcaNorm = normalizarTexto(marca);
  const catNorm = normalizarTexto(categoria);

  let score = 0;
  if (tituloNorm === termo) score += 100;
  if (tituloNorm.startsWith(termo)) score += 60;
  const todasNoTitulo = tokens.every(t => tituloNorm.includes(t));
  if (todasNoTitulo) score += 40;
  const temMarca = tokens.some(t => marcaNorm.includes(t));
  if (temMarca) score += 25;
  const temCat = tokens.some(t => catNorm.includes(t));
  if (temCat) score += 15;
  const temModelo = /(?:rtx|gtx|rx|i3|i5|i7|i9|ryzen|m[1-3]|a\d{2}|\b\w{2,}\d{2,}\b)/i.test(termoRaw);
  if (temModelo && new RegExp(termoRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(titulo)) score += 30;
  const precoML = produto.precoMercadoLivre;
  const precoAMZ = produto.precoAmazon;
  if (typeof precoML === 'number' || typeof precoAMZ === 'number') score += 5;
  return score;
}

// Endpoint de busca com sugestões e preview
router.get('/search', async (req, res) => {
  try {
    const termoRaw = String(req.query.q ?? req.query.term ?? req.query.termo ?? '').trim();
    const categoriaFiltro = String(req.query.categoria ?? '').trim();
    // Permitir sugestões já com 1 caractere para "tempo real" no dropdown
    if (!termoRaw || termoRaw.length < 1) {
      return res.status(400).json({ success: false, message: 'Termo de busca muito curto' });
    }
    const termoNorm = normalizarTexto(termoRaw);
    const tokens = termoNorm.split(' ').filter(Boolean);

  // Carrega todos os produtos para aplicar regras e filtros
  const registros = await Product.findAll({ order: [['id', 'DESC']] });
  const base = registros.map(r => {
    let p = r.get({ plain: true });
    if (p.imagens && typeof p.imagens === 'string') {
      try { p.imagens = JSON.parse(p.imagens); } catch (_) {}
    }
    p = sanitizeProductText(p);
    const { categoria, subcategoria } = classificarProduto(p);
    return { ...p, categoria, subcategoria };
  }).filter(p => p.ativo !== false);

    const matchTokens = (str) => {
      const s = normalizarTexto(str || '');
      return tokens.every(t => s.includes(t));
    };

    // Aplica filtro por categoria se fornecido
    const baseFiltrada = categoriaFiltro
      ? base.filter(p => normalizarTexto(p.categoria).includes(normalizarTexto(categoriaFiltro)))
      : base;

    // Sugestão de intenção (classificar o próprio termo)
    const intentSuggestions = [];
    try {
      const intent = classificarProduto({ titulo: termoRaw, descricao: termoRaw, descricaoDetalhada: '' });
      const catI = intent?.categoria || '';
      const subI = intent?.subcategoria || '';
      if (catI && subI) {
        intentSuggestions.push({ tipo: 'subcategoria', texto: subI, url: `/produtos?categoria=${encodeURIComponent(catI)}&subcategoria=${encodeURIComponent(subI)}` });
      } else if (catI) {
        intentSuggestions.push({ tipo: 'categoria', texto: catI, url: `/produtos?categoria=${encodeURIComponent(catI)}` });
      }
    } catch (_) {}

    // Sugestões de produtos
    const produtoSugestoes = [];
    for (const produto of baseFiltrada) {
      const titulo = produto.titulo || produto.nome || '';
      const marca = produto.marca || '';
      const categoria = produto.categoria || '';
      if (matchTokens(titulo) || matchTokens(marca) || matchTokens(categoria)) {
        const precoML = produto.precoMercadoLivre;
        const precoAMZ = produto.precoAmazon;
        const precoMin = (typeof precoML === 'number' || typeof precoAMZ === 'number')
          ? Math.min(precoML ?? Number.POSITIVE_INFINITY, precoAMZ ?? Number.POSITIVE_INFINITY)
          : produto.preco;
        produtoSugestoes.push({
          tipo: 'produto',
          texto: titulo,
          categoria: produto.categoria,
          preco: precoMin,
    url: `pagina-produto?id=${produto.id}`
        });
      }
    }

    // Sugestões de categorias
    const categoriasSet = Array.from(new Set(baseFiltrada.map(p => p.categoria).filter(Boolean)));
    const categoriaSugestoes = categoriasSet
      .filter(c => matchTokens(c))
      .map(c => ({ tipo: 'categoria', texto: c, url: `/produtos?categoria=${encodeURIComponent(c)}` }));

    // Sugestões de subcategorias (pareadas com categorias)
    const paresSub = Array.from(
      new Set(
        baseFiltrada
          .filter(p => p.subcategoria && p.categoria)
          .map(p => `${p.categoria}|||${p.subcategoria}`)
      )
    );
    const subcategoriaSugestoes = paresSub
      .map(key => {
        const [categoria, subcategoria] = key.split('|||');
        if (!matchTokens(subcategoria)) return null;
        return {
          tipo: 'subcategoria',
          texto: subcategoria,
          url: `/produtos?categoria=${encodeURIComponent(categoria)}&subcategoria=${encodeURIComponent(subcategoria)}`
        };
      })
      .filter(Boolean);

    // Sugestões de marcas
    const marcasSet = Array.from(new Set(baseFiltrada.map(p => p.marca).filter(Boolean)));
    const marcaSugestoes = marcasSet
      .filter(m => matchTokens(m))
      .map(m => ({ tipo: 'marca', texto: m, url: `/produtos?marca=${encodeURIComponent(m)}` }));

    // Combina e remove duplicatas por URL
    const combined = [...intentSuggestions, ...produtoSugestoes, ...categoriaSugestoes, ...subcategoriaSugestoes, ...marcaSugestoes];
    const seen = new Set();
    const todasSugestoes = combined.filter(s => {
      const key = `${s.tipo}|${s.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);

    // Preview de intenção
    let melhor = null;
    let melhorScore = 0;
    for (const p of baseFiltrada) {
      const s = pontuarProduto(p, tokens, termoRaw);
      if (s > melhorScore) { melhorScore = s; melhor = p; }
    }
    const preview = (melhor && melhorScore >= 60) ? { produto: melhor, score: melhorScore, tokens } : null;

    return res.status(200).json({ success: true, suggestions: todasSugestoes, preview });
  } catch (error) {
    console.error('Erro na busca:', error);
    return res.status(500).json({ success: false, message: 'Erro interno na busca' });
  }
});

// Lista todos os produtos com categoria derivada (apenas ativos)
router.get('/', async (req, res) => {
  try {
    const registros = await Product.findAll({ order: [['id', 'DESC']] });
    const produtosMapeados = registros.map(r => {
      let p = r.get({ plain: true });
      // Converte imagens de TEXT(JSON) para array, se presente
      if (p.imagens && typeof p.imagens === 'string') {
        try { p.imagens = JSON.parse(p.imagens); } catch (_) {}
      }
      p = sanitizeProductText(p);
      const { categoria, subcategoria } = classificarProduto(p);
      return { ...p, categoria, subcategoria };
    });

    // Filtra ativos com segurança mesmo sem coluna
    const produtosAtivos = produtosMapeados.filter(p => p.ativo !== false);

    return res.status(200).json({ success: true, count: produtosAtivos.length, data: produtosAtivos });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    return res.status(500).json({ success: false, message: 'Erro interno ao listar produtos' });
  }
});

// Busca produto pelo ID com categoria derivada (apenas ativo)
router.get('/:id(\\d+)', async (req, res) => {
  try {
    const registro = await Product.findByPk(req.params.id);
    if (!registro) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }
    let p = registro.get({ plain: true });
    if (p.imagens && typeof p.imagens === 'string') {
      try { p.imagens = JSON.parse(p.imagens); } catch (_) {}
    }
    if (p.ativo === false) {
      return res.status(404).json({ success: false, message: 'Produto inativo' });
    }
    p = sanitizeProductText(p);
    const { categoria, subcategoria } = classificarProduto(p);
    const produto = { ...p, categoria, subcategoria };
    return res.status(200).json({ success: true, data: produto });
  } catch (error) {
    console.error('Erro ao obter produto:', error);
    return res.status(500).json({ success: false, message: 'Erro interno ao obter produto' });
  }
});

// Utilitário: base de produtos ativos com classificação e preço mínimo
function mapearProdutosBase(registros) {
  return registros.map(r => {
    let p = r.get({ plain: true });
    if (p.imagens && typeof p.imagens === 'string') {
      try { p.imagens = JSON.parse(p.imagens); } catch (_) {}
    }
    p = sanitizeProductText(p);
    const { categoria, subcategoria } = classificarProduto(p);
    const precoML = p.precoMercadoLivre;
    const precoAMZ = p.precoAmazon;
    const precoMin = (typeof precoML === 'number' || typeof precoAMZ === 'number')
      ? Math.min(precoML ?? Number.POSITIVE_INFINITY, precoAMZ ?? Number.POSITIVE_INFINITY)
      : p.preco;
    return { ...p, categoria, subcategoria, precoMin };
  }).filter(p => p.ativo !== false);
}

function filtrarPorCatalogo(base, { categoria, catalogo, subcategoria }) {
  const filtroCat = normalizarTexto(categoria || catalogo || '');
  const filtroSub = normalizarTexto(subcategoria || '');
  let res = base;
  if (filtroCat) res = res.filter(p => normalizarTexto(p.categoria).includes(filtroCat));
  if (filtroSub) res = res.filter(p => normalizarTexto(p.subcategoria).includes(filtroSub));
  return res;
}

// Top mais baratos por catálogo
router.get('/top-cheap', async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 5));
    const registros = await Product.findAll({ order: [['id', 'DESC']] });
    const base = mapearProdutosBase(registros);
    const filtrados = filtrarPorCatalogo(base, {
      categoria: req.query.categoria,
      catalogo: req.query.catalogo,
      subcategoria: req.query.subcategoria
    }).filter(p => typeof p.precoMin === 'number' && isFinite(p.precoMin));
    const ordenados = filtrados.sort((a, b) => a.precoMin - b.precoMin).slice(0, limit);
    const data = ordenados.map(p => ({
      id: p.id,
      titulo: p.titulo || p.nome,
      categoria: p.categoria,
      subcategoria: p.subcategoria,
      preco: p.precoMin,
      linkAmazon: p.linkAmazon,
      linkMercadoLivre: p.linkMercadoLivre
    }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    error.status = 500; error.message = 'Erro ao obter itens mais baratos';
    next(error);
  }
});

// Top mais caros por catálogo
router.get('/top-expensive', async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 5));
    const registros = await Product.findAll({ order: [['id', 'DESC']] });
    const base = mapearProdutosBase(registros);
    const filtrados = filtrarPorCatalogo(base, {
      categoria: req.query.categoria,
      catalogo: req.query.catalogo,
      subcategoria: req.query.subcategoria
    }).filter(p => typeof p.precoMin === 'number' && isFinite(p.precoMin));
    const ordenados = filtrados.sort((a, b) => b.precoMin - a.precoMin).slice(0, limit);
    const data = ordenados.map(p => ({
      id: p.id,
      titulo: p.titulo || p.nome,
      categoria: p.categoria,
      subcategoria: p.subcategoria,
      preco: p.precoMin,
      linkAmazon: p.linkAmazon,
      linkMercadoLivre: p.linkMercadoLivre
    }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    error.status = 500; error.message = 'Erro ao obter itens mais caros';
    next(error);
  }
});

// Produtos mais pesquisados (via SearchHistory)
router.get('/most-searched', async (req, res, next) => {
  try {
    // Funcionalidade removida juntamente com a tabela obsoleta de histórico de buscas.
    return res.status(200).json({ success: true, data: { products: [], terms: [] } });
  } catch (error) {
    error.status = 500; error.message = 'Erro ao obter produtos mais pesquisados';
    next(error);
  }
});

module.exports = router;

// Atualiza produto manualmente (imagens, preços, links e IDs)
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const registro = await Product.findByPk(id);
    if (!registro) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    const {
      titulo,
      descricao,
      descricaoDetalhada,
      precoMercadoLivre,
      precoAmazon,
      linkMercadoLivre,
      linkAmazon,
      mercadoLivreId,
      amazonAsin,
      imagens,
      categoria,
      subcategoria
    } = req.body || {};

    // Atualiza campos básicos, se fornecidos
    if (typeof titulo === 'string') registro.titulo = titulo;
    if (typeof descricao === 'string') registro.descricao = descricao;
    if (typeof descricaoDetalhada === 'string') registro.descricaoDetalhada = descricaoDetalhada;
    if (precoMercadoLivre !== undefined && precoMercadoLivre !== null) registro.precoMercadoLivre = precoMercadoLivre;
    if (precoAmazon !== undefined && precoAmazon !== null) registro.precoAmazon = precoAmazon;
    if (typeof linkMercadoLivre === 'string') registro.linkMercadoLivre = linkMercadoLivre;
    if (typeof linkAmazon === 'string') registro.linkAmazon = linkAmazon;
    if (typeof mercadoLivreId === 'string') registro.mercadoLivreId = mercadoLivreId;
    if (typeof amazonAsin === 'string') registro.amazonAsin = amazonAsin;
    // Atualiza classificação manual, se fornecida
    if (typeof categoria === 'string') registro.categoria = categoria;
    if (typeof subcategoria === 'string') registro.subcategoria = subcategoria;

    // Processa imagens
    let imagensArray = [];
    if (Array.isArray(imagens)) {
      imagensArray = imagens.filter(x => typeof x === 'string' && x.trim() !== '');
    } else if (typeof imagens === 'string') {
      // aceita string separada por vírgulas
      imagensArray = imagens.split(',').map(s => s.trim()).filter(s => s);
    }

    if (imagensArray.length > 0) {
      // Garante exatamente 4 imagens (preenche repetindo a primeira ou corta)
      if (imagensArray.length < 4) {
        const primeira = imagensArray[0];
        while (imagensArray.length < 4) imagensArray.push(primeira);
      } else if (imagensArray.length > 4) {
        imagensArray = imagensArray.slice(0, 4);
      }
      registro.imagens = JSON.stringify(imagensArray);
    }

    await registro.save();

    // Monta resposta com imagens como array
  const p = registro.get({ plain: true });
  if (p.imagens && typeof p.imagens === 'string') {
    try { p.imagens = JSON.parse(p.imagens); } catch (_) {}
  }
  return res.status(200).json({ success: true, data: sanitizeProductText(p) });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return res.status(500).json({ success: false, message: 'Erro interno ao atualizar produto' });
  }
});

// Augment: adiciona até 2 novas imagens por produto usando links da Amazon/Mercado Livre
router.all('/augment-images', async (req, res) => {
  function sanitizeImages(arr) {
    const imgs = (Array.isArray(arr) ? arr : [])
      .map(u => (typeof u === 'string' ? u.trim() : ''))
      .filter(u => u && /^https?:\/\//i.test(u));
    const dedup = imgs.filter((u, i, a) => a.indexOf(u) === i);
    return dedup;
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
    const controller = new (global.AbortController || require('abort-controller'))();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { ...options, signal: controller.signal });
      return resp;
    } finally {
      clearTimeout(id);
    }
  }

  function extractJsonLdBlocks(html) {
    const blocks = [];
    const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const raw = m[1].trim();
      try { blocks.push(JSON.parse(raw)); }
      catch (_) {
        try { blocks.push(JSON.parse(raw.replace(/,\s*([}\]])/g, '$1'))); } catch (_) {}
      }
    }
    return blocks;
  }

  function findProductFromJsonLd(blocks) {
    for (const b of blocks) {
      if (!b) continue;
      const type = b['@type'] || (Array.isArray(b['@graph']) ? b['@graph'][0]?.['@type'] : null);
      const isProduct = (typeof type === 'string' && type.toLowerCase().includes('product'))
        || (Array.isArray(type) && type.some(t => String(t).toLowerCase().includes('product')));
      if (isProduct) return b;
      if (Array.isArray(b['@graph'])) {
        const p = b['@graph'].find(n => {
          const t = n['@type'];
          return (typeof t === 'string' && t.toLowerCase().includes('product'))
            || (Array.isArray(t) && t.some(x => String(x).toLowerCase().includes('product')));
        });
        if (p) return p;
      }
    }
    return null;
  }

  async function scrapeAmazonImages(url) {
    if (!url) return [];
    const resp = await withRetry(() => fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    }, 20000), { retries: 2, delayMs: 800 });
    const html = await resp.text();
    const blocks = extractJsonLdBlocks(html);
    const product = findProductFromJsonLd(blocks);
    let images = [];
    if (product) {
      const imgField = product.image || product.images || product.photo || product.thumbnailUrl;
      if (Array.isArray(imgField)) images = imgField.filter(x => typeof x === 'string');
      else if (typeof imgField === 'string') images = [imgField];
    }
    try {
      const og = Array.from(html.matchAll(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/gi)).map(m => m[1]);
      images.push(...og);
      const gallery = Array.from(html.matchAll(/https?:[^"']+?\._AC_\d+_\.jpg/gi)).map(m => m[0]);
      images.push(...gallery);
    } catch (_) {}
    return sanitizeImages(images);
  }

  async function scrapeMercadoLivreImages(url) {
    if (!url) return [];
    const resp = await withRetry(() => fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    }, 20000), { retries: 2, delayMs: 800 });
    const html = await resp.text();
    const blocks = extractJsonLdBlocks(html);
    const product = findProductFromJsonLd(blocks);
    let images = [];
    if (product) {
      const imgField = product.image || product.images || product.photo || product.thumbnailUrl;
      if (Array.isArray(imgField)) images = imgField.filter(x => typeof x === 'string');
      else if (typeof imgField === 'string') images = [imgField];
    }
    try {
      const zoomImgs = Array.from(html.matchAll(/class=["']ui-pdp-gallery__figure__image["'][^>]*src=["']([^"']+)["']/gi)).map(m => m[1]);
      const srcImgs = Array.from(html.matchAll(/<img[^>]+class=["'][^"']*ui-pdp-image[^"']*["'][^>]*src=["']([^"']+)["']/gi)).map(m => m[1]);
      images.push(...zoomImgs, ...srcImgs);
    } catch (_) {}
    return sanitizeImages(images);
  }

  try {
    const produtos = await Product.findAll({
      where: {
        // somente produtos com pelo menos um link
        [require('sequelize').Op.or]: [
          { linkAmazon: { [require('sequelize').Op.ne]: null } },
          { linkMercadoLivre: { [require('sequelize').Op.ne]: null } }
        ]
      },
      order: [['id', 'ASC']]
    });

    if (!produtos.length) {
      return res.status(200).json({ success: true, updated: 0, message: 'Nenhum produto com links para atualizar.' });
    }

    let updated = 0;
    const details = [];

    for (const p of produtos) {
      const id = p.id;
      const amazonUrl = p.linkAmazon || (p.amazonAsin ? `https://www.amazon.com.br/dp/${p.amazonAsin}` : null);
      const mlUrl = p.linkMercadoLivre || (p.mercadoLivreId ? `https://www.mercadolivre.com.br/p/${p.mercadoLivreId}` : null);

      const amzImgs = await scrapeAmazonImages(amazonUrl);
      const mlImgs = await scrapeMercadoLivreImages(mlUrl);
      const candidatos = sanitizeImages([...mlImgs, ...amzImgs]);

      let atuais = [];
      try {
        const raw = p.imagens;
        if (Array.isArray(raw)) atuais = raw;
        else if (typeof raw === 'string') { const arr = JSON.parse(raw); if (Array.isArray(arr)) atuais = arr; }
      } catch (_) { atuais = []; }

      if ((!atuais || atuais.length === 0) && typeof p.imagem === 'string' && /^https?:\/\//i.test(p.imagem)) {
        atuais = [p.imagem];
      }

      const adicionais = candidatos.filter(u => !atuais.includes(u)).slice(0, 2);
      let finais = [...atuais, ...adicionais].filter((u, i, a) => a.indexOf(u) === i);
      if (finais.length > 4) finais = finais.slice(0, 4);
      if (finais.length > 0 && finais.length < 4) {
        const primeira = finais[0];
        while (finais.length < 4) finais.push(primeira);
      }

      if (!adicionais.length) {
        details.push({ id, added: 0 });
        continue;
      }

      await sequelize.query('UPDATE produto SET imagens = ? WHERE id = ?', {
        replacements: [JSON.stringify(finais), id]
      });
      updated++;
      details.push({ id, added: adicionais.length, total: finais.length });
    }

    return res.status(200).json({ success: true, updated, details });
  } catch (error) {
    console.error('Erro ao aumentar imagens:', error);
    return res.status(500).json({ success: false, message: 'Erro interno ao aumentar imagens', error: String(error && error.message || error) });
  }
});
