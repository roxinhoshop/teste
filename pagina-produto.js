class SistemaAvaliacoes {
  constructor() {
    this.produtoAtual = null;
    this.avaliacoes = [];
    this.filtroAtivo = 'todas';
    this.ordenacaoAtiva = 'mais-recentes';
    this.paginaAtual = 1;
    this.itensPorPagina = 5;
    this.notaSelecionadaModal = 0;
    this.fotosUpload = [];
    
    this.inicializar();
  }

  // Inicialização do sistema
  inicializar() {
    this.carregarProdutoDaURL();
    this.configurarEventListeners();
    this.carregarAvaliacoesServidor();
  }

  // Utilitários de formatação e compatibilidade de dados
  numero(valor) {
    if (valor === null || valor === undefined) return 0;
    const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  formatarMoeda(valor) {
    const n = this.numero(valor);
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }


  // Carrega produto baseado no ID da URL
  async carregarProdutoDaURL() {
    const params = new URLSearchParams(window.location.search);
    const idProduto = parseInt(params.get("id"));

    try {
      if (!idProduto) throw new Error('ID do produto ausente');

      let produto = null;

      // Base da API com fallback
      const API_BASE = window.API_BASE || window.location.origin;
      // 1) Buscar pelo ID
      try {
        const resp = await fetch(`${API_BASE}/api/products/${idProduto}`);
        if (resp.ok) {
          const json = await resp.json().catch(() => null);
          if (json && json.success && json.data) {
            produto = json.data;
          }
        }
      } catch (_) {}

      // 2) Buscar lista completa e localizar por ID
      if (!produto) {
        try {
          const respAll = await fetch(`${API_BASE}/api/products`);
          if (respAll.ok) {
            const jsonAll = await respAll.json().catch(() => null);
            const lista = Array.isArray(jsonAll) ? jsonAll : (Array.isArray(jsonAll?.data) ? jsonAll.data : []);
            produto = (lista || []).find(p => Number(p.id) === Number(idProduto)) || null;
          }
        } catch (_) {}
      }
      
      // Sem produto via API: exibir erro e sair
      if (!produto) {
        this.exibirErroProduto();
        return;
      }

      // Normalizar imagem principal e galeria
      try {
        let imgs = produto?.imagens;
        if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch (_) {} }
        if ((!produto.imagem || !this.ehURLImagem(produto.imagem)) && Array.isArray(imgs)) {
          const candidato = imgs.find(u => this.ehURLImagem(u));
          if (candidato) produto.imagem = candidato;
        }
        if (!produto.imagem) produto.imagem = '/imagens/logos/logo-cabecalho.png';
        if (Array.isArray(imgs)) produto.imagens = imgs;
      } catch (_) {}
      this.produtoAtual = produto;
      // Registrar visualização no histórico do usuário
      try { this.registrarVisualizacaoHistorico(); } catch (_) {}
      this.renderizarProduto();
      this.carregarProdutosRelacionados();
      this.carregarAvaliacoesServidor();
    } catch (err) {
      console.error('Erro ao carregar produto:', err);
      this.exibirErroProduto();
    }
  }

  // Exibe mensagem de erro quando produto não é encontrado
  exibirErroProduto() {
    const container = document.querySelector('.container-produto');
    if (container) {
      container.innerHTML = `
        <div class="erro-produto">
          <h2>Produto não encontrado</h2>
          <p>O produto que você está procurando não existe ou foi removido.</p>
  <a href="/produtos" class="btn-voltar">Voltar aos produtos</a>
        </div>
      `;
    }
  }

  // Renderiza informações básicas do produto
  renderizarProduto() {
    const produto = this.produtoAtual;
    
    // Breadcrumb - com verificação de elemento
    const breadcrumb = document.getElementById("breadcrumb");
    if (breadcrumb) {
    breadcrumb.innerHTML = `
      <span class="texto-voce-esta-em">Você está em:</span>
      <a href="/" class="item-caminho">Home</a>
      <span class="separador">></span>
  <a href="/produtos?categoria=${encodeURIComponent(produto.categoria || '')}" class="item-caminho">${produto.categoria || 'Categoria'}</a>
      <span class="separador">></span>
  <a href="/produtos?categoria=${encodeURIComponent(produto.categoria || '')}&subcategoria=${encodeURIComponent(produto.subcategoria || '')}" class="item-caminho">${produto.subcategoria || 'Subcategoria'}</a>
      <span class="separador">></span>
      <span class="codigo-prod">Código PROD${produto.id.toString().padStart(5,"0")}</span>
    `;
    }

    // Informações básicas - com verificações de elementos
    // Imagem principal com fallback e onerror seguro
    const imgPrincipalEl = document.getElementById("imagemProduto");
    if (imgPrincipalEl) {
      const srcValido = produto.imagem && this.ehURLImagem(produto.imagem) ? produto.imagem : '/imagens/thumbs/produto1.webp';
      imgPrincipalEl.setAttribute('src', srcValido);
      imgPrincipalEl.setAttribute('alt', produto.titulo || 'Imagem do produto');
      // Priorizar carregamento da imagem principal para LCP
      imgPrincipalEl.setAttribute('fetchpriority', 'high');
      imgPrincipalEl.setAttribute('loading', 'eager');
      imgPrincipalEl.setAttribute('decoding', 'async');
      imgPrincipalEl.onerror = function() {
        this.onerror = null;
        this.src = '/imagens/thumbs/produto1.webp';
      };
    }
    this.definirElementoTexto("marcaProduto", produto.marca || '');
    this.definirElementoTexto("nomeProduto", produto.titulo || '');
    this.definirElementoTexto("descricaoProduto", produto.descricao || '');
    
    // Exibe ID do produto vindo do banco de dados
    this.definirElementoTexto("skuProduto", "ID do Produto: PROD" + String(produto.id).padStart(5,"0"));

    // Preços por plataforma
    const precoML = produto.precoMercadoLivre;
    const precoAMZ = produto.precoAmazon;
    this.definirElementoTexto("precoMercadoLivre", this.formatarMoeda(precoML));
    this.definirElementoTexto("precoAmazon", this.formatarMoeda(precoAMZ));

    // Comparativo de preços (agora com rótulo de menor preço e parcelamento)
    const comparativoEl = document.getElementById('comparativoPrecos');
    if (comparativoEl) {
      const numML = this.numero(precoML);
      const numAMZ = this.numero(precoAMZ);

      const ofertas = [];
      if (numML > 0) ofertas.push({ loja: 'Mercado Livre', preco: numML, plat: 'ml' });
      if (numAMZ > 0) ofertas.push({ loja: 'Amazon', preco: numAMZ, plat: 'amazon' });

      if (ofertas.length > 0) {
        const iguais = (numML > 0 && numAMZ > 0) && Math.abs(numML - numAMZ) < 0.005;
        const menor = ofertas.reduce((acc, o) => (o.preco < acc.preco ? o : acc));
        const maior = ofertas.reduce((acc, o) => (o.preco > acc.preco ? o : acc));
        const diferenca = Math.abs(menor.preco - maior.preco);
        const percentual = (numML > 0 && numAMZ > 0) ? Math.round((diferenca / Math.max(numML, numAMZ)) * 100) : 0;
        const amazonLogo = '/imagens/logos/amazon-icon.png';
        const logoMenor = menor.plat === 'ml' ? '/imagens/logos/mercadolivre-icon.png' : amazonLogo;
        const logoMaior = maior.plat === 'ml' ? '/imagens/logos/mercadolivre-icon.png' : amazonLogo;

        comparativoEl.innerHTML = `
          <div class="menor-preco-label"><img src="${logoMenor}" class="icone-plataforma" ${menor.plat === 'amazon' ? 'data-store="amazon"' : ''} alt="${menor.loja}" /> menor preço via ${menor.loja}</div>
          <div class="preco-principal">${this.formatarMoeda(menor.preco)}</div>
          <div class="parcelamento">ou 10x de ${this.formatarMoeda(menor.preco / 10)}</div>
          <div class="acoes-comparativo">
            <button class="botao-comparativo comparar" data-acao="comparar">Comparar em ${ofertas.length} lojas</button>
            <button class="botao-comparativo ${menor.plat}" data-plataforma="${menor.plat}"><img src="${logoMenor}" class="icone-plataforma" ${menor.plat === 'amazon' ? 'data-store="amazon"' : ''} alt="${menor.loja}" /> Ir para ${menor.loja}</button>
            ${ofertas.length > 1 ? `<button class="botao-comparativo ${maior.plat}" data-plataforma="${maior.plat}"><img src="${logoMaior}" class="icone-plataforma" ${maior.plat === 'amazon' ? 'data-store="amazon"' : ''} alt="${maior.loja}" /> Ver outra oferta</button>` : ''}
          </div>
          <div class="detalhes-comparativo">
            ${iguais 
              ? `Preços iguais entre <span class="valor-ml"><img src="/imagens/logos/mercadolivre-icon.png" class="icone-plataforma" alt="Mercado Livre" /> ${this.formatarMoeda(numML)}</span> e <span class="valor-amazon"><img src="${amazonLogo}" class="icone-plataforma" data-store="amazon" alt="Amazon" /> ${this.formatarMoeda(numAMZ)}</span>`
              : ofertas.length > 1 ? `<span class="valor-ml"><img src="/imagens/logos/mercadolivre-icon.png" class="icone-plataforma" alt="Mercado Livre" /> ${this.formatarMoeda(numML)}</span> vs <span class="valor-amazon"><img src="${amazonLogo}" class="icone-plataforma" data-store="amazon" alt="Amazon" /> ${this.formatarMoeda(numAMZ)}</span> • diferença de ${this.formatarMoeda(diferenca)} (${percentual}%)` : ''}
          </div>
        `;

        // Ações
        comparativoEl.querySelectorAll('.botao-comparativo').forEach(btn => {
          const plat = btn.dataset.plataforma;
          const acao = btn.dataset.acao;
          if (acao === 'comparar') {
            btn.addEventListener('click', () => {
              const elLista = document.getElementById('listaOfertas');
              if (elLista) elLista.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          } else if (plat === 'ml') {
            btn.addEventListener('click', () => this.abrirMercadoLivre());
          } else if (plat === 'amazon') {
            btn.addEventListener('click', () => this.abrirAmazon());
          }
        });
      } else {
        comparativoEl.innerHTML = `
          <div class="comparativo-destaque">
            <div class="valor-diferenca">Compare ofertas — veja o melhor preço disponível</div>
            <div class="acoes-comparativo">
              <button class="botao-comparativo comparar" data-acao="comparar">Comparar em 0 lojas</button>
            </div>
          </div>`;
        const btn = comparativoEl.querySelector('.botao-comparativo.comparar');
        if (btn) btn.addEventListener('click', () => {
          const elLista = document.getElementById('listaOfertas');
          if (elLista) elLista.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }

    // Oculta elementos antigos de preço/parcelamento
    const precoProduto = document.getElementById("precoProduto");
    if (precoProduto) precoProduto.style.display = 'none';
    const precoOriginal = document.getElementById("precoOriginal");
    if (precoOriginal) precoOriginal.style.display = 'none';
    const descontoProduto = document.getElementById("descontoProduto");
    if (descontoProduto) descontoProduto.style.display = 'none';
    const parcelamentoProduto = document.getElementById("parcelamentoProduto");
    if (parcelamentoProduto) parcelamentoProduto.style.display = 'none';

    // Renderiza galeria de miniaturas (dinâmica e responsiva)
    const miniaturas = document.getElementById('miniaturas');
    const imagemPrincipalEl = document.getElementById('imagemProduto');
    if (miniaturas && imagemPrincipalEl) {
      // Coleta e normaliza imagens do produto
      let imagensRaw = [];
      if (Array.isArray(produto.imagens)) {
        imagensRaw = produto.imagens;
      } else if (produto.imagens && typeof produto.imagens === 'string') {
        try { imagensRaw = JSON.parse(produto.imagens); } catch (_) { imagensRaw = []; }
      }
      if ((!imagensRaw || imagensRaw.length === 0) && produto.imagem) {
        imagensRaw = [produto.imagem];
      }

      // Filtra URLs válidas, remove duplicadas e limita a 4 somente quando houver 4+
      let imagens = (Array.isArray(imagensRaw) ? imagensRaw : [])
        .map(u => (typeof u === 'string' ? u.trim() : ''))
        .filter(u => u && this.ehURLImagem(u));
      imagens = imagens.filter((u, i, a) => a.indexOf(u) === i);

      const temQuatroOuMais = imagens.length >= 4;
      const thumbs = temQuatroOuMais ? imagens.slice(0, 4) : imagens.slice(0);

      // Define imagem principal com fallback robusto
      if (thumbs.length > 0) {
        const src0 = thumbs[0];
        imagemPrincipalEl.setAttribute('src', src0);
        imagemPrincipalEl.setAttribute('alt', produto.titulo || 'Imagem do produto');
        // Manter prioridade da imagem principal mesmo quando trocada
        imagemPrincipalEl.setAttribute('fetchpriority', 'high');
        imagemPrincipalEl.setAttribute('loading', 'eager');
        imagemPrincipalEl.setAttribute('decoding', 'async');
        imagemPrincipalEl.style.cursor = 'zoom-in';
        imagemPrincipalEl.onclick = () => abrirImagemModal(src0);
      } else {
        const fallback = '/imagens/thumbs/produto1.webp';
        imagemPrincipalEl.setAttribute('src', fallback);
        imagemPrincipalEl.setAttribute('alt', 'Imagem indisponível');
        imagemPrincipalEl.setAttribute('fetchpriority', 'high');
        imagemPrincipalEl.setAttribute('loading', 'eager');
        imagemPrincipalEl.setAttribute('decoding', 'async');
        imagemPrincipalEl.style.cursor = 'default';
        imagemPrincipalEl.onclick = null;
      }

      // Monta miniaturas dinamicamente
      miniaturas.innerHTML = '';
      miniaturas.classList.remove('thumbs-1','thumbs-2','thumbs-3','thumbs-4','sem-imagens');
      if (thumbs.length === 0) {
        miniaturas.classList.add('sem-imagens');
        miniaturas.innerHTML = '<div class="miniaturas-vazio">Sem imagens disponíveis</div>';
      } else {
        const countClass = thumbs.length >= 4 ? 'thumbs-4' : `thumbs-${thumbs.length}`;
        miniaturas.classList.add(countClass);
        miniaturas.innerHTML = thumbs.map((src, idx) => `
          <img src="${src}" alt="Miniatura ${idx + 1}" class="miniatura ${idx === 0 ? 'ativa' : ''}" data-index="${idx}" loading="lazy" decoding="async" />
        `).join('');

        miniaturas.querySelectorAll('.miniatura').forEach(el => {
          el.addEventListener('click', () => {
            const src = el.getAttribute('src');
            imagemPrincipalEl.setAttribute('src', src);
            imagemPrincipalEl.setAttribute('alt', produto.titulo || 'Imagem do produto');
            imagemPrincipalEl.onclick = () => abrirImagemModal(src);
            miniaturas.querySelectorAll('.miniatura').forEach(m => m.classList.remove('ativa'));
            el.classList.add('ativa');
          });
        });
      }
    }
    
    // Título da página
    document.title = `${produto.titulo || 'Produto'} | Roxinho Shop`;

    // Renderiza lista de ofertas/lojas
    this.renderizarListaOfertas(produto);

    // Renderiza gráfico na nova seção ao lado esquerdo
    try { this.renderizarGraficoHistorico(); } catch (e) { console.warn('Falha ao renderizar gráfico:', e); }

    // Ajusta a altura do gráfico para alinhar com o comparativo à direita
    this.ajustarAlturaGraficoParaComparativo();
  }

  // Função auxiliar para definir texto em elementos com verificação
  definirElementoTexto(id, valor, atributo = 'textContent') {
    const elemento = document.getElementById(id);
    if (elemento) {
      if (atributo === 'textContent') {
        elemento.textContent = valor;
      } else {
        elemento.setAttribute(atributo, valor);
      }
    }
  }

  // Carrega produtos relacionados usando o novo sistema de cartões
  async carregarProdutosRelacionados() {
    const gradeRelacionados = document.getElementById('gradeRelacionados');
    if (!gradeRelacionados) return;

    try {
      let todos = [];

      // Obter apenas do backend
      const API_BASE = window.API_BASE || window.location.origin;
      const resp = await fetch(`${API_BASE}/api/products`);
      if (resp.ok) {
        try {
          const json = await resp.json();
          todos = (json && json.data) ? json.data : [];
        } catch (_) { todos = []; }
      }

      // Sem dados da API: manter lista vazia
      if (!Array.isArray(todos)) todos = [];

      // Seleção robusta de relacionados:
      // 1) Mesma categoria (se existir)
      // 2) Mesma marca (fallback)
      // 3) Destaques ou demais ativos para completar até 4 itens
      const candidatosBase = todos
        .filter(p => p && p.ativo !== false && Number(p.id) !== Number(this.produtoAtual.id));

      let relacionados = [];

      // Por categoria quando disponível
      if (this.produtoAtual && this.produtoAtual.categoria) {
        relacionados = candidatosBase.filter(p => p.categoria === this.produtoAtual.categoria);
      }

      // Fallback por marca
      if (relacionados.length < 4 && this.produtoAtual && this.produtoAtual.marca) {
        const marcaAtual = String(this.produtoAtual.marca || '').toLowerCase();
        const porMarca = candidatosBase.filter(p => String(p.marca || '').toLowerCase() === marcaAtual);
        // Mesclar sem duplicar
        const mapa = new Map();
        [...relacionados, ...porMarca].forEach(item => mapa.set(item.id, item));
        relacionados = Array.from(mapa.values());
      }

      // Completar com destaques e depois restantes
      if (relacionados.length < 4) {
        const destaques = candidatosBase.filter(p => p.destaque === true);
        const restantes = candidatosBase;
        const jaIds = new Set(relacionados.map(r => r.id));
        const preenchimento = [...destaques, ...restantes]
          .filter(p => !jaIds.has(p.id))
          .slice(0, Math.max(0, 4 - relacionados.length));
        relacionados = [...relacionados, ...preenchimento];
      }

      relacionados = relacionados.slice(0, 4);

      // Normalizar imagem principal dos relacionados a partir de `imagens`
      relacionados = relacionados.map(p => {
        try {
          let imgs = p.imagens;
          if (typeof imgs === 'string') {
            try { imgs = JSON.parse(imgs); } catch (_) { imgs = []; }
          }
          if ((!p.imagem || !this.ehURLImagem(p.imagem)) && Array.isArray(imgs)) {
            const candidato = imgs.find(u => this.ehURLImagem(u));
            if (candidato) p.imagem = candidato;
          }
          if (!p.imagem) p.imagem = '/imagens/logos/logo-cabecalho.png';
        } catch (_) {}
        return p;
      });

      if (!relacionados || relacionados.length === 0) {
        gradeRelacionados.innerHTML = `
          <div class="estado-vazio">
            <i class="fas fa-box-open"></i>
            <h3>Nenhum item relacionado encontrado</h3>
            <p>Tente outras categorias ou volte mais tarde.</p>
          </div>
        `;
        return;
      }

      gradeRelacionados.innerHTML = relacionados.map(produto => {
        let imagemHTML = '';
        if (produto.imagem && this.ehURLImagem(produto.imagem)) {
          imagemHTML = `
            <img src="${produto.imagem}" alt="${produto.titulo}" class="imagem-produto-real"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="fundo-gradiente ${produto.imagemFallback || 'gradiente-roxo'}" style="display: none;"></div>
          `;
        } else {
          imagemHTML = `<div class="fundo-gradiente ${produto.imagemFallback || 'gradiente-roxo'}"></div>`;
        }

        // Cartão padronizado com classes do site
        return `
  <a href="/pagina-produto?id=${produto.id}" class="cartao-link">
            <div class="cartao-produto" data-produto-id="${produto.id}">
              <div class="imagem-produto">
                ${imagemHTML}
              </div>
              <div class="conteudo-produto">
                <div class="marca-produto">${produto.marca || ''}</div>
                <h3 class="nome-produto">${produto.titulo}</h3>
                <div class="avaliacao-produto">
                  <div class="estrelas">${this.gerarEstrelas(produto.avaliacao || 0)}</div>
                </div>
                <div class="preco-produto">
                  ${(() => {
                    const precoML = this.numero(produto.precoMercadoLivre);
                    const precoAMZ = this.numero(produto.precoAmazon);
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
                      <div class="preco-principal">${this.formatarMoeda(valorMenor)}</div>
                      <div class="parcelamento">até 10x de ${this.formatarMoeda(parcela10x)}</div>
                      <div class="comparar-lojas">Compare entre ${ofertas.length} lojas</div>
                    `;
                  })()}
                </div>
              </div>
            </div>
          </a>
        `;
      }).join('');
    } catch (err) {
      console.error('Erro ao carregar produtos relacionados:', err);
      gradeRelacionados.innerHTML = `
        <div class="estado-vazio">
          <i class="fas fa-box-open"></i>
          <h3>Nenhum item relacionado encontrado</h3>
          <p>Tente outras categorias ou volte mais tarde.</p>
        </div>
      `;
    }
  }

  // Verifica se produto está nos favoritos
  verificarFavorito(produtoId) {
    try {
      const favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
      return favoritos.includes(produtoId);
    } catch (error) {
      console.error('Erro ao verificar favoritos:', error);
      return false;
    }
  }

  // Função auxiliar para verificar se é URL de imagem
  ehURLImagem(url) {
    if (!url || typeof url !== 'string') return false;
    const u = url.toLowerCase();
    const extensoesImagem = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const temExtensao = extensoesImagem.some(ext => u.includes(ext));
    if (!temExtensao) return false;
    const caminhoRelativoSemPonto = (u.startsWith('imagens/') || u.startsWith('assets/') || u.startsWith('img/'));
    return url.startsWith('http') || url.startsWith('./') || url.startsWith('/') || caminhoRelativoSemPonto;
  }

  // Gera estrelas para cartão de produto
  gerarEstrelasCartao(nota) {
    let html = '';
    const notaArredondada = Math.round(nota);
    
    for (let i = 1; i <= 5; i++) {
      if (i <= notaArredondada) {
        html += '<i class="fas fa-star estrela"></i>';
      } else {
        html += '<i class="fas fa-star estrela vazia"></i>';
      }
    }
    
    return html;
  }

  // Sistema de favoritos
  alternarFavorito(produtoId) {
    try {
      let favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
      const index = favoritos.indexOf(produtoId);
      
      if (index > -1) {
        favoritos.splice(index, 1);
      } else {
        favoritos.push(produtoId);
      }
      
      localStorage.setItem('favoritos', JSON.stringify(favoritos));
      
      // Atualizar UI
      const botao = document.querySelector(`[data-produto-id="${produtoId}"] .botao-favorito`);
      if (botao) {
        botao.classList.toggle('ativo');
      }

      // Mostrar feedback
      const produto = produtos.find(p => p.id === produtoId);
      const acao = favoritos.includes(produtoId) ? 'adicionado aos' : 'removido dos';
      if (typeof mostrarNotificacao === 'function') {
        mostrarNotificacao(`${produto?.titulo || 'Produto'} ${acao} favoritos!`, 'info');
      }
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
    }
  }

  // Gera avaliações falsas para demonstração
  gerarAvaliacoesFalsas() {
    const nomes = ['Ana Silva', 'Carlos Santos', 'Maria Oliveira', 'João Costa', 'Luciana Ferreira', 'Roberto Lima', 'Patricia Souza', 'Diego Alves'];
    const comentarios = [
      'Excelente produto! Superou minhas expectativas. Entrega rápida e bem embalado.',
      'Muito bom, recomendo. Qualidade excelente pelo preço pago.',
      'Produto conforme descrito. Funciona perfeitamente, estou satisfeito com a compra.',
      'Ótimo custo-benefício. Chegou no prazo e veio bem protegido.',
      'Adorei! Já é a segunda vez que compro este produto. Sempre de boa qualidade.',
      'Bom produto, mas demorou um pouco para chegar. No mais, tudo ok.',
      'Perfeito! Exatamente como esperava. Recomendo para todos.',
      'Produto de qualidade, porém achei um pouco caro. Mas vale a pena.'
    ];

    this.avaliacoes = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      usuarioNome: nomes[Math.floor(Math.random() * nomes.length)],
      usuarioAvatar: nomes[Math.floor(Math.random() * nomes.length)].split(' ').map(n => n[0]).join(''),
      nota: Math.floor(Math.random() * 2) + 4, // Notas entre 4 e 5
      titulo: `Avaliação do ${nomes[Math.floor(Math.random() * nomes.length)].split(' ')[0]}`,
      comentario: comentarios[Math.floor(Math.random() * comentarios.length)],
      data: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Últimos 30 dias
      compraVerificada: Math.random() > 0.3,
      fotos: Math.random() > 0.7 ? [this.produtoAtual?.imagem || ''] : [],
      uteis: Math.floor(Math.random() * 25),
      utilMarcado: false
    }));

    this.atualizarResumoAvaliacoes();
    this.renderizarAvaliacoes();
  }

  async carregarAvaliacoesServidor() {
    try {
      if (!this.produtoAtual || !this.produtoAtual.id) return;
      const API_BASE = window.API_BASE || window.location.origin;
      const resp = await fetch(`${API_BASE}/api/reviews?produto_id=${this.produtoAtual.id}`);
      if (resp.ok) {
        try {
          const json = await resp.json();
          if (json && json.success && Array.isArray(json.data)) {
            this.avaliacoes = json.data.map(av => ({
              ...av,
              data: new Date(av.data)
            }));
          } else {
            this.avaliacoes = [];
          }
        } catch (_) {
          this.avaliacoes = [];
        }
      } else {
        this.avaliacoes = [];
      }
    } catch (e) {
      console.error('Erro ao carregar avaliações do servidor:', e);
      this.avaliacoes = [];
    }
    this.atualizarResumoAvaliacoes();
    this.paginaAtual = 1;
    this.renderizarAvaliacoes();
  }

  // Renderização da lista de ofertas com destaque para menor preço
  renderizarListaOfertas(produto) {
    const cont = document.getElementById('listaOfertas');
    if (!cont) return;

    const ofertas = [];
    const numML = this.numero(produto.precoMercadoLivre);
    const numAMZ = this.numero(produto.precoAmazon);
    if (numML > 0) ofertas.push({ loja: 'Mercado Livre', preco: numML, link: produto.linkMercadoLivre, plat: 'ml' });
    if (numAMZ > 0) ofertas.push({ loja: 'Amazon', preco: numAMZ, link: produto.linkAmazon, plat: 'amazon' });

    if (ofertas.length === 0) {
      cont.innerHTML = '';
      return;
    }

    ofertas.sort((a, b) => a.preco - b.preco);
    const menorPreco = ofertas[0].preco;

    cont.innerHTML = `
      <div class="cabecalho-ofertas">Compare preços em ${ofertas.length} lojas</div>
      <div class="lista-ofertas-itens">
        ${ofertas.map((o, idx) => `
          <div class="oferta-item ${idx === 0 ? 'menor-preco' : ''}">
            <div class="oferta-preco">
              <div class="valor">${this.formatarMoeda(o.preco)}</div>
              <div class="parcelamento">ou 10x de ${this.formatarMoeda(o.preco / 10)}</div>
            </div>
            <div class="oferta-loja">
               <span class="loja"><img src="${o.plat === 'ml' ? '/imagens/logos/mercadolivre-icon.png' : '/imagens/logos/amazon-icon.png'}" class="icone-plataforma" ${o.plat === 'amazon' ? 'data-store="amazon"' : ''} alt="${o.loja}" /> ${o.loja}</span>
            </div>
            <div class="oferta-acao">
              ${o.link ? `<a class="btn-ir-loja" href="${o.link}" target="_blank" rel="noopener noreferrer">Ir à loja</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Após renderizar ofertas, recalcular alinhamento do gráfico
    this.ajustarAlturaGraficoParaComparativo();
  }

  // Atualiza o resumo de avaliações (média, distribuição)
  atualizarResumoAvaliacoes() {
    const notaMediaEl = document.getElementById('notaMedia');
    const estrelasMediaEl = document.getElementById('estrelasMedia');
    const totalAvaliacoesEl = document.getElementById('totalAvaliacoes');

    if (this.avaliacoes.length === 0) {
      if (notaMediaEl) notaMediaEl.textContent = '0.0';
      if (estrelasMediaEl) estrelasMediaEl.innerHTML = '';
      if (totalAvaliacoesEl) totalAvaliacoesEl.textContent = 'Nenhuma avaliação ainda';
      return;
    }

    // Calcula média
    const soma = this.avaliacoes.reduce((acc, av) => acc + av.nota, 0);
    const media = soma / this.avaliacoes.length;
    
    if (notaMediaEl) notaMediaEl.textContent = media.toFixed(1);
    if (estrelasMediaEl) estrelasMediaEl.innerHTML = this.gerarEstrelas(Math.round(media));
    if (totalAvaliacoesEl) totalAvaliacoesEl.textContent = `${this.avaliacoes.length} avaliações`;

    // Distribuição por estrelas
    for (let i = 1; i <= 5; i++) {
      const count = this.avaliacoes.filter(av => av.nota === i).length;
      const percent = this.avaliacoes.length > 0 ? (count / this.avaliacoes.length) * 100 : 0;
      
      const barra = document.getElementById(`barra${i}`);
      const percentual = document.getElementById(`percentual${i}`);
      
      if (barra) barra.style.width = `${percent}%`;
      if (percentual) percentual.textContent = `${Math.round(percent)}%`;
    }
  }

  // Gera HTML das estrelas
  gerarEstrelas(nota) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<i class="fa-solid fa-star${i <= nota ? '' : ' estrela-inativa'}"></i>`;
    }
    return html;
  }

  // Renderiza lista de avaliações
  renderizarAvaliacoes() {
    const avaliacoesFiltradas = this.filtrarAvaliacoes();
    const avaliacoesOrdenadas = this.ordenarAvaliacoes(avaliacoesFiltradas);
    
    // Paginação
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    const avaliacoesPaginadas = avaliacoesOrdenadas.slice(inicio, fim);

    const listaAvaliacoes = document.getElementById('listaAvaliacoes');
    if (!listaAvaliacoes) return;
    
    if (avaliacoesPaginadas.length === 0) {
      listaAvaliacoes.innerHTML = `
        <div class="estado-vazio">
          <i class="fa-solid fa-star"></i>
          <h3>Nenhuma avaliação encontrada</h3>
          <p>Seja o primeiro a avaliar este produto!</p>
        </div>
      `;
    } else {
      listaAvaliacoes.innerHTML = avaliacoesPaginadas.map(avaliacao => `
        <div class="avaliacao-item" data-avaliacao-id="${avaliacao.id}">
          <div class="cabecalho-avaliacao">
            <div class="avatar-usuario">${avaliacao.usuarioAvatar}</div>
            <div class="info-usuario">
              <div class="nome-usuario">${avaliacao.usuarioNome}</div>
              <div class="meta-avaliacao">
                <div class="estrelas-avaliacao">${this.gerarEstrelas(avaliacao.nota)}</div>
                <span class="data-avaliacao">${this.formatarData(avaliacao.data)}</span>
            
              </div>
              ${avaliacao.titulo ? `<div class="titulo-avaliacao">${avaliacao.titulo}</div>` : ''}
            </div>
            <button class="btn-excluir-avaliacao" title="Excluir" data-id="${avaliacao.id}">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
          <div class="conteudo-avaliacao">
            <p class="texto-avaliacao">${avaliacao.comentario}</p>
            ${avaliacao.fotos.length > 0 ? `
              <div class="fotos-avaliacao">
                ${avaliacao.fotos.map(foto => `<img src="${foto}" alt="Foto da avaliação" class="foto-avaliacao" onclick="abrirImagemModal('${foto}')">`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `).join('');

      // Vincula eventos de exclusão
      document.querySelectorAll('.btn-excluir-avaliacao').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.getAttribute('data-id'), 10);
          this.excluirAvaliacao(id);
        });
      });
    }

    // (Gráfico agora é renderizado em renderizarProduto). Aqui, não chamamos.
  }

  // Registra a visualização atual no histórico (localStorage)
  registrarVisualizacaoHistorico() {
    const produto = this.produtoAtual;
    if (!produto) return;

    const HIST_KEY = 'historico_visualizacoes';
    const precoAtual = this.calcularPrecoAtual(produto);
    // Selecionar imagem válida
    let imagem = '';
    if (produto.imagem && this.ehURLImagem?.(produto.imagem)) {
      imagem = produto.imagem;
    } else {
      imagem = '/imagens/thumbs/produto1.webp';
    }

    const item = {
      id: produto.id,
      titulo: produto.titulo || produto.nome || '',
      precoAtual: precoAtual,
      imagem: imagem,
      visualizadoEm: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem(HIST_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const atual = Array.isArray(arr) ? arr : [];
      // Remove duplicado por id e adiciona no início
      const filtrado = atual.filter(it => String(it.id) !== String(item.id));
      filtrado.unshift(item);
      // Mantém um limite maior (ex.: 50) no armazenamento
      const limitado = filtrado.slice(0, 50);
      localStorage.setItem(HIST_KEY, JSON.stringify(limitado));
    } catch (e) {
      // Silencioso: se localStorage indisponível, não interrompe página
      console.warn('Não foi possível salvar histórico de visualizações:', e);
    }
  }

  // ==============================
  // Histórico de Preços (Gráfico)
  // ==============================
  async renderizarGraficoHistorico() {
    const canvas = document.getElementById('graficoPrecoCanvas');
    const periodosEl = document.getElementById('periodosGrafico');
    if (!canvas) return;

    // Seleção inicial: 40 dias
    let rangeDias = 40;
    const btnAtivo = periodosEl?.querySelector('.btn-periodo.ativo');
    if (btnAtivo) rangeDias = parseInt(btnAtivo.dataset.range || '40');

    const { labels, valores } = await this.obterHistoricoPrecos(this.produtoAtual, rangeDias);
    await this.criarOuAtualizarGrafico(canvas, labels, valores);

    // Listener dos períodos
    if (periodosEl) {
      periodosEl.querySelectorAll('.btn-periodo').forEach(btn => {
        btn.addEventListener('click', async () => {
          periodosEl.querySelectorAll('.btn-periodo').forEach(b => b.classList.remove('ativo'));
          btn.classList.add('ativo');
          const dias = parseInt(btn.dataset.range || '40');
          const { labels, valores } = await this.obterHistoricoPrecos(this.produtoAtual, dias);
          await this.criarOuAtualizarGrafico(canvas, labels, valores);
        });
      });
    }
  }

  async obterHistoricoPrecos(produto, rangeDias) {
    const API_BASE = window.API_BASE || window.location.origin;
    const idProduto = Number(produto?.id || 0);

    // Tenta via API (somente dados reais do banco)
    try {
      const resp = await fetch(`${API_BASE}/api/price-history?produto_id=${idProduto}&range=${rangeDias}`);
      if (resp.ok) {
        const json = await resp.json().catch(() => null);
        const lista = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        if (lista.length > 0) {
          const ordenado = lista
            .filter(i => i && (i.data_coleta || i.data))
            .sort((a,b) => new Date(a.data_coleta || a.data) - new Date(b.data_coleta || b.data));
          const labels = ordenado.map(i => this.rotuloData(i.data_coleta || i.data));
          const valores = ordenado.map(i => this.numero(i.preco));
          if (labels.length && valores.length) return { labels, valores };
        }
      }
    } catch (_) {}
    // Sem fallback: retorna vazio quando não há histórico real
    return { labels: [], valores: [] };
  }

  rotuloData(data) {
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  async criarOuAtualizarGrafico(canvas, labels, valores) {
    // Garante Chart.js carregado (caso CDN demore)
    if (!window.Chart) {
      await new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
        s.onload = resolve;
        document.head.appendChild(s);
      });
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    // Fundo do gráfico com gradiente preto suave
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.00)');

    // Define cores dos labels conforme tema (somente classes, ignora preferências do SO)
    const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
    const tickColor = isDark ? '#FFFFFF' : '#000000';
    // Ajuste global para Chart.js para garantir que textos sigam o tema
    try { if (window.Chart && Chart.defaults) Chart.defaults.color = tickColor; } catch (_) {}

    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const padding = Math.max(20, (max - min) * 0.08);

    if (this._graficoPreco) {
      // Atualiza dados e recalcula gradient conforme nova altura do canvas
      const ctxAtual = canvas.getContext('2d');
      const gradAtual = ctxAtual.createLinearGradient(0, 0, 0, canvas.height);
      gradAtual.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
      gradAtual.addColorStop(1, 'rgba(0, 0, 0, 0.00)');

      this._graficoPreco.data.labels = labels;
      this._graficoPreco.data.datasets[0].data = valores;
      this._graficoPreco.data.datasets[0].backgroundColor = gradAtual;
      this._graficoPreco.options.scales.y.min = Math.max(0, Math.floor(min - padding));
      this._graficoPreco.options.scales.y.max = Math.ceil(max + padding);
      // Atualiza cor dos ticks conforme tema
      try {
        this._graficoPreco.options.scales.x.ticks.color = tickColor;
        this._graficoPreco.options.scales.y.ticks.color = tickColor;
      } catch (_) {}
      this._graficoPreco.update();
      return;
    }

      this._graficoPreco = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Preço',
            data: valores,
            borderColor: '#833dd0',
            backgroundColor: gradient,
            tension: 0.35,
            borderWidth: 3.5,
            borderJoinStyle: 'round',
            borderCapStyle: 'round',
            fill: true,
            pointRadius: (c) => c.dataIndex === c.dataset.data.length - 1 ? 5 : 0,
            pointHoverRadius: 6,
            pointBackgroundColor: '#833dd0',
            pointBorderColor: '#833dd0',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          elements: { point: { hitRadius: 12 } },
          layout: { padding: 4 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.85)',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              borderColor: '#833dd0',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => `R$ ${Number(ctx.parsed.y).toFixed(2).replace('.', ',')}`
              },
              displayColors: false
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                maxTicksLimit: 6,
                color: tickColor,
                font: { weight: 600 }
              }
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.12)' },
              ticks: {
                callback: (v) => `R$ ${Number(v).toFixed(0)}`,
                color: tickColor,
                font: { weight: 600 }
              },
              min: Math.max(0, Math.floor(min - padding)),
              max: Math.ceil(max + padding)
            }
          }
        }
      });
  }

  // Ajusta dinamicamente a altura da seção do gráfico para alinhar
  // seu término com a seção de comparação de preços à direita.
  ajustarAlturaGraficoParaComparativo() {
    try {
      const graficoSecao = document.getElementById('graficoHistorico');
      const canvas = document.getElementById('graficoPrecoCanvas');
      if (!graficoSecao || !canvas) return;

      // Em telas pequenas, evitar fixar altura para não quebrar o fluxo vertical
      const ehLayoutEmpilhado = window.innerWidth <= 768;
      if (ehLayoutEmpilhado) {
        graficoSecao.style.height = '';
        canvas.style.height = '';
        if (this._graficoPreco) this._graficoPreco.resize();
        return;
      }

      // Alvo preferencial: seção de ofertas ("Compare preços em X lojas"); fallback: comparativo
      const comparativo = document.getElementById('comparativoPrecos');
      const listaOfertas = document.getElementById('listaOfertas');
      const alvo = (listaOfertas && listaOfertas.offsetHeight > 0) ? listaOfertas : comparativo;
      if (!alvo) return;

      // Primeiro: alinhar o topo do gráfico com o topo da seção alvo
      const rectGraficoTopo = graficoSecao.getBoundingClientRect();
      const rectAlvoTopo = alvo.getBoundingClientRect();
      const margemAtual = parseFloat(window.getComputedStyle(graficoSecao).marginTop || '0');
      const deltaTopo = Math.round(rectAlvoTopo.top - rectGraficoTopo.top);
      if (isFinite(deltaTopo) && deltaTopo > 0) {
        graficoSecao.style.marginTop = `${margemAtual + deltaTopo}px`;
      }

      // Depois: alinhar o final do gráfico com o final da seção alvo (altura igual)
      const rectGrafico = graficoSecao.getBoundingClientRect();
      const rectAlvo = alvo.getBoundingClientRect();
      let alturaDesejada = Math.round(rectAlvo.bottom - rectGrafico.top);

      // Margem mínima para evitar compressão extrema
      const ALTURA_MIN = 200;
      if (!isFinite(alturaDesejada) || alturaDesejada < ALTURA_MIN) alturaDesejada = ALTURA_MIN;

      // Define altura da seção e do canvas (canvas preenche a seção)
      graficoSecao.style.height = `${alturaDesejada}px`;

      // Considera cabeçalho do gráfico para o canvas ocupar o restante
      const header = graficoSecao.querySelector('.grafico-header');
      const headerStyles = header ? window.getComputedStyle(header) : null;
      const headerAltura = header ? header.offsetHeight : 0;
      const headerMargemInferior = headerStyles ? parseFloat(headerStyles.marginBottom || '0') : 0;
      const alturaCanvas = Math.max(120, alturaDesejada - headerAltura - headerMargemInferior - 8);
      canvas.style.height = `${alturaCanvas}px`;

      // Solicita ao Chart.js que recalibre após mudança de tamanho
      if (this._graficoPreco) {
        try { this._graficoPreco.resize(); } catch (_) {}
      }
    } catch (e) {
      console.warn('Falha ao ajustar altura do gráfico:', e);
    }
  }

  // Determina o preço atual a ser exibido no histórico
  calcularPrecoAtual(produto) {
    const ml = Number(produto?.precoMercadoLivre ?? NaN);
    const az = Number(produto?.precoAmazon ?? NaN);
    const base = Number(produto?.preco ?? NaN);

    const candidatos = [ml, az, base].filter(v => !Number.isNaN(v) && Number.isFinite(v));
    if (candidatos.length === 0) return 0;
    // Escolhe o menor preço disponível como "atual"
    return Math.min(...candidatos);
  }

  // Exclui uma avaliação e atualiza a lista
  excluirAvaliacao(id) {
    if (!id) return;
    const executarExclusao = () => {
      fetch(`${window.API_BASE || window.location.origin}/api/reviews/${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(json => {
          if (json && json.success) {
            this.avaliacoes = this.avaliacoes.filter(av => av.id !== id);
            this.renderizarAvaliacoes();
            window.sitePopup && window.sitePopup.alert('Avaliação excluída com sucesso.', 'Sucesso');
          } else {
            throw new Error('Falha ao excluir');
          }
        })
        .catch(err => {
          console.error('Erro ao excluir avaliação:', err);
          window.sitePopup && window.sitePopup.alert('Não foi possível excluir a avaliação.', 'Erro');
        });
    };
    window.sitePopup && window.sitePopup.confirm('Excluir esta avaliação?').then(sim => { if (sim) executarExclusao(); });
  }

  // Filtra avaliações baseado no filtro ativo
  filtrarAvaliacoes() {
    switch (this.filtroAtivo) {
      case 'todas':
        return this.avaliacoes;
      case '5':
      case '4':
      case '3':
      case '2':
      case '1':
        return this.avaliacoes.filter(av => av.nota === parseInt(this.filtroAtivo));
      case 'fotos':
        return this.avaliacoes.filter(av => av.fotos.length > 0);
      default:
        return this.avaliacoes;
    }
  }

  // Ordena avaliações baseado na ordenação ativa
  ordenarAvaliacoes(avaliacoes) {
    switch (this.ordenacaoAtiva) {
      case 'mais-recentes':
        return [...avaliacoes].sort((a, b) => new Date(b.data) - new Date(a.data));
      case 'mais-antigas':
        return [...avaliacoes].sort((a, b) => new Date(a.data) - new Date(b.data));
      case 'maior-nota':
        return [...avaliacoes].sort((a, b) => b.nota - a.nota);
      case 'menor-nota':
        return [...avaliacoes].sort((a, b) => a.nota - b.nota);

      default:
        return avaliacoes;
    }
  }

  // Configura event listeners
  configurarEventListeners() {
    // Filtros de avaliação
    document.querySelectorAll('.btn-filtro').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('ativo'));
        e.target.classList.add('ativo');
        this.filtroAtivo = e.target.dataset.filtro;
        this.paginaAtual = 1;
        this.renderizarAvaliacoes();
      });
    });

    // Ordenação
    const selectOrdenacao = document.getElementById('ordenarAvaliacoes');
    if (selectOrdenacao) {
      selectOrdenacao.addEventListener('change', (e) => {
        this.ordenacaoAtiva = e.target.value;
        this.paginaAtual = 1;
        this.renderizarAvaliacoes();
      });
    }

    // Modal de avaliação
    this.configurarModal();

    // Botões de ação do produto
    this.configurarBotoesProduto();

    // Reajusta altura do gráfico em resize para manter alinhamento lateral
    window.addEventListener('resize', this.ajustarAlturaGraficoParaComparativo.bind(this));
  }

  // Configura modal de avaliação
  configurarModal() {
    const btnAvaliar = document.getElementById('btnAvaliar');
    const modal = document.getElementById('modalAvaliacao');
    const btnFechar = document.getElementById('btnFecharModal');
    const btnCancelar = document.getElementById('btnCancelar');
    const btnEnviar = document.getElementById('btnEnviarAvaliacao');
    const btnAdicionarFoto = document.getElementById('btnAdicionarFoto');
    const inputFotos = document.getElementById('fotosAvaliacao');

    // Abrir modal com verificação de autenticação
    if (btnAvaliar) {
      btnAvaliar.addEventListener('click', async () => {
        try {
          let autenticado = false;
          if (typeof window.verificarAutenticacaoAntesDeAvaliar === 'function') {
            autenticado = await window.verificarAutenticacaoAntesDeAvaliar();
          } else {
            autenticado = await this.verificarAutenticacaoLocal();
          }
          if (!autenticado) return;
          this.abrirModal();
        } catch (_) {
          // Em caso de erro inesperado, evitar abrir modal
        }
      });
    }

    // Fechar modal
    [btnFechar, btnCancelar].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          this.fecharModal();
        });
      }
    });

    // Fechar modal clicando fora
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.fecharModal();
        }
      });
    }

    // Seleção de estrelas
    document.querySelectorAll('.estrelas-selecao i').forEach((estrela, index) => {
      estrela.addEventListener('click', (e) => {
        this.selecionarNota(index + 1);
      });

      estrela.addEventListener('mouseenter', (e) => {
        this.highlightEstrelas(index + 1);
      });
    });

    // Reset hover das estrelas
    const containerEstrelas = document.getElementById('estrelasSelecao');
    if (containerEstrelas) {
      containerEstrelas.addEventListener('mouseleave', () => {
        this.highlightEstrelas(this.notaSelecionadaModal);
      });
    }

    // Upload de fotos
    if (btnAdicionarFoto && inputFotos) {
      btnAdicionarFoto.addEventListener('click', () => {
        inputFotos.click();
      });

      inputFotos.addEventListener('change', (e) => {
        this.processarFotos(e.target.files);
      });
    }

    // Enviar avaliação
    if (btnEnviar) {
      btnEnviar.addEventListener('click', () => {
        this.enviarAvaliacao();
      });
    }
  }

  // Abre modal de avaliação
  abrirModal() {
    const modal = document.getElementById('modalAvaliacao');
    const imagemProdutoModal = document.getElementById('imagemProdutoModal');
    const nomeProdutoModal = document.getElementById('nomeProdutoModal');
    
    if (modal && this.produtoAtual) {
      // Preenche dados do produto no modal
      if (imagemProdutoModal) {
        const srcModal = (this.produtoAtual.imagem && this.ehURLImagem(this.produtoAtual.imagem)) 
          ? this.produtoAtual.imagem 
          : '/imagens/thumbs/produto1.webp';
        imagemProdutoModal.src = srcModal;
        imagemProdutoModal.onerror = function() {
          this.style.display = 'none';
        };
      }
      if (nomeProdutoModal) nomeProdutoModal.textContent = this.produtoAtual.titulo || '';
      
      modal.classList.add('ativo');
      document.body.style.overflow = 'hidden';
    }
  }

  // Verificação local de autenticação (fallback se função global não estiver disponível)
  async verificarAutenticacaoLocal() {
    try {
      const API_BASE = window.API_BASE || window.location.origin;
      const resp = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && (data.success || data.user)) return true;
      }
    } catch (_) {}
    try { window.sitePopup && window.sitePopup.alert('Faça login para avaliar produtos.', 'Autenticação necessária'); } catch {}
    setTimeout(() => { window.location.href = '/login'; }, 1200);
    return false;
  }

  // Fecha modal de avaliação
  fecharModal() {
    const modal = document.getElementById('modalAvaliacao');
    if (modal) {
      modal.classList.remove('ativo');
      document.body.style.overflow = 'auto';
      this.limparModalAvaliacao();
    }
  }

  // Limpa dados do modal
  limparModalAvaliacao() {
    this.notaSelecionadaModal = 0;
    this.fotosUpload = [];
    
    const tituloAvaliacao = document.getElementById('tituloAvaliacao');
    const comentarioAvaliacao = document.getElementById('comentarioAvaliacao');
    const previewFotos = document.getElementById('previewFotos');
    const notaSelecionada = document.getElementById('notaSelecionada');
    
    if (tituloAvaliacao) tituloAvaliacao.value = '';
    if (comentarioAvaliacao) comentarioAvaliacao.value = '';
    if (previewFotos) previewFotos.innerHTML = '';
    if (notaSelecionada) notaSelecionada.textContent = 'Selecione uma nota';
    
    this.highlightEstrelas(0);
  }

  // Seleciona nota no modal
  selecionarNota(nota) {
    this.notaSelecionadaModal = nota;
    this.highlightEstrelas(nota);
    
    const textos = ['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente'];
    const notaSelecionada = document.getElementById('notaSelecionada');
    if (notaSelecionada) {
      notaSelecionada.textContent = textos[nota] || 'Selecione uma nota';
    }
  }

  // Destaca estrelas no hover/seleção
  highlightEstrelas(nota) {
    document.querySelectorAll('.estrelas-selecao i').forEach((estrela, index) => {
      if (index < nota) {
        estrela.classList.add('ativa');
      } else {
        estrela.classList.remove('ativa');
      }
    });
  }

  // Processa fotos do upload
  processarFotos(arquivos) {
    Array.from(arquivos).forEach(arquivo => {
      if (arquivo.type.startsWith('image/') && this.fotosUpload.length < 5) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.fotosUpload.push({
            arquivo: arquivo,
            url: e.target.result
          });
          this.atualizarPreviewFotos();
        };
        reader.readAsDataURL(arquivo);
      }
    });
  }

  // Atualiza preview das fotos
  atualizarPreviewFotos() {
    const preview = document.getElementById('previewFotos');
    if (!preview) return;
    
    preview.innerHTML = this.fotosUpload.map((foto, index) => `
      <div class="preview-foto">
        <img src="${foto.url}" alt="Preview">
        <button type="button" class="btn-remover-foto" onclick="sistemaAvaliacoes.removerFoto(${index})">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `).join('');
  }

  // Remove foto do upload
  removerFoto(index) {
    this.fotosUpload.splice(index, 1);
    this.atualizarPreviewFotos();
  }

  // Envia avaliação
  enviarAvaliacao() {
    const tituloAvaliacao = document.getElementById('tituloAvaliacao');
    const comentarioAvaliacao = document.getElementById('comentarioAvaliacao');
    
    const titulo = tituloAvaliacao?.value.trim() || '';
    const comentario = comentarioAvaliacao?.value.trim() || '';
    
    if (this.notaSelecionadaModal === 0) {
      window.sitePopup && window.sitePopup.alert('Por favor, selecione uma nota para o produto.', 'Aviso', 'info');
      return;
    }
    
    if (!comentario) {
      window.sitePopup && window.sitePopup.alert('Por favor, escreva um comentário sobre o produto.', 'Aviso', 'info');
      return;
    }

    const payload = {
      produto_id: this.produtoAtual?.id,
      usuario_nome: 'Você',
      nota: this.notaSelecionadaModal,
      titulo: titulo || 'Minha avaliação',
      comentario,
      fotos: this.fotosUpload.map(f => f.url)
    };

    fetch(`${window.API_BASE || window.location.origin}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(json => {
      if (json.success && json.data) {
        // Insere no topo e atualiza UI
        this.avaliacoes.unshift({
          ...json.data,
          data: new Date(json.data.data)
        });
        this.atualizarResumoAvaliacoes();
        this.paginaAtual = 1;
        this.renderizarAvaliacoes();
        this.fecharModal();
        window.sitePopup && window.sitePopup.alert('Avaliação enviada com sucesso! Obrigado pelo seu feedback.', 'Sucesso');
      } else {
        throw new Error(json.message || 'Falha ao enviar avaliação');
      }
    })
    .catch(err => {
      console.error('Erro ao enviar avaliação:', err);
      window.sitePopup && window.sitePopup.alert('Erro ao enviar avaliação. Tente novamente.', 'Erro');
    });
  }

  // Configura botões do produto
  configurarBotoesProduto() {
    const btnComprar = document.querySelector('.btn-comprar-agora');
    const btnCarrinho = document.querySelector('.btn-carrinho');

    if (btnComprar) {
      btnComprar.addEventListener('click', () => {
        this.abrirMercadoLivre();
      });
    }

    if (btnCarrinho) {
      btnCarrinho.addEventListener('click', () => {
        this.abrirAmazon();
      });
    }
  }

  // Função para adicionar produto ao carrinho
  adicionarAoCarrinho(produtoId) {
    // Verificar se a função global do carrinho existe
    if (typeof adicionarAoCarrinho === 'function') {
      const sucesso = adicionarAoCarrinho(produtoId, 1);
      if (sucesso) {
        const produto = produtos.find(p => p.id === produtoId);
        if (produto) {
          window.sitePopup && window.sitePopup.alert(`${produto.titulo} adicionado ao carrinho!`, 'Sucesso');
        }
      }
    } else {
      // Fallback caso o sistema de carrinho não esteja carregado
      const produto = produtos?.find(p => p.id === produtoId);
      window.sitePopup && window.sitePopup.alert('Sistema de carrinho não disponível. Redirecionando...', 'Aviso');
      window.location.href = '/carrinho';
    }
  }

  // Função para adicionar produto ao carrinho (individual)
  adicionarAoCarrinhoIndividual(produtoId) {
    this.adicionarAoCarrinho(produtoId);
  }

  // Redireciona para Mercado Livre
  abrirMercadoLivre() {
    if (!this.produtoAtual) return;
    const id = this.produtoAtual.id;
    const titulo = this.produtoAtual.titulo || '';
    const linkDireto = this.produtoAtual.linkMercadoLivre || null;
    const linkMapeado = typeof window.obterLinkMercadoLivre === 'function' ? window.obterLinkMercadoLivre(id) : null;
    const validarUrl = (u, hosts) => {
      if (!u || typeof u !== 'string') return false;
      try {
        const v = new URL(u);
        return ['http:', 'https:'].includes(v.protocol) && hosts.some(h => v.hostname.includes(h));
      } catch (_) { return false; }
    };
    const canonicalizar = (u) => {
      try { const v = new URL(u); v.hash = ''; return v.toString(); } catch (_) { return null; }
    };
    let url = null;
    const candidatos = [linkDireto, linkMapeado];
    for (const c of candidatos) {
      if (validarUrl(c, ['mercadolivre.com'])) { url = canonicalizar(c); break; }
    }
    if (!url) {
      url = `https://www.mercadolivre.com.br/s?q=${encodeURIComponent(titulo)}`;
    }
    window.open(url, '_blank', 'noopener');
  }

  // Redireciona para Amazon
  abrirAmazon() {
    if (!this.produtoAtual) return;
    const id = this.produtoAtual.id;
    const titulo = this.produtoAtual.titulo || '';
    const linkDireto = this.produtoAtual.linkAmazon || null;
    const linkMapeado = typeof window.obterLinkAmazon === 'function' ? window.obterLinkAmazon(id) : null;
    const validarUrl = (u, hosts) => {
      if (!u || typeof u !== 'string') return false;
      try {
        const v = new URL(u);
        return ['http:', 'https:'].includes(v.protocol) && hosts.some(h => v.hostname.includes(h));
      } catch (_) { return false; }
    };
    const canonicalizar = (u) => {
      try { const v = new URL(u); v.hash = ''; return v.toString(); } catch (_) { return null; }
    };
    let url = null;
    const candidatos = [linkDireto, linkMapeado];
    for (const c of candidatos) {
      if (validarUrl(c, ['amazon.com', 'amazon.com.br'])) { url = canonicalizar(c); break; }
    }
    if (!url) {
      url = `https://www.amazon.com.br/s?k=${encodeURIComponent(titulo)}`;
    }
    window.open(url, '_blank', 'noopener');
  }

  // Formata data
  formatarData(data) {
    try {
      return new Date(data).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  }
}

// Funções globais
function navegarParaProduto(id) {
  window.location.href = `/pagina-produto?id=${id}`;
}





function abrirImagemModal(imagemUrl) {
  // Verificar se a URL é válida
  if (!imagemUrl || imagemUrl.trim() === '') {
    console.warn('URL da imagem não fornecida');
    return;
  }

  // Implementar modal para visualizar imagem em tamanho maior
  const modal = document.createElement('div');
  modal.className = 'modal-imagem';
  modal.innerHTML = `
    <div class="modal-imagem-conteudo">
      <img src="${imagemUrl}" alt="Imagem ampliada" onerror="this.alt='Erro ao carregar imagem'">
      <button class="btn-fechar-imagem" onclick="this.parentElement.parentElement.remove(); document.body.style.overflow='auto'">
        <i class="fa-solid fa-times"></i>
      </button>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.style.overflow = 'auto';
    }
  });
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}

// Funções globais para os botões da página de produto individual
function abrirMercadoLivre() {
  if (sistemaAvaliacoes) {
    sistemaAvaliacoes.abrirMercadoLivre();
  }
}

function abrirAmazon() {
  if (sistemaAvaliacoes) {
    sistemaAvaliacoes.abrirAmazon();
  }
}

// Inicialização
let sistemaAvaliacoes;

document.addEventListener('DOMContentLoaded', function() {
  try {
    sistemaAvaliacoes = new SistemaAvaliacoes();
  } catch (error) {
    console.error('Erro ao inicializar sistema de avaliações:', error);
    
    // Mostrar mensagem de erro para o usuário
    const container = document.querySelector('.container-produto') || document.body;
    const erroDiv = document.createElement('div');
    erroDiv.className = 'erro-sistema';
    erroDiv.innerHTML = `
      <div style="text-align: center; padding: 20px; background: #f8d7da; color: #721c24; border-radius: 8px; margin: 20px;">
        <h3>Erro ao carregar página do produto</h3>
        <p>Ocorreu um erro ao inicializar o sistema. Por favor, recarregue a página.</p>
        <button onclick="window.location.reload()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
          Recarregar Página
        </button>
      </div>
    `;
    container.appendChild(erroDiv);
  }
});

// CSS adicional para modal de imagem e correções
const estiloModalImagem = document.createElement('style');
estiloModalImagem.textContent = `
  .modal-imagem {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
    box-sizing: border-box;
  }
  
  .modal-imagem-conteudo {
    position: relative;
    max-width: 90%;
    max-height: 90%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-imagem-conteudo img {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }
  
  .btn-fechar-imagem {
    position: absolute;
    top: -15px;
    right: -15px;
    background: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    cursor: pointer;
    font-size: 16px;
    color: #333;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .btn-fechar-imagem:hover {
    background: #f0f0f0;
    transform: scale(1.1);
  }

  .erro-produto {
    text-align: center;
    padding: 40px 20px;
    background: #f8f9fa;
    border-radius: 8px;
    margin: 20px;
  }

  .erro-produto h2 {
    color: #dc3545;
    margin-bottom: 16px;
  }

  .erro-produto p {
    color: #6c757d;
    margin-bottom: 24px;
  }

  .btn-voltar {
    display: inline-block;
    background: #007bff;
    color: white;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 6px;
    transition: background 0.2s ease;
  }

  .btn-voltar:hover {
    background: #0056b3;
    text-decoration: none;
    color: white;
  }

  .estado-vazio {
    text-align: center;
    padding: 40px 20px;
    color: #6c757d;
  }

  .estado-vazio i {
    font-size: 48px;
    color: #dee2e6;
    margin-bottom: 16px;
  }

  .estado-vazio h3 {
    margin-bottom: 8px;
    color: #495057;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .modal-imagem {
      padding: 10px;
    }
    
    .modal-imagem-conteudo img {
      max-height: 70vh;
    }
    
    .btn-fechar-imagem {
      top: -10px;
      right: -10px;
      width: 35px;
      height: 35px;
      font-size: 14px;
    }
  }
`;

document.head.appendChild(estiloModalImagem);
