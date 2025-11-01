// Sistema de categorias expandido e produtos unificado
const sistemaCategorias = {
  'Hardware': {
    subcategorias: ['Processadores', 'Placas de Vídeo', 'Memórias RAM', 'Placas Mãe', 'Fontes', 'Coolers', 'Gabinetes', 'Armazenamento', 'Placas de Som'],
  },
  'Periféricos': {
    subcategorias: ['Teclados', 'Mouses', 'Headsets', 'Webcams', 'Microfones', 'Mousepads', 'Controles', 'Caixas de Som', 'Monitores'],
  },
  'Computadores': {
    subcategorias: ['PCs Gamer', 'Workstations', 'All-in-One', 'Mini PCs', 'Notebooks', 'Chromebooks', 'Ultrabooks', 'Tablets'],
  },
  'Games': {
    subcategorias: ['Consoles', 'Jogos PC', 'Jogos Console', 'Acessórios Gaming', 'Cadeiras Gamer', 'Mesas Gamer', 'Controles', 'Volantes'],
  },
  'Celular & Smartphone': {
    subcategorias: ['Smartphones', 'Capas e Películas', 'Carregadores', 'Fones de Ouvido', 'Power Banks', 'Suportes', 'Smartwatches'],
  },
  'TV & Áudio': {
    subcategorias: ['Smart TVs', 'TVs 4K', 'TVs 8K', 'Suportes TV', 'Conversores', 'Antenas', 'Soundbars', 'Home Theater'],
  },
  'Áudio': {
    subcategorias: ['Fones de Ouvido', 'Caixas de Som', 'Soundbars', 'Amplificadores', 'Microfones', 'Interfaces de Áudio', 'Monitores de Referência'],
  },
  'Espaço Gamer': {
    subcategorias: ['Cadeiras Gamer', 'Mesas Gamer', 'Suportes Monitor', 'Iluminação RGB', 'Decoração', 'Organização', 'Tapetes'],
  },
  'Casa Inteligente': {
    subcategorias: ['Assistentes Virtuais', 'Câmeras Segurança', 'Lâmpadas Smart', 'Tomadas Smart', 'Sensores', 'Fechaduras Digitais', 'Termostatos'],
  },
  'Giftcards': {
    subcategorias: ['Mais populares','Serviços', 'Jogos', 'Xbox', 'Nintendo'],
  }
};

// Estado global
let produtos = [];
let produtosFiltrados = [];
let filtrosAtuais = {
  busca: '',
  categoria: '',
  subcategoria: '',
  marca: '',
  condicao: '',
  precoMinimo: 0,
  precoMaximo: 15000,
  avaliacaoMinima: 0,
  desconto: false,
  freteGratis: false
};

// Configurações de paginação
let paginacaoConfig = {
  paginaAtual: 1,
  itensPorPagina: 12,
  totalPaginas: 1
};

let ordenacaoAtual = 'relevancia';
let plataformaAtual = 'ambas';
let modoVisualizacao = 'grade';
let favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
let categoriaAtivaSelecionada = '';

// Elementos DOM
const campoBusca = document.getElementById('campoBusca');
const botaoAlternarFiltros = document.getElementById('alternarFiltros');
const barraFiltros = document.getElementById('barraFiltros');
const botaoVisualizacaoGrade = document.getElementById('visualizacaoGrade');
const botaoVisualizacaoLista = document.getElementById('visualizacaoLista');
const categoriasRelacionadas = document.getElementById('categoriasRelacionadas');
const seletorPlataforma = document.getElementById('seletorPlataforma');
const seletorMarca = document.getElementById('seletorMarca');
const faixaPrecoMinimo = document.getElementById('faixaPrecoMinimo');
const faixaPrecoMaximo = document.getElementById('faixaPrecoMaximo');
const spanPrecoMinimo = document.getElementById('valorMinimoRange');
const spanPrecoMaximo = document.getElementById('valorMaximoRange');
const inputPrecoMinimo = document.getElementById('precoMinimo');
const inputPrecoMaximo = document.getElementById('precoMaximo');
const seletorPreco = document.getElementById('seletorPreco');
const filtroAvaliacao = document.getElementById('filtroAvaliacao');
const valorAvaliacao = document.getElementById('valorAvaliacao');
const apenasComDesconto = document.getElementById('apenasComDesconto');
const apenasFreteGratis = document.getElementById('apenasFreteGratis');
const botaoLimparFiltros = document.getElementById('limparFiltros');
const breadcrumb = document.getElementById('breadcrumb');
const breadcrumbDinamico = document.getElementById('breadcrumbDinamico');
const caminhoBreadcrumb = document.getElementById('caminhoBreadcrumb');
const bannerCategoria = document.getElementById('bannerCategoria');
const tituloCategoria = document.getElementById('tituloCategoria');
const descricaoCategoria = document.getElementById('descricaoCategoria');
const contadorResultados = document.getElementById('contadorResultados');
const infoCategoria = document.getElementById('infoCategoria');
const seletorOrdenacao = document.getElementById('seletorOrdenacaoSimples');
const gradeProdutos = document.getElementById('gradeProdutos');
const semResultados = document.getElementById('semResultados');
const paginacao = document.getElementById('paginacao');

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', function() {
  inicializarCategoriasCabecalho();
  inicializarFiltros();
  inicializarEventListeners();
  processarParametrosURL();

  async function carregarProdutos() {
    try {
      let json = null;
      // Carregar somente da API
      try {
        const API_BASE = window.API_BASE || window.location.origin;
        const respApi = await fetch(`${API_BASE}/api/products`, {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });
        if (respApi && respApi.ok) {
          json = await respApi.json();
        }
      } catch (_) {}

      let lista = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      if (!Array.isArray(lista)) lista = [];
      produtos = (lista || []).map(p => {
        // Classificação automática de categoria/subcategoria se ausente
        if (!p.categoria || !p.subcategoria) {
          const { categoria, subcategoria } = classificarProduto(p.titulo || '', p.marca || '');
          p.categoria = p.categoria || categoria;
          p.subcategoria = p.subcategoria || subcategoria;
        }
        // Normalização da imagem principal a partir de `imagens`
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
      // Garante ocultar produtos desativados mesmo em cenários de cache ou dados legados
      produtos = produtos.filter(p => (p.ativo !== false) && (String(p.status || 'ativo').toLowerCase() !== 'inativo'));
      produtosFiltrados = [...produtos];
      // Popular seletor de marcas com dados carregados
      popularMarcas();
      calcularPaginacao();
      renderizarProdutos();
      renderizarPaginacao();
      atualizarInfoResultados();
      aplicarFiltros();
      if (semResultados) semResultados.style.display = produtos.length === 0 ? 'block' : 'none';
    } catch (e) {
      console.error('Erro ao carregar produtos', e);
      if (semResultados) semResultados.style.display = 'block';
    }
  }

  if (gradeProdutos) {
    carregarProdutos();
  }

  if (typeof atualizarContadorCarrinho === 'function') {
    atualizarContadorCarrinho();
  }
});

// Função para inicializar as categorias do cabeçalho
function inicializarCategoriasCabecalho() {
  // Selecionar todos os links da barra de categorias (exceto departamentos)
  const linksCategorias = document.querySelectorAll('.barra-categorias ul li:not(.dropdown) a');
  
  linksCategorias.forEach(link => {
    const titulo = link.textContent.trim();
    
    // Adicionar event listener para navegação
    link.addEventListener('click', function(e) {
      e.preventDefault();
      navegarParaCategoria(titulo);
    });
  });

  // Selecionar todos os dropdowns da barra de categorias
  const barraCategoriasDropdowns = document.querySelectorAll('.barra-categorias .dropdown');
  
  barraCategoriasDropdowns.forEach(dropdown => {
    const linkPrincipal = dropdown.querySelector('a');
    const titulo = linkPrincipal.textContent.trim().replace(/\s*DEPARTAMENTOS\s*/i, '').trim();
    const submenu = dropdown.querySelector('.submenu');
    
    if (sistemaCategorias[titulo] && submenu) {
      // Limpar submenu existente
      submenu.innerHTML = '';
      
      // Adicionar link da categoria principal
      const linkCategoriaPrincipal = document.createElement('li');
      const aCategoriaPrincipal = document.createElement('a');
      aCategoriaPrincipal.href = '#';
      aCategoriaPrincipal.textContent = `Ver todos em ${titulo}`;
      aCategoriaPrincipal.style.fontWeight = 'bold';
      aCategoriaPrincipal.style.borderBottom = '1px solid #eee';
      aCategoriaPrincipal.style.paddingBottom = '8px';
      aCategoriaPrincipal.style.marginBottom = '8px';
      aCategoriaPrincipal.addEventListener('click', function(e) {
        e.preventDefault();
        navegarParaCategoria(titulo);
      });
      linkCategoriaPrincipal.appendChild(aCategoriaPrincipal);
      submenu.appendChild(linkCategoriaPrincipal);
      
      // Adicionar subcategorias
      sistemaCategorias[titulo].subcategorias.forEach(subcategoria => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = subcategoria;
        link.addEventListener('click', function(e) {
          e.preventDefault();
          navegarParaCategoria(titulo, subcategoria);
        });
        li.appendChild(link);
        submenu.appendChild(li);
      });
      
      // Atualizar o link principal também
      linkPrincipal.addEventListener('click', function(e) {
        e.preventDefault();
        navegarParaCategoria(titulo);
      });
    }
  });
}

// Função para navegar para categoria/subcategoria
function navegarParaCategoria(categoria, subcategoria = '') {
  filtrosAtuais.categoria = categoria;
  filtrosAtuais.subcategoria = subcategoria;
  categoriaAtivaSelecionada = categoria;
  paginacaoConfig.paginaAtual = 1;
  
  // Atualizar URL sem recarregar página
  const url = new URL(window.location);
  url.searchParams.set('categoria', categoria);
  if (subcategoria) {
    url.searchParams.set('subcategoria', subcategoria);
  } else {
    url.searchParams.delete('subcategoria');
  }
  window.history.pushState({}, '', url);
  
  renderizarCategoriasRelacionadas();
  mostrarBannerCategoria(categoria, subcategoria);
  aplicarFiltros();
}

// Função para processar parâmetros da URL
function processarParametrosURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const categoriaParam = urlParams.get('categoria');
  const subcategoriaParam = urlParams.get('subcategoria');
  const buscaParam = urlParams.get('busca');
  const marcaParam = urlParams.get('marca');
  
  if (categoriaParam) {
    filtrosAtuais.categoria = categoriaParam;
    categoriaAtivaSelecionada = categoriaParam;
    
    if (subcategoriaParam) {
      filtrosAtuais.subcategoria = subcategoriaParam;
    }
    
    mostrarBannerCategoria(categoriaParam, subcategoriaParam);
  }
  
  if (buscaParam && campoBusca) {
    filtrosAtuais.busca = buscaParam;
    campoBusca.value = buscaParam;
  }

  if (marcaParam) {
    filtrosAtuais.marca = marcaParam;
    if (seletorMarca) {
      try { seletorMarca.value = marcaParam; } catch (_) {}
    }
  }
}

// Função para mostrar banner da categoria com dados personalizados
function mostrarBannerCategoria(categoria, subcategoria = '') {
  if (bannerCategoria && tituloCategoria) {
    const dadosCategoria = sistemaCategorias[categoria];
    
    if (dadosCategoria) {
      // Configurar título e descrição
      if (subcategoria) {
        tituloCategoria.innerHTML = `<i class="${dadosCategoria.icone}"></i> ${subcategoria}`;
      } else {
        tituloCategoria.innerHTML = `<i class="${dadosCategoria.icone}"></i> ${categoria}`;
      }

      // Remover/ocultar a descrição da categoria do banner
      if (descricaoCategoria) {
        try { descricaoCategoria.remove(); } catch (_) { descricaoCategoria.style.display = 'none'; }
      }

      // 👇 Aqui você move o banner para baixo da seção desejada
      const alvo = document.querySelector(".categoria-perifericos"); // ajuste para o seletor correto
      if (alvo) {
        alvo.insertAdjacentElement("afterend", bannerCategoria);
      }

      bannerCategoria.style.display = 'block';
    }
  }
}

// Inicializar filtros
function inicializarFiltros() {
  // Inicializa seletor de marcas com opção padrão; marcas reais serão populadas após carregar produtos
  if (seletorMarca) {
    seletorMarca.innerHTML = '';
    const opcao = document.createElement('option');
    opcao.value = '';
    opcao.textContent = 'Todas as Marcas';
    seletorMarca.appendChild(opcao);
    seletorMarca.disabled = false;
  }

  // Sincroniza seletor de plataforma com o valor padrão atual
  if (seletorPlataforma) {
    try { seletorPlataforma.value = plataformaAtual; } catch (_) {}
  }

  // Seletor de preço (Todos os Preços)
  if (seletorPreco) {
    try { seletorPreco.value = 'todos'; } catch (_) {}
  }

  // Renderizar categorias relacionadas
  renderizarCategoriasRelacionadas();

  // Definir valores iniciais da faixa de preço
  if (faixaPrecoMinimo) faixaPrecoMinimo.value = filtrosAtuais.precoMinimo;
  if (faixaPrecoMaximo) faixaPrecoMaximo.value = filtrosAtuais.precoMaximo;
  if (spanPrecoMinimo) spanPrecoMinimo.textContent = formatarMoeda(filtrosAtuais.precoMinimo);
  if (spanPrecoMaximo) spanPrecoMaximo.textContent = formatarMoeda(filtrosAtuais.precoMaximo);
  if (inputPrecoMinimo) inputPrecoMinimo.value = filtrosAtuais.precoMinimo;
  if (inputPrecoMaximo) inputPrecoMaximo.value = filtrosAtuais.precoMaximo;
  if (valorAvaliacao) valorAvaliacao.textContent = filtrosAtuais.avaliacaoMinima;
  // Deixar o texto "0 estrelas" preto quando valor = 0
  const rotuloAvaliacaoEl = document.querySelector('.rotulo-avaliacao');
  if (rotuloAvaliacaoEl) {
    rotuloAvaliacaoEl.style.color = filtrosAtuais.avaliacaoMinima === 0 ? '#000000' : '';
  }
  if (valorAvaliacao) {
    valorAvaliacao.style.color = filtrosAtuais.avaliacaoMinima === 0 ? '#000000' : '';
  }
}

// Renderizar categorias relacionadas - com layout melhorado
function renderizarCategoriasRelacionadas() {
  if (!categoriasRelacionadas) return;

  categoriasRelacionadas.innerHTML = '';

  Object.entries(sistemaCategorias).forEach(([categoria, data]) => {
    // Se há uma categoria ativa selecionada e não é esta, não mostrar
    if (categoriaAtivaSelecionada && categoriaAtivaSelecionada !== categoria) {
      return;
    }

    // Criar container da categoria
    const categoriaItem = document.createElement('div');
    categoriaItem.className = 'categoria-item';

    // Criar label da categoria principal
    const labelCategoria = document.createElement('span');
    labelCategoria.className = `label-categoria ${filtrosAtuais.categoria === categoria ? 'ativo' : ''}`;
    labelCategoria.innerHTML = `<i class="${data.icone}"></i> ${categoria}`;

    labelCategoria.addEventListener('click', () => {
      // Se clicar na categoria já ativa, limpar seleção
      if (filtrosAtuais.categoria === categoria) {
        filtrosAtuais.categoria = '';
        filtrosAtuais.subcategoria = '';
        categoriaAtivaSelecionada = '';
        
        // Limpar URL
        const url = new URL(window.location);
        url.searchParams.delete('categoria');
        url.searchParams.delete('subcategoria');
        window.history.pushState({}, '', url);
        
        // Ocultar banner
        if (bannerCategoria) bannerCategoria.style.display = 'none';
      } else {
        navegarParaCategoria(categoria);
      }
      
      paginacaoConfig.paginaAtual = 1;
      renderizarCategoriasRelacionadas();
      aplicarFiltros();
    });

    categoriaItem.appendChild(labelCategoria);

    // Se esta categoria está ativa, mostrar subcategorias
    if (categoriaAtivaSelecionada === categoria) {
      const subcategoriasContainer = document.createElement('div');
      subcategoriasContainer.className = 'subcategorias-container visivel';
      
      data.subcategorias.forEach(subcategoria => {
        const subcategoriaItem = document.createElement('div');
        subcategoriaItem.className = 'subcategoria-item';
        
        const labelSub = document.createElement('span');
        labelSub.className = `label-subcategoria ${filtrosAtuais.subcategoria === subcategoria ? 'ativo' : ''}`;
        labelSub.textContent = subcategoria;
        
        labelSub.addEventListener('click', (e) => {
          e.stopPropagation();
          
          if (filtrosAtuais.subcategoria === subcategoria) {
            navegarParaCategoria(categoria);
          } else {
            navegarParaCategoria(categoria, subcategoria);
          }
          
          paginacaoConfig.paginaAtual = 1;
          renderizarCategoriasRelacionadas();
          aplicarFiltros();
        });
        
        subcategoriaItem.appendChild(labelSub);
        subcategoriasContainer.appendChild(subcategoriaItem);
      });
      
      categoriaItem.appendChild(subcategoriasContainer);
    }

    categoriasRelacionadas.appendChild(categoriaItem);
  });
}

// Event Listeners
function inicializarEventListeners() {
  // Busca
  if (campoBusca) {
    campoBusca.addEventListener('input', (e) => {
      filtrosAtuais.busca = e.target.value;
      paginacaoConfig.paginaAtual = 1;
      
      // Atualizar URL
      const url = new URL(window.location);
      if (e.target.value) {
        url.searchParams.set('busca', e.target.value);
      } else {
        url.searchParams.delete('busca');
      }
      window.history.pushState({}, '', url);
      
      aplicarFiltros();
    });
  }

  // Expandir/colapsar seções via setas existentes
  const secoesFiltro = document.querySelectorAll('.barra-filtros .secao-filtro');
  secoesFiltro.forEach(secao => {
    // Estado inicial: expandida
    secao.classList.add('expandida');
    const cabecalho = secao.querySelector('.cabecalho-secao');
    if (cabecalho) {
      cabecalho.addEventListener('click', () => {
        const ficaColapsada = secao.classList.toggle('colapsada');
        secao.classList.toggle('expandida', !ficaColapsada);
      });
    }
  });

  // Seletor de plataforma (Mercado Livre / Amazon / Ambas)
  if (seletorPlataforma) {
    seletorPlataforma.addEventListener('change', (e) => {
      const val = (e.target.value || '').toLowerCase();
      plataformaAtual = val === 'amazon' ? 'amazon' : (val === 'ambas' ? 'ambas' : 'mercadoLivre');
      // Reaplicar filtros e re-renderizar com preços da plataforma selecionada
      paginacaoConfig.paginaAtual = 1;
      aplicarFiltros();
    });
  }

  // Modo de visualização
  if (botaoVisualizacaoGrade) {
    botaoVisualizacaoGrade.addEventListener('click', () => {
      modoVisualizacao = 'grade';
      botaoVisualizacaoGrade.classList.add('ativo');
      if (botaoVisualizacaoLista) botaoVisualizacaoLista.classList.remove('ativo');
      renderizarProdutos();
    });
  }

  if (botaoVisualizacaoLista) {
    botaoVisualizacaoLista.addEventListener('click', () => {
      modoVisualizacao = 'lista';
      botaoVisualizacaoLista.classList.add('ativo');
      if (botaoVisualizacaoGrade) botaoVisualizacaoGrade.classList.remove('ativo');
      renderizarProdutos();
    });
  }

  // Filtros
  if (seletorMarca) {
    seletorMarca.addEventListener('change', (e) => {
      filtrosAtuais.marca = e.target.value;
      paginacaoConfig.paginaAtual = 1;
      aplicarFiltros();
    });
  }

  // Seletor de preço: Todos os Preços
  if (seletorPreco) {
    seletorPreco.addEventListener('change', (e) => {
      if (e.target.value === 'todos') {
        filtrosAtuais.precoMinimo = 0;
        filtrosAtuais.precoMaximo = 15000;
        if (faixaPrecoMinimo) faixaPrecoMinimo.value = String(filtrosAtuais.precoMinimo);
        if (faixaPrecoMaximo) faixaPrecoMaximo.value = String(filtrosAtuais.precoMaximo);
        if (spanPrecoMinimo) spanPrecoMinimo.textContent = formatarMoeda(filtrosAtuais.precoMinimo);
        if (spanPrecoMaximo) spanPrecoMaximo.textContent = formatarMoeda(filtrosAtuais.precoMaximo);
        if (inputPrecoMinimo) inputPrecoMinimo.value = filtrosAtuais.precoMinimo;
        if (inputPrecoMaximo) inputPrecoMaximo.value = filtrosAtuais.precoMaximo;
        paginacaoConfig.paginaAtual = 1;
        aplicarFiltros();
      }
    });
  }

  if (faixaPrecoMinimo) {
    faixaPrecoMinimo.addEventListener('input', (e) => {
      const novoMin = parseInt(e.target.value);
      if (Number.isNaN(novoMin)) return;
      filtrosAtuais.precoMinimo = Math.min(novoMin, filtrosAtuais.precoMaximo);
      // Ajustar max se cruzar
      if (faixaPrecoMaximo) {
        const maxAtual = parseInt(faixaPrecoMaximo.value);
        if (!Number.isNaN(maxAtual) && filtrosAtuais.precoMinimo > maxAtual) {
          faixaPrecoMaximo.value = String(filtrosAtuais.precoMinimo);
          filtrosAtuais.precoMaximo = filtrosAtuais.precoMinimo;
        }
      }
      if (spanPrecoMinimo) spanPrecoMinimo.textContent = formatarMoeda(filtrosAtuais.precoMinimo);
      if (inputPrecoMinimo) inputPrecoMinimo.value = filtrosAtuais.precoMinimo;
      paginacaoConfig.paginaAtual = 1;
      aplicarFiltros();
    });
  }

  if (faixaPrecoMaximo) {
    faixaPrecoMaximo.addEventListener('input', (e) => {
      const novoMax = parseInt(e.target.value);
      if (Number.isNaN(novoMax)) return;
      filtrosAtuais.precoMaximo = Math.max(novoMax, filtrosAtuais.precoMinimo);
      // Ajustar min se cruzar
      if (faixaPrecoMinimo) {
        const minAtual = parseInt(faixaPrecoMinimo.value);
        if (!Number.isNaN(minAtual) && filtrosAtuais.precoMaximo < minAtual) {
          faixaPrecoMinimo.value = String(filtrosAtuais.precoMaximo);
          filtrosAtuais.precoMinimo = filtrosAtuais.precoMaximo;
        }
      }
      if (spanPrecoMaximo) spanPrecoMaximo.textContent = formatarMoeda(filtrosAtuais.precoMaximo);
      if (inputPrecoMaximo) inputPrecoMaximo.value = filtrosAtuais.precoMaximo;
      paginacaoConfig.paginaAtual = 1;
      aplicarFiltros();
    });
  }

  // Inputs de texto de preço
  if (inputPrecoMinimo) {
    inputPrecoMinimo.addEventListener('input', (e) => {
      const v = parseValorTextoPreco(e.target.value);
      filtrosAtuais.precoMinimo = Math.min(v, filtrosAtuais.precoMaximo);
      if (faixaPrecoMinimo) faixaPrecoMinimo.value = String(filtrosAtuais.precoMinimo);
      if (spanPrecoMinimo) spanPrecoMinimo.textContent = formatarMoeda(filtrosAtuais.precoMinimo);
      paginacaoConfig.paginaAtual = 1;
      aplicarFiltros();
    });
    inputPrecoMinimo.addEventListener('blur', (e) => {
      e.target.value = filtrosAtuais.precoMinimo;
    });
  }

  if (inputPrecoMaximo) {
    inputPrecoMaximo.addEventListener('input', (e) => {
      const v = parseValorTextoPreco(e.target.value);
      filtrosAtuais.precoMaximo = Math.max(v, filtrosAtuais.precoMinimo);
      if (faixaPrecoMaximo) faixaPrecoMaximo.value = String(filtrosAtuais.precoMaximo);
      if (spanPrecoMaximo) spanPrecoMaximo.textContent = formatarMoeda(filtrosAtuais.precoMaximo);
      paginacaoConfig.paginaAtual = 1;
      aplicarFiltros();
    });
    inputPrecoMaximo.addEventListener('blur', (e) => {
      e.target.value = filtrosAtuais.precoMaximo;
    });
  }
  if (filtroAvaliacao) {
    filtroAvaliacao.addEventListener('input', (e) => {
      filtrosAtuais.avaliacaoMinima = parseFloat(e.target.value);
      if (valorAvaliacao) valorAvaliacao.textContent = filtrosAtuais.avaliacaoMinima;
      // Ajustar cor do texto quando for 0 estrelas
      const rotuloAvaliacaoEl = document.querySelector('.rotulo-avaliacao');
      if (rotuloAvaliacaoEl) {
        rotuloAvaliacaoEl.style.color = filtrosAtuais.avaliacaoMinima === 0 ? '#000000' : '';
      }
      if (valorAvaliacao) {
        valorAvaliacao.style.color = filtrosAtuais.avaliacaoMinima === 0 ? '#000000' : '';
      }
      paginacaoConfig.paginaAtual = 1;
      aplicarFiltros();
    });
  }

  // Removido filtro de estoque

  if (apenasComDesconto) {
    apenasComDesconto.addEventListener('change', (e) => {
      filtrosAtuais.desconto = e.target.checked;
      paginacaoConfig.paginaAtual = 1;
      aplicarFiltros();
    });
  }

  if (apenasFreteGratis) {
    apenasFreteGratis.addEventListener('change', (e) => {
      filtrosAtuais.freteGratis = e.target.checked;
      paginacaoConfig.paginaAtual = 1;
      aplicarFiltros();
    });
  }

  if (botaoLimparFiltros) {
    botaoLimparFiltros.addEventListener('click', limparFiltros);
  }

  if (seletorOrdenacao) {
    seletorOrdenacao.addEventListener('change', (e) => {
      ordenacaoAtual = e.target.value;
      aplicarFiltros();
    });
  }

  // Alternar visibilidade da barra de filtros em mobile/tablet
  if (botaoAlternarFiltros && barraFiltros) {
    botaoAlternarFiltros.addEventListener('click', () => {
      const visivel = barraFiltros.classList.toggle('visivel');
      botaoAlternarFiltros.setAttribute('aria-expanded', visivel ? 'true' : 'false');
      if (visivel) {
        const primeiroCampo = barraFiltros.querySelector('input, select, button');
        if (primeiroCampo) {
          try { primeiroCampo.focus(); } catch(_) {}
        }
      }
    });
  }
}

// Atualização dinâmica de busca, exposta globalmente para integração com a barra de busca do cabeçalho
function atualizarBuscaProdutos(termo) {
  const texto = String(termo || '').trim();
  filtrosAtuais.busca = texto;
  paginacaoConfig.paginaAtual = 1;
  if (campoBusca) {
    campoBusca.value = texto;
  }
  const url = new URL(window.location);
  if (texto) {
    url.searchParams.set('busca', texto);
  } else {
    url.searchParams.delete('busca');
  }
  window.history.pushState({}, '', url);
  aplicarFiltros();
}

// Aplicar filtros
function aplicarFiltros() {
  // Filtrar produtos com base SOMENTE em campos do banco
  produtosFiltrados = produtos.filter(produto => {
    const textoBusca = String(filtrosAtuais.busca || '').trim();
    const buscaNorm = normalizarTextoLocal(textoBusca);
    const tokens = buscaNorm.split(' ').filter(Boolean);
    const tituloNorm = normalizarTextoLocal(produto.titulo || '');
    const descNorm = normalizarTextoLocal(produto.descricao || '');
    const marcaNorm = normalizarTextoLocal(produto.marca || '');
    const catNorm = normalizarTextoLocal(produto.categoria || '');
    const subNorm = normalizarTextoLocal(produto.subcategoria || '');
    const correspondeABusca = tokens.length === 0 || tokens.every(t =>
      tituloNorm.includes(t) || descNorm.includes(t) || marcaNorm.includes(t) || catNorm.includes(t) || subNorm.includes(t)
    );

    const correspondeACategoria = !filtrosAtuais.categoria || produto.categoria === filtrosAtuais.categoria;
    const correspondeASubcategoria = !filtrosAtuais.subcategoria || produto.subcategoria === filtrosAtuais.subcategoria;
    const correspondeMarca = !filtrosAtuais.marca || (produto.marca || '').toLowerCase() === (filtrosAtuais.marca || '').toLowerCase();
    const precoNumRaw = obterPrecoProduto(produto);
    const precoNum = numero(precoNumRaw);
    const correspondeAoPreco = Number.isFinite(precoNum)
      ? (precoNum >= filtrosAtuais.precoMinimo && precoNum <= filtrosAtuais.precoMaximo)
      : true;
    const correspondeAAvaliacao = numero(produto.avaliacao) >= filtrosAtuais.avaliacaoMinima;

    return correspondeABusca && correspondeACategoria && correspondeASubcategoria && correspondeMarca &&
           correspondeAoPreco && correspondeAAvaliacao;
  });

  // Ordenar produtos
  ordenarProdutos();

  // Calcular paginação
  calcularPaginacao();

  // Atualizar UI
  atualizarBreadcrumb();
  atualizarInfoResultados();
  renderizarProdutos();
  renderizarPaginacao();
}

// Popular marcas únicas no seletor de marca
function popularMarcas() {
  if (!seletorMarca) return;
  const marcas = new Set();
  produtos.forEach(p => {
    const m = (p.marca || '').trim();
    if (m) marcas.add(m);
  });

  const marcasOrdenadas = Array.from(marcas).sort((a, b) => a.localeCompare(b));

  // Preserva a primeira opção "Todas as Marcas"
  seletorMarca.innerHTML = '';
  const opcaoPadrao = document.createElement('option');
  opcaoPadrao.value = '';
  opcaoPadrao.textContent = 'Todas as Marcas';
  seletorMarca.appendChild(opcaoPadrao);

  marcasOrdenadas.forEach(marca => {
    const opt = document.createElement('option');
    opt.value = marca;
    opt.textContent = marca;
    seletorMarca.appendChild(opt);
  });

  // Mantém valor atual do filtro se existir
  if (filtrosAtuais.marca) {
    seletorMarca.value = filtrosAtuais.marca;
  }
}

// Ordenar produtos
function ordenarProdutos() {
  switch (ordenacaoAtual) {
    case 'preco-asc':
      produtosFiltrados.sort((a, b) => numero(obterPrecoProduto(a)) - numero(obterPrecoProduto(b)));
      break;
    case 'preco-desc':
      produtosFiltrados.sort((a, b) => numero(obterPrecoProduto(b)) - numero(obterPrecoProduto(a)));
      break;
    case 'avaliacao':
      produtosFiltrados.sort((a, b) => numero(b.avaliacao) - numero(a.avaliacao));
      break;
    case 'nome':
      produtosFiltrados.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
      break;
    default:
      // Manter ordem original para relevância
      break;
  }
}

// Calcular paginação
function calcularPaginacao() {
  paginacaoConfig.totalPaginas = Math.ceil(produtosFiltrados.length / paginacaoConfig.itensPorPagina);

  // Garantir que a página atual não exceda o total
  if (paginacaoConfig.paginaAtual > paginacaoConfig.totalPaginas && paginacaoConfig.totalPaginas > 0) {
    paginacaoConfig.paginaAtual = paginacaoConfig.totalPaginas;
  } else if (paginacaoConfig.totalPaginas === 0) {
    paginacaoConfig.paginaAtual = 1;
  }
}

// Obter produtos da página atual
function obterProdutosPaginaAtual() {
  const inicio = (paginacaoConfig.paginaAtual - 1) * paginacaoConfig.itensPorPagina;
  const fim = inicio + paginacaoConfig.itensPorPagina;
  return produtosFiltrados.slice(inicio, fim);
}

// Atualizar breadcrumb dinâmico
function atualizarBreadcrumb() {
  // Atualizar breadcrumb dinâmico
  if (breadcrumbDinamico && caminhoBreadcrumb) {
    if (filtrosAtuais.categoria || filtrosAtuais.subcategoria) {
      breadcrumbDinamico.style.display = 'block';

      let caminhoHTML = '';
      
      if (filtrosAtuais.categoria) {
        const dadosCategoria = sistemaCategorias[filtrosAtuais.categoria];
        caminhoHTML += `<span class="item-caminho ${!filtrosAtuais.subcategoria ? 'ativo' : ''}">
          <i class="${dadosCategoria?.icone }"></i> ${filtrosAtuais.categoria}
        </span>`;
        
        if (filtrosAtuais.subcategoria) {
          caminhoHTML += '<span class="separador">›</span>';
          caminhoHTML += `<span class="item-caminho ativo">${filtrosAtuais.subcategoria}</span>`;
        }
      }
      
      caminhoBreadcrumb.innerHTML = caminhoHTML;
    } else {
      breadcrumbDinamico.style.display = 'none';
    }
  }

  // Breadcrumb original (manter para compatibilidade)
  if (breadcrumb) {
    if (filtrosAtuais.categoria || filtrosAtuais.subcategoria) {
      breadcrumb.style.display = 'block';
      let breadcrumbHTML = 'Início';

      if (filtrosAtuais.categoria) {
        breadcrumbHTML += ` › <span class="ativo">${filtrosAtuais.categoria}</span>`;
      }
      
      if (filtrosAtuais.subcategoria) {
        breadcrumbHTML += ` › <span class="ativo">${filtrosAtuais.subcategoria}</span>`;
      }
      
      breadcrumb.innerHTML = breadcrumbHTML;
    } else {
      breadcrumb.style.display = 'none';
    }
  }
}

// Atualizar informações dos resultados
function atualizarInfoResultados() {
  if (contadorResultados) {
    contadorResultados.textContent = `${produtosFiltrados.length}`;
  }

  if (infoCategoria) {
    if (filtrosAtuais.categoria) {
      let textoCategoria = `em ${filtrosAtuais.categoria}`;
      if (filtrosAtuais.subcategoria) {
        textoCategoria += ` › ${filtrosAtuais.subcategoria}`;
      }
      infoCategoria.innerHTML = `<span style="color: #833dd0; margin-left: 0.5rem;">${textoCategoria}</span>`;
    } else {
      infoCategoria.innerHTML = '';
    }
  }
}

// Função para verificar se uma string é uma URL de imagem
function ehURLImagem(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  const extensoesImagem = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const temExtensao = extensoesImagem.some(ext => u.includes(ext));
  if (!temExtensao) return false;
  const caminhoRelativoSemPonto = (u.startsWith('imagens/') || u.startsWith('assets/') || u.startsWith('img/'));
  return url.startsWith('http') || url.startsWith('./') || url.startsWith('/') || caminhoRelativoSemPonto;
}

// Utilitários de formatação com suporte a DECIMAL vindo como string
function numero(valor) {
  if (valor === null || valor === undefined) return 0;
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}
function normalizarTextoLocal(s) {
  if (s === null || s === undefined) return '';
  let str = String(s).toLowerCase();
  try { str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
  str = str.replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, '');
  str = str.replace(/[\p{P}\p{S}]+/gu, ' ');
  str = str.replace(/\s+/g, ' ').trim();
  return str;
}

// Parsing robusto para preço digitado em texto (ex: "R$ 1.200,50")
function parseValorTextoPreco(str) {
  if (str === null || str === undefined) return 0;
  let s = String(str);
  // Remove tudo que não for dígito, ponto ou vírgula
  s = s.replace(/[^\d.,]/g, '');
  // Remove pontos de milhar (ponto seguido de 3 dígitos)
  s = s.replace(/\.(?=\d{3}(\D|$))/g, '');
  // Troca vírgula por ponto para decimal
  s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatarMoeda(valor) {
  const n = numero(valor);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

// Obter preço conforme plataforma atual com fallback
function obterPrecoProduto(produto) {
  const precoML = produto.precoMercadoLivre;
  const precoAMZ = produto.precoAmazon;
  if (plataformaAtual === 'amazon') {
    return precoAMZ != null ? precoAMZ : Number.POSITIVE_INFINITY;
  }
  if (plataformaAtual === 'ambas') {
    const vML = precoML != null ? precoML : Number.POSITIVE_INFINITY;
    const vAMZ = precoAMZ != null ? precoAMZ : Number.POSITIVE_INFINITY;
    return Math.min(vML, vAMZ);
  }
  // padrão: Mercado Livre
  return precoML != null ? precoML : Number.POSITIVE_INFINITY;
}

// Renderizar produtos - com suporte a imagens reais e botão de comprar funcional
function renderizarProdutos() {
  if (!gradeProdutos) return;

  const produtosPagina = obterProdutosPaginaAtual();

  if (produtosPagina.length === 0) {
    gradeProdutos.style.display = 'none';
    if (paginacao) paginacao.style.display = 'none';
    if (semResultados) semResultados.style.display = 'block';
    return;
  }

  gradeProdutos.style.display = 'grid';
  if (semResultados) semResultados.style.display = 'none';

  // Atualizar classe da grade baseada no modo de visualização
  gradeProdutos.className = `grade-produtos ${modoVisualizacao === 'lista' ? 'visualizacao-lista' : ''}`;

  gradeProdutos.innerHTML = produtosPagina.map(produto => {
    const ehFavorito = favoritos.includes(produto.id);

    // Determinar como renderizar a imagem
    let imagemHTML = '';
    if (produto.imagem && ehURLImagem(produto.imagem)) {
      // Usar imagem real com fallback para gradiente
      imagemHTML = `
        <img src="${produto.imagem}" alt="${produto.nome}" class="imagem-produto-real" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="fundo-gradiente ${produto.imagemFallback || 'gradiente-roxo'}" style="display: none;"></div>
      `;
    } else {
      // Usar gradiente
      imagemHTML = `<div class="fundo-gradiente ${produto.imagemFallback || produto.imagem || 'gradiente-roxo'}"></div>`;
    }

    return `
        <a href="/pagina-produto?id=${produto.id}" class="cartao-link">
        <div class="cartao-produto ${modoVisualizacao === 'lista' ? 'visualizacao-lista' : ''}" data-produto-id="${produto.id}">
          <div class="imagem-produto">
            ${imagemHTML}
          </div>
          
          <div class="conteudo-produto">
            <div class="marca-produto">${(produto.marca || '').trim()}</div>
            
            <h3 class="nome-produto">${produto.titulo}</h3>
            
            <div class="avaliacao-produto">
              <div class="estrelas">
                ${gerarEstrelas(produto.avaliacao || 0)}
              </div>
            </div>
            
            <div class="preco-produto">
              ${(() => {
                if (plataformaAtual === 'ambas') {
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
                    <div class="preco-principal">${formatarMoeda(valorMenor)}</div>
                    <div class="parcelamento">até 10x de ${formatarMoeda(parcela10x)}</div>
                    <div class="comparar-lojas">Compare entre ${ofertas.length} lojas</div>
                  `;
                } else {
                  const valorAtual = numero(obterPrecoProduto(produto));
                  const parcela10x = valorAtual > 0 ? (valorAtual / 10) : 0;
                  return `
                    <div class="preco-atual ${plataformaAtual}">
                      <img class="icone-plataforma" src="${plataformaAtual === 'amazon' ? ((typeof window !== 'undefined' && typeof window.getAmazonIconByTheme === 'function') ? window.getAmazonIconByTheme() : '/imagens/logos/amazon-icon.png') : '/imagens/logos/mercadolivre-icon.png'}" ${plataformaAtual === 'amazon' ? 'data-store="amazon"' : ''} alt="${plataformaAtual === 'amazon' ? 'Amazon' : 'Mercado Livre'}" />
                      <span class="moeda">R$</span>
                      <span class="valor">${formatarMoeda(valorAtual).replace(/^R\$\s?/, '')}</span>
                    </div>
                    <div class="parcelamento">até 10x de ${formatarMoeda(parcela10x)}</div>
                  `;
                }
              })()}
            </div>
            
            

            
            <div class="status-produto"></div>
          </div>

          
        </div>
      </a>
    `;
  }).join('');
}

// Classificação simples de categoria/subcategoria com base no título/marca
function classificarProduto(titulo, marca) {
  const t = (titulo || '').toLowerCase();
  const m = (marca || '').toLowerCase();
  // Guarda de prioridade: se for um processador Ryzen,
  // e não houver termos de smartphone, classificar como Hardware > Processadores
  const ehRyzenHardware = /(\bryzen\b)/.test(t) || /(\bryzen\b)/.test(m);
  const ehSmartphone = /(smartphone|celular|iphone|android|galaxy|samsung|samsumg|ios)/.test(t) || /(smartphone|celular|iphone|android|galaxy|samsung|samsumg|ios)/.test(m);
  if (ehRyzenHardware && !ehSmartphone) return { categoria: 'Hardware', subcategoria: 'Processadores' };
  const matchers = [
    // Priorizar smartphones antes de hardware (alinhado ao backend)
    [/smartphone|celular|iphone(?:\s*16)?|galaxy|samsung|samsumg|s\s?24|android|ios/, 'Celular & Smartphone', 'Smartphones'],
    [/placa de vídeo|rtx|gpu|nvidia|radeon/, 'Hardware', 'Placas de Vídeo'],
    [/\bryzen\b/, 'Hardware', 'Processadores'],
    [/notebook|laptop|ultrabook|pc montado|computador montado|pc completo|pc pronto/, 'Computadores', 'Notebooks'],
    [/console|ps5(?:\s*sony)?|sony\s*ps5|playstation\s*5|sony\s*playstation|playstation|xbox|nintendo switch/, 'Games', 'Consoles'],
    [/smart tv|\btv\b|oled|4k|8k|uhd/, 'TV & Áudio', 'Smart TVs'],
    [/teclado/, 'Periféricos', 'Teclados'],
    [/mouse/, 'Periféricos', 'Mouses'],
    [/headset|fone|fones de ouvido/, 'Periféricos', 'Headsets'],
    [/monitor/, 'Periféricos', 'Monitores'],
    [/ssd|nvme|hdd|hd|disco/, 'Hardware', 'Armazenamento'],
    [/memória|ram/, 'Hardware', 'Memórias RAM'],
    [/fonte|psu/, 'Hardware', 'Fontes'],
    [/cadeira gamer|cadeira/, 'Espaço Gamer', 'Cadeiras Gamer'],
    [/alexa|echo/, 'Casa Inteligente', 'Assistentes Virtuais'],
    [/suporte|organizador|stand|headset|controle gamer|controller|gamer/, 'Espaço Gamer', 'Organização'],
    [/gift card xbox|game pass|xbox game pass|ultimate|assinatura|codigo/, 'Giftcards', 'Xbox'],
  ];

  for (const [re, cat, sub] of matchers) {
    if (re.test(t) || re.test(m)) return { categoria: cat, subcategoria: sub };
  }

  return { categoria: 'Hardware', subcategoria: '' };
}

// Renderizar paginação minimalista
function renderizarPaginacao() {
  if (!paginacao || paginacaoConfig.totalPaginas <= 1) {
    if (paginacao) paginacao.style.display = 'none';
    return;
  }

  paginacao.style.display = 'flex';

  let paginacaoHTML = '';

  // Botão anterior
  paginacaoHTML += `<button class="botao-paginacao anterior" ${paginacaoConfig.paginaAtual === 1 ? 'disabled' : ''} onclick="irParaPagina(${paginacaoConfig.paginaAtual - 1})">
    <i class="fas fa-chevron-left"></i>
  </button>`;

  // Lógica para mostrar páginas
  const paginaAtual = paginacaoConfig.paginaAtual;
  const totalPaginas = paginacaoConfig.totalPaginas;

  // Sempre mostrar primeira página
  if (paginaAtual > 3) {
    paginacaoHTML += `<button class="botao-paginacao" onclick="irParaPagina(1)">1</button>`;
    if (paginaAtual > 4) {
      paginacaoHTML += `<span class="separador-paginacao">...</span>`;
    }
  }

  // Páginas ao redor da atual
  const inicio = Math.max(1, paginaAtual - 2);
  const fim = Math.min(totalPaginas, paginaAtual + 2);

  for (let i = inicio; i <= fim; i++) {
    paginacaoHTML += `<button class="botao-paginacao ${i === paginaAtual ? 'ativo' : ''}" onclick="irParaPagina(${i})">
      ${i}
    </button>`;
  }

  // Sempre mostrar última página
  if (paginaAtual < totalPaginas - 2) {
    if (paginaAtual < totalPaginas - 3) {
      paginacaoHTML += `<span class="separador-paginacao">...</span>`;
    }
    paginacaoHTML += `<button class="botao-paginacao" onclick="irParaPagina(${totalPaginas})">${totalPaginas}</button>`;
  }

  // Botão próximo
  paginacaoHTML += `<button class="botao-paginacao proximo" ${paginacaoConfig.paginaAtual === totalPaginas ? 'disabled' : ''} onclick="irParaPagina(${paginacaoConfig.paginaAtual + 1})">
    <i class="fas fa-chevron-right"></i>
  </button>`;

  paginacao.innerHTML = paginacaoHTML;
}

// Ir para página específica
function irParaPagina(numeroPagina) {
  if (numeroPagina >= 1 && numeroPagina <= paginacaoConfig.totalPaginas) {
    paginacaoConfig.paginaAtual = numeroPagina;
    renderizarProdutos();
    renderizarPaginacao();

    // Scroll suave para o topo da área de produtos
    const areaProdutos = document.querySelector('.area-produtos');
    if (areaProdutos) {
      areaProdutos.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }
}

// Gerar HTML das estrelas
function gerarEstrelas(avaliacao) {
  const nota = Math.max(0, Math.min(5, Number(avaliacao) || 0));
  const cheias = Math.floor(nota);
  const temMeia = (nota - cheias) >= 0.5;

  let html = '';
  for (let i = 1; i <= cheias; i++) {
    html += '<i class="fas fa-star estrela"></i>';
  }
  if (temMeia && cheias < 5) {
    html += '<i class="fas fa-star-half-alt estrela"></i>';
  }
  const restantes = 5 - cheias - (temMeia ? 1 : 0);
  for (let i = 0; i < restantes; i++) {
    html += '<i class="fas fa-star estrela vazia"></i>';
  }
  return html;
}

// Alternar favorito
function alternarFavorito(idProduto) {
  if (favoritos.includes(idProduto)) {
    favoritos = favoritos.filter(id => id !== idProduto);
  } else {
    favoritos.push(idProduto);
  }

  localStorage.setItem('favoritos', JSON.stringify(favoritos));
  renderizarProdutos();
}

// Limpar filtros
function limparFiltros() {
  filtrosAtuais = {
    busca: '',
    categoria: '',
    subcategoria: '',
    marca: '',
    condicao: '',
    precoMinimo: 0,
    precoMaximo: 15000,
    avaliacaoMinima: 0,
    desconto: false,
    freteGratis: false
  };

  paginacaoConfig.paginaAtual = 1;
  categoriaAtivaSelecionada = '';

  // Limpar URL
  const url = new URL(window.location);
  url.searchParams.delete('categoria');
  url.searchParams.delete('subcategoria');
  url.searchParams.delete('busca');
  window.history.pushState({}, '', url);

  // Resetar elementos do formulário
  if (campoBusca) campoBusca.value = '';
  if (seletorMarca) seletorMarca.value = '';
  if (seletorPreco) seletorPreco.value = 'todos';
  if (faixaPrecoMinimo) faixaPrecoMinimo.value = 0;
  if (faixaPrecoMaximo) faixaPrecoMaximo.value = 15000;
  if (filtroAvaliacao) filtroAvaliacao.value = 0;
  // filtro apenasEmEstoque removido
  if (apenasComDesconto) apenasComDesconto.checked = false;
  if (apenasFreteGratis) apenasFreteGratis.checked = false;
  if (spanPrecoMinimo) spanPrecoMinimo.textContent = 0;
  if (spanPrecoMaximo) spanPrecoMaximo.textContent = 15000;
  if (valorAvaliacao) valorAvaliacao.textContent = 0;

  // Ocultar banner
  if (bannerCategoria) bannerCategoria.style.display = 'none';

  renderizarCategoriasRelacionadas();
  aplicarFiltros();
}

// Função global para fechar menu (compatibilidade)
function fecharMenu() {
  const menuHamburger = document.getElementById('menu-hamburger');
  if (menuHamburger) {
    menuHamburger.classList.remove('ativo');
  }
}

// Exportar funções para uso global
if (typeof window !== 'undefined') {
  window.navegarParaCategoria = navegarParaCategoria;
  window.irParaPagina = irParaPagina;
  window.alternarFavorito = alternarFavorito;
  window.limparFiltros = limparFiltros;
  window.fecharMenu = fecharMenu;
  window.atualizarBuscaProdutos = atualizarBuscaProdutos;
}





