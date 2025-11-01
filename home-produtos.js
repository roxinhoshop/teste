// Roxinho Shop — Home: módulo de produtos em destaque
// Renderiza cartões de produtos em #grade-produtos-home usando apenas dados da API

async function carregarProdutosDestaque() {
  const container = document.getElementById('grade-produtos-home');
  if (!container) return;

  try {
    // 1) Tenta via API
    let lista = [];
    let json = null;
    try {
      const API_BASE = window.API_BASE || window.location.origin;
      const respApi = await fetch(`${API_BASE}/api/products`);
      if (respApi && respApi.ok) {
        json = await respApi.json();
      }
    } catch (_) {}
    lista = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);

    // Sem fallback: exigir dados da API

    // 3) Sem dados: exibe erro
    if (!Array.isArray(lista) || lista.length === 0) {
      container.innerHTML = `
        <div class="erro-produtos">
          <p>Produtos não disponíveis no momento. Verifique a conexão com a API.</p>
          <button onclick="location.reload()" class="btn-recarregar">Recarregar</button>
        </div>
      `;
      return;
    }

    const ativos = lista.filter(p => p.ativo !== false);
    const destaque = ativos.filter(p => p.destaque === true);
    // Sempre limitar a 5 itens
    const produtosParaExibir = (destaque.length > 0 ? destaque : ativos).slice(0, 5);

    // Normalizar imagem principal a partir de `imagens` (array ou string JSON)
    const normalizados = produtosParaExibir.map(p => {
      try {
        let imgs = p.imagens;
        if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch (_) {} }
        if ((!p.imagem || !ehURLImagem(p.imagem)) && Array.isArray(imgs)) {
          const candidato = imgs.find(u => ehURLImagem(u));
          if (candidato) p.imagem = candidato;
        }
        if (!p.imagem) p.imagem = '/imagens/logos/logo-cabecalho.png';
      } catch (_) {}
      return p;
    });

    container.innerHTML = normalizados.map(produto => {
      let imagemHTML = '';
      if (produto.imagem && ehURLImagem(produto.imagem)) {
        imagemHTML = `
          <img src="${produto.imagem}" alt="${produto.titulo || produto.nome || ''}" class="imagem-produto-real"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="fundo-gradiente ${produto.imagemFallback || 'gradiente-roxo'}" style="display: none;"></div>
        `;
      } else {
        imagemHTML = `<div class="fundo-gradiente ${produto.imagemFallback || 'gradiente-roxo'}"></div>`;
      }

      return `
  <a href="/pagina-produto?id=${produto.id}" class="cartao-link">
          <div class="card-produto-home" data-produto-id="${produto.id}">
            <div class="produto-imagem">
              ${imagemHTML}
            </div>

            <div class="produto-info">
              <div class="produto-marca">${produto.marca || ''}</div>
              <h3 class="produto-nome">${produto.titulo || produto.nome || ''}</h3>
              <div class="produto-avaliacao">
                <div class="estrelas">${gerarEstrelas(produto.avaliacao || 0)}</div>
                <span class="avaliacoes">(${produto.avaliacoes || 0})</span>
              </div>
              <div class="produto-precos">
                ${(() => {
                  const precoML = numero(produto.precoMercadoLivre);
                  const precoAMZ = numero(produto.precoAmazon);
                  const ofertas = [];
                  if (precoML > 0) ofertas.push({ loja: 'Mercado Livre', preco: precoML });
                  if (precoAMZ > 0) ofertas.push({ loja: 'Amazon', preco: precoAMZ });
                  const temOfertas = ofertas.length > 0;
                  const menor = temOfertas ? ofertas.reduce((acc, o) => (o.preco < acc.preco ? o : acc)) : null;
                  const lojaMenor = menor ? menor.loja : '';
                  const valorMenor = menor ? menor.preco : 0;
                  const parcela10x = valorMenor > 0 ? (valorMenor / 10) : 0;
                  return `
                    <div class="menor-preco-label">Menor preço via ${lojaMenor}</div>
                    <div class="preco-principal">${(valorMenor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <div class="parcelamento">até 10x de ${(parcela10x || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <div class="comparar-lojas">Compare entre ${ofertas.length} lojas</div>
                  `;
                })()}
              </div>
            </div>
          </div>
        </a>
      `;
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar produtos da API para a home:', e);
    container.innerHTML = `
      <div class="erro-produtos">
        <p>Erro ao carregar produtos. Tente recarregar a página.</p>
        <button onclick="location.reload()" class="btn-recarregar">Recarregar</button>
      </div>
    `;
  }
}

function ehURLImagem(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  const extensoesImagem = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const temExtensao = extensoesImagem.some(ext => u.includes(ext));
  if (!temExtensao) return false;
  const caminhoRelativoSemPonto = (u.startsWith('imagens/') || u.startsWith('assets/') || u.startsWith('img/'));
  return url.startsWith('http') || url.startsWith('./') || url.startsWith('/') || caminhoRelativoSemPonto;
}

function gerarEstrelas(nota) {
  const n = Math.max(0, Math.min(5, Number(nota) || 0));
  const cheias = Math.floor(n);
  const temMeia = (n - cheias) >= 0.5;

  let html = '';
  for (let i = 0; i < cheias; i++) html += '<i class="fas fa-star"></i>';
  if (temMeia && cheias < 5) html += '<i class="fas fa-star-half-alt"></i>';
  const restantes = 5 - cheias - (temMeia ? 1 : 0);
  for (let i = 0; i < restantes; i++) html += '<i class="far fa-star"></i>';
  return html;
}

function numero(valor) {
  if (valor === null || valor === undefined) return 0;
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
  carregarProdutosDestaque();
});

// Expor utilitários
if (typeof window !== 'undefined') {
  window.carregarProdutosDestaque = carregarProdutosDestaque;
  window.gerarEstrelas = gerarEstrelas;
  window.ehURLImagem = ehURLImagem;
}
