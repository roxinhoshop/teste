// ==================== PAINEL DE USUÁRIO MELHORADO ====================
document.addEventListener('DOMContentLoaded', function() {
  const API_BASE = window.API_BASE || window.location.origin;
  
  // ==================== CONFIGURAÇÕES GLOBAIS ====================
  const painelConfig = {
    usuario: {
      id: 1,
      nome: 'Gabriel',
      sobrenome: 'Wagner',
      email: 'gabriel@roxinho.com',
      avatar: null,
      nivel: 1,
      xp: 0,
      xpProximoNivel: 100
    },
    avatarPadrao: '/imagens/logos/avatar-roxo.svg'
  };
  
  // ==================== SISTEMA DE AVATAR ====================
  function inicializarSistemaAvatar() {
    const perfilSection = document.getElementById('profile');
    if (!perfilSection) return;
    
    // Criar seção de avatar se não existir
    let avatarSection = perfilSection.querySelector('.perfil-avatar');
    if (!avatarSection) {
      avatarSection = document.createElement('div');
      avatarSection.className = 'perfil-avatar';
      avatarSection.innerHTML = criarHTMLAvatar();
      perfilSection.insertBefore(avatarSection, perfilSection.firstChild);
    }
    
    configurarEventosAvatar();
    carregarAvatarSalvo();
  }
  
  function criarHTMLAvatar() {
    return `
      <div class="avatar-container">
        <div class="avatar-preview-container">
          <img id="avatar-preview" class="avatar-preview" src="${painelConfig.avatarPadrao}" alt="Avatar" style="display: none;">
          <div id="avatar-default" class="avatar-default">
            ${painelConfig.usuario.nome.charAt(0)}${painelConfig.usuario.sobrenome.charAt(0)}
          </div>
        </div>
        <div class="avatar-upload">
          <input type="file" id="avatar-input" accept="image/*">
          <button type="button" class="btn-upload-avatar" onclick="document.getElementById('avatar-input').click()">
            <i class="fas fa-camera"></i>
            Alterar Foto
          </button>
        </div>
      </div>
      <div class="avatar-info">
        <h3>Foto do Perfil</h3>
        <p>Personalize seu perfil com uma foto. Recomendamos uma imagem quadrada de pelo menos 200x200 pixels.</p>
        <div class="avatar-opcoes">
          <button type="button" class="btn-remover-avatar" id="btn-remover-avatar" style="display: none;">
            <i class="fas fa-trash"></i>
            Remover Foto
          </button>
        </div>
      </div>
    `;
  }
  
  function configurarEventosAvatar() {
    const avatarInput = document.getElementById('avatar-input');
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarDefault = document.getElementById('avatar-default');
    const btnRemover = document.getElementById('btn-remover-avatar');
    
    if (avatarInput) {
      avatarInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
          processarImagemAvatar(file);
        }
      });
    }
    
    if (btnRemover) {
      btnRemover.addEventListener('click', removerAvatar);
    }
  }
  
  function processarImagemAvatar(file) {
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      mostrarNotificacao('Por favor, selecione apenas arquivos de imagem.', 'erro');
      return;
    }
    
    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      mostrarNotificacao('A imagem deve ter no máximo 5MB.', 'erro');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const imageData = e.target.result;
      redimensionarImagem(imageData, (imagemRedimensionada) => {
        salvarAvatar(imagemRedimensionada);
        exibirAvatar(imagemRedimensionada);
        mostrarNotificacao('Avatar atualizado com sucesso!', 'sucesso');
      });
    };
    reader.readAsDataURL(file);
  }
  
  function redimensionarImagem(imageData, callback) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Definir tamanho do canvas (200x200)
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      
      // Calcular dimensões para crop centralizado
      const minDimension = Math.min(img.width, img.height);
      const sx = (img.width - minDimension) / 2;
      const sy = (img.height - minDimension) / 2;
      
      // Desenhar imagem redimensionada
      ctx.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, size, size);
      
      // Converter para base64
      const imagemRedimensionada = canvas.toDataURL('image/jpeg', 0.8);
      callback(imagemRedimensionada);
    };
    img.src = imageData;
  }
  
  function salvarAvatar(imageData) {
    localStorage.setItem('usuario_avatar', imageData);
    painelConfig.usuario.avatar = imageData;
  }
  
  function carregarAvatarSalvo() {
    const avatarSalvo = localStorage.getItem('usuario_avatar');
    if (avatarSalvo) {
      painelConfig.usuario.avatar = avatarSalvo;
      exibirAvatar(avatarSalvo);
    }
  }
  
  function exibirAvatar(imageData) {
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarDefault = document.getElementById('avatar-default');
    const btnRemover = document.getElementById('btn-remover-avatar');
    
    if (avatarPreview && avatarDefault) {
      avatarPreview.src = imageData;
      avatarPreview.style.display = 'block';
      avatarDefault.style.display = 'none';
      
      if (btnRemover) {
        btnRemover.style.display = 'block';
      }
    }
  }
  
  function removerAvatar() {
    localStorage.removeItem('usuario_avatar');
    painelConfig.usuario.avatar = null;
    
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarDefault = document.getElementById('avatar-default');
    const btnRemover = document.getElementById('btn-remover-avatar');
    
    if (avatarPreview && avatarDefault) {
      avatarPreview.style.display = 'none';
      avatarDefault.style.display = 'flex';
      
      if (btnRemover) {
        btnRemover.style.display = 'none';
      }
    }
    
    mostrarNotificacao('Avatar removido com sucesso!', 'sucesso');
  }
  
  // ==================== SISTEMA DE LISTA DE DESEJOS ====================
  function inicializarListaDesejos() {
    const wishlistSection = document.getElementById('wishlist');
    if (!wishlistSection) return;
    
    // Criar header da wishlist
    let wishlistHeader = wishlistSection.querySelector('.wishlist-header');
    if (!wishlistHeader) {
      wishlistHeader = document.createElement('div');
      wishlistHeader.className = 'wishlist-header';
      wishlistHeader.innerHTML = criarHTMLHeaderWishlist();
      wishlistSection.insertBefore(wishlistHeader, wishlistSection.firstChild);
    }
    
    carregarListaDesejos();
    configurarEventosWishlist();
  }
  
  function criarHTMLHeaderWishlist() {
    return `
      <div class="wishlist-stats">
        <div class="wishlist-count">
          <i class="fas fa-heart"></i>
          <span id="wishlist-count">0 itens</span>
        </div>
      </div>
      <div class="wishlist-actions">
        <button class="btn-limpar-desejos" id="btn-limpar-desejos">
          <i class="fas fa-trash"></i>
          Limpar Lista
        </button>
      </div>
    `;
  }
  
  function configurarEventosWishlist() {
    const btnLimpar = document.getElementById('btn-limpar-desejos');
    if (btnLimpar) {
      btnLimpar.addEventListener('click', limparListaDesejos);
    }
  }
  
  async function carregarListaDesejos() {
    const favoritosRaw = JSON.parse(localStorage.getItem('favoritos') || '[]');
    const gradeDesejos = document.getElementById('grade-desejos');
    if (!gradeDesejos) return;

    let produtosApi = [];
    try {
      const resp = await fetch(`${API_BASE}/api/products`);
      if (resp.ok) {
        const json = await resp.json();
        produtosApi = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      }
    } catch (_) {}

    const validIds = new Set(produtosApi.map(p => Number(p.id)));
    const favoritos = Array.isArray(favoritosRaw)
      ? favoritosRaw.filter(id => validIds.has(Number(id)))
      : [];
    // Persistir filtragem para manter localStorage consistente
    try { localStorage.setItem('favoritos', JSON.stringify(favoritos)); } catch (_) {}

    atualizarContadorWishlist(favoritos.length);

    if (favoritos.length === 0) {
      gradeDesejos.innerHTML = criarHTMLWishlistVazia();
      return;
    }

    // Montar produtos da lista de desejos a partir da API
    const produtosDesejos = favoritos
      .map(id => produtosApi.find(p => Number(p.id) === Number(id)))
      .filter(Boolean);

    gradeDesejos.innerHTML = produtosDesejos.map(produto => criarHTMLProdutoWishlist(produto)).join('');
  }
  
  function criarHTMLWishlistVazia() {
    return `
      <div class="wishlist-empty">
        <i class="fas fa-heart-broken"></i>
        <h3>Sua lista de desejos está vazia</h3>
        <p>Adicione produtos que você gostaria de comprar mais tarde</p>
    <a href="/produtos" class="btn-explorar-produtos">
          <i class="fas fa-search"></i>
          Explorar Produtos
        </a>
      </div>
    `;
  }
  
  function criarHTMLProdutoWishlist(produto) {
    return `
      <div class="produto-wishlist" data-produto-id="${produto.id}">
        <div class="imagem-produto">
                ${produto.imagem && (produto.imagem.startsWith('http') || produto.imagem.startsWith('./') || produto.imagem.startsWith('/') || produto.imagem.toLowerCase().startsWith('imagens/')) ?
                `<img src="${produto.imagem}" alt="${produto.titulo || produto.nome}">` :
                `<div class="fundo-gradiente ${produto.imagemFallback || 'gradiente-roxo'}"></div>`
                }
          <button class="btn-remover-wishlist" onclick="removerDaWishlist(${produto.id})">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="conteudo-produto">
          <div class="marca-produto">${produto.marca || ''}</div>
          <h3 class="nome-produto">${produto.titulo || produto.nome || ''}</h3>
          <div class="preco-produto">
            <div class="precos-plataformas">
              <div class="preco-ml"><i class="fa-solid fa-store" aria-label="Mercado Livre"></i> <span class="preco-ml-badge">R$ ${(produto.precoMercadoLivre ?? 0).toFixed(2).replace('.', ',')}</span></div>
        <div class="preco-amazon"><span><img src="${(typeof window !== 'undefined' && typeof window.getAmazonIconByTheme === 'function') ? window.getAmazonIconByTheme() : '/imagens/logos/amazon-icon.png'}" class="icone-plataforma" data-store="amazon" alt="Amazon" /> R$ ${(produto.precoAmazon ?? 0).toFixed(2).replace('.', ',')}</span></div>
              ${(() => {
                const ml = Number((produto.precoMercadoLivre ?? 0));
                const amz = Number((produto.precoAmazon ?? 0));
                if (ml > 0 && amz > 0 && Math.abs(ml - amz) < 0.005) {
                  return `<div class='precos-iguais' style='font-size:12px;color:#4b5563;margin-top:4px;'>Preços iguais</div>`;
                }
                return '';
              })()}
            </div>
          </div>
          <div class="acoes-produto">
            <button class="btn-comprar-wishlist" onclick="comprarDireto(${produto.id})">
              <i class="fas fa-bolt"></i>
              Comprar
            </button>
            <button class="btn-carrinho-wishlist" onclick="adicionarAoCarrinho(${produto.id})">
              <i class="fas fa-cart-plus"></i>
              Carrinho
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  function atualizarContadorWishlist(count) {
    const contador = document.getElementById('wishlist-count');
    if (contador) {
      contador.textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
    }
  }
  
  function limparListaDesejos() {
    const executarLimpeza = () => {
      localStorage.removeItem('favoritos');
      carregarListaDesejos();
      if (typeof mostrarNotificacao === 'function') {
        mostrarNotificacao('Lista de desejos limpa com sucesso!', 'sucesso');
      } else if (window.sitePopup && typeof window.sitePopup.alert === 'function') {
        window.sitePopup.alert('Lista de desejos limpa com sucesso!', 'Sucesso');
      }
    };

    if (window.sitePopup && typeof window.sitePopup.confirm === 'function') {
      window.sitePopup.confirm('Tem certeza que deseja limpar toda a lista de desejos?', 'Confirmar').then(sim => { if (sim) executarLimpeza(); });
    } else {
      console.warn('sitePopup indisponível para confirmação da limpeza da wishlist. Ação cancelada.');
    }
  }
  
  window.removerDaWishlist = function(produtoId) {
    let favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
    favoritos = favoritos.filter(id => id !== produtoId);
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
    carregarListaDesejos();
    mostrarNotificacao('Produto removido da lista de desejos!', 'sucesso');
  };
  
  // ==================== DASHBOARD PREPARADO PARA BD ====================
  function inicializarDashboard() {
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;
    
    // Adicionar header do dashboard
    let dashboardHeader = dashboardSection.querySelector('.dashboard-header');
    if (!dashboardHeader) {
      dashboardHeader = document.createElement('div');
      dashboardHeader.className = 'dashboard-header';
      dashboardHeader.innerHTML = criarHTMLHeaderDashboard();
      dashboardSection.insertBefore(dashboardHeader, dashboardSection.firstChild);
    }
    
    carregarDadosDashboard();
    configurarAtualizacaoAutomatica();
  }
  
  function criarHTMLHeaderDashboard() {
    const agora = new Date();
    const saudacao = obterSaudacao(agora.getHours());
    
    return `
      <h2>${saudacao}, ${painelConfig.usuario.nome}!</h2>
      <p>Bem-vindo de volta ao seu painel de controle</p>
    `;
  }
  
  function obterSaudacao(hora) {
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }
  
  function carregarDadosDashboard() {
    // Simular dados do banco de dados
    const dadosDashboard = obterDadosDashboard();
    
    atualizarEstatisticas(dadosDashboard.estatisticas);
    /* XP removido: atualizarSistemaXP(dadosDashboard.xp); */
    carregarPedidosRecentes(dadosDashboard.pedidos);
  }
  
  function obterDadosDashboard() {
    // Esta função seria substituída por uma chamada real ao banco de dados
    return {
      estatisticas: {
        totalPedidos: parseInt(localStorage.getItem('total_pedidos') || '0'),
        totalGasto: parseFloat(localStorage.getItem('total_gasto') || '0'),
        nivel: parseInt(localStorage.getItem('usuario_nivel') || '1'),
        xpTotal: parseInt(localStorage.getItem('usuario_xp') || '0')
      },
      xp: {
        atual: parseInt(localStorage.getItem('usuario_xp') || '0'),
        nivel: parseInt(localStorage.getItem('usuario_nivel') || '1'),
        proximoNivel: calcularXPProximoNivel(parseInt(localStorage.getItem('usuario_nivel') || '1')),
        atividades: JSON.parse(localStorage.getItem('atividades_xp') || '[]')
      },
      pedidos: JSON.parse(localStorage.getItem('pedidos_recentes') || '[]')
    };
  }
  
  function calcularXPProximoNivel(nivel) {
    return nivel * 100; // Fórmula simples: cada nível requer 100 XP a mais
  }
  
  function atualizarEstatisticas(stats) {
    // Atualizar cards de estatísticas
    const elementos = {
      totalPedidos: document.querySelector('.stat-card:nth-child(1) .stat-value'),
      totalGasto: document.querySelector('.stat-card:nth-child(2) .stat-value'),
      nivel: document.querySelector('.stat-card:nth-child(3) .stat-value'),
      xpTotal: document.querySelector('.stat-card:nth-child(4) .stat-value')
    };
    
    if (elementos.totalPedidos) {
      elementos.totalPedidos.textContent = stats.totalPedidos;
    }
    
    if (elementos.totalGasto) {
      elementos.totalGasto.textContent = `R$ ${stats.totalGasto.toFixed(2).replace('.', ',')}`;
    }
    
    if (elementos.nivel) {
      elementos.nivel.textContent = stats.nivel;
    }
    
    if (elementos.xpTotal) {
      elementos.xpTotal.textContent = stats.xpTotal;
    }
  }
  
  function obterTituloNivel(nivel) {
    const titulos = {
      1: 'Novato',
      2: 'Explorador',
      3: 'Comprador',
      4: 'Entusiasta',
      5: 'Expert',
      6: 'Mestre',
      7: 'Lenda'
    };
    return titulos[nivel] || 'Lenda Suprema';
  }
  
  function criarHTMLAtividade(atividade) {
    return `
      <div class="atividade-xp">
        <i class="fas fa-${atividade.icone || 'star'}"></i>
        <div class="atividade-info">
          <div class="atividade-descricao">${atividade.descricao}</div>
          <div class="atividade-data">${formatarData(atividade.data)}</div>
        </div>
        <div class="atividade-xp-valor">+${atividade.xp} XP</div>
      </div>
    `;
  }
  
  function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function configurarAtualizacaoAutomatica() {
    // Atualizar dashboard a cada 5 minutos
    setInterval(carregarDadosDashboard, 5 * 60 * 1000);
  }
  
  // ==================== SISTEMA DE NOTIFICAÇÕES ====================
  function mostrarNotificacao(mensagem, tipo = 'info') {
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao-painel notificacao-${tipo}`;
    notificacao.innerHTML = `
      <div class="notificacao-conteudo">
        <i class="fas fa-${tipo === 'sucesso' ? 'check-circle' : tipo === 'erro' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${mensagem}</span>
      </div>
      <button class="fechar-notificacao" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    document.body.appendChild(notificacao);
    
    // Animar entrada
    setTimeout(() => {
      notificacao.classList.add('mostrar');
    }, 100);
    
    // Auto-remover após 4 segundos
    setTimeout(() => {
      if (notificacao.parentElement) {
        notificacao.classList.remove('mostrar');
        setTimeout(() => {
          if (notificacao.parentElement) {
            notificacao.remove();
          }
        }, 300);
      }
    }, 4000);
  }
  
  // ==================== FUNÇÕES UTILITÁRIAS ====================
  function adicionarXP() {
    // XP removido: função neutralizada
    return;
  }

  function verificarSubidaNivel() {
    // XP removido: função neutralizada
    return;
  }

  // ==================== INTEGRAÇÃO COM CARRINHO ====================
  window.adicionarAoCarrinho = function(produtoId) {
    // Lógica existente do carrinho
    if (typeof adicionarProdutoAoCarrinho === 'function') {
      adicionarProdutoAoCarrinho(produtoId);
    }
    
    // Adicionar XP
    adicionarXP(5, 'Produto adicionado ao carrinho', 'cart-plus');
  };
  
  window.comprarDireto = function(produtoId) {
    // Lógica existente de compra direta
    if (typeof comprarDireto === 'function') {
      comprarDireto(produtoId);
    }
    
    // Adicionar XP
    adicionarXP(20, 'Compra realizada', 'shopping-bag');
  };
  
  // ==================== INICIALIZAÇÃO ====================
  function inicializar() {
    inicializarSistemaAvatar();
    inicializarListaDesejos();
    inicializarDashboard();
    
    console.log('Painel de usuário melhorado inicializado!');
  }
  
  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }
});

// ==================== ESTILOS CSS PARA NOTIFICAÇÕES ====================
const estilosNotificacoesPainel = `
<style>
.notificacao-painel {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 1rem 1.5rem;
  z-index: 10000;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  max-width: 350px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.notificacao-painel.mostrar {
  transform: translateX(0);
}

.notificacao-conteudo {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex: 1;
}

.notificacao-sucesso {
  border-left: 4px solid #10b981;
}

.notificacao-erro {
  border-left: 4px solid #ef4444;
}

.notificacao-info {
  border-left: 4px solid #3b82f6;
}

.notificacao-sucesso i {
  color: #10b981;
}

.notificacao-erro i {
  color: #ef4444;
}

.notificacao-info i {
  color: #3b82f6;
}

.fechar-notificacao {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  transition: color 0.2s ease;
}

.fechar-notificacao:hover {
  color: #6b7280;
}
</style>
`;

// Adicionar estilos ao head
document.head.insertAdjacentHTML('beforeend', estilosNotificacoesPainel);

// ==================== NAVEGAÇÃO DA BARRA LATERAL ====================
// Código para corrigir o problema da barra lateral não funcionar

document.addEventListener('DOMContentLoaded', function() {
    
    // ==================== SISTEMA DE NAVEGAÇÃO ====================
    function inicializarNavegacaoSidebar() {
        const linksNavegacao = document.querySelectorAll('.link-navegacao[data-section]');
        const secoes = document.querySelectorAll('.secao-conteudo');
        
        // Adicionar event listeners aos links da barra lateral
        linksNavegacao.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const secaoAlvo = this.getAttribute('data-section');
                
                // Remover classe active de todos os links
                linksNavegacao.forEach(l => l.classList.remove('active'));
                
                // Adicionar classe active ao link clicado
                this.classList.add('active');
                
                // Ocultar todas as seções
                secoes.forEach(secao => secao.classList.remove('active'));
                
                // Mostrar a seção correspondente
                const secaoElemento = document.getElementById(secaoAlvo);
                if (secaoElemento) {
                    secaoElemento.classList.add('active');
                }
                
                // Atualizar breadcrumb
                atualizarBreadcrumb(secaoAlvo);
                
                // Atualizar título da seção
                atualizarTituloSecao(secaoAlvo);
            });
        });
        
        console.log('Sistema de navegação da barra lateral inicializado!');
    }
    
    // ==================== ATUALIZAR BREADCRUMB ====================
    function atualizarBreadcrumb(secaoAtiva) {
        const breadcrumbAtual = document.getElementById('breadcrumb-atual');
        
        const nomesSeccoes = {
            'dashboard': 'Dashboard',
            'orders': 'Meus Pedidos',
            'profile': 'Perfil',
            'wishlist': 'Lista de Desejos',
            'addresses': 'Endereços',
            'settings': 'Configurações'
        };
        
        if (breadcrumbAtual && nomesSeccoes[secaoAtiva]) {
            breadcrumbAtual.textContent = nomesSeccoes[secaoAtiva];
        }
    }
    
    // ==================== ATUALIZAR TÍTULO DA SEÇÃO ====================
    function atualizarTituloSecao(secaoAtiva) {
        const tituloSecao = document.getElementById('titulo-secao');
        
        const titulosSeccoes = {
            'dashboard': 'Dashboard',
            'orders': 'Meus Pedidos',
            'profile': 'Meu Perfil',
            'wishlist': 'Lista de Desejos',
            'addresses': 'Meus Endereços',
            'settings': 'Configurações'
        };
        
        if (tituloSecao && titulosSeccoes[secaoAtiva]) {
            tituloSecao.textContent = titulosSeccoes[secaoAtiva];
        }
    }
    
    // ==================== INICIALIZAÇÃO ====================
    // Inicializar a navegação da barra lateral
    inicializarNavegacaoSidebar();
    
    // Definir seção ativa por padrão com base na página atual
const isSettingsPage = /configuracoes(\.html)?$/i.test(window.location.pathname);
    const defaultSection = isSettingsPage ? 'settings' : 'dashboard';
    const defaultLinkEl = document.querySelector(`.link-navegacao[data-section="${defaultSection}"]`);
    const defaultSectionEl = document.getElementById(defaultSection);
    
    if (defaultLinkEl && defaultSectionEl) {
        // Remover active de todos os links e seções
        document.querySelectorAll('.link-navegacao').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.secao-conteudo').forEach(s => s.classList.remove('active'));
        
        // Ativar seção padrão
        defaultLinkEl.classList.add('active');
        defaultSectionEl.classList.add('active');
        
        // Atualizar breadcrumb e título
        atualizarBreadcrumb(defaultSection);
        atualizarTituloSecao(defaultSection);
    }
});

// ==================== ESTILOS CSS ADICIONAIS ====================
// Adicionar estilos para garantir que a navegação funcione corretamente
const estilosNavegacao = `
<style>
/* Garantir que apenas a seção ativa seja visível */
.secao-conteudo {
    display: none;
}

.secao-conteudo.active {
    display: block;
}

/* Melhorar o visual dos links ativos */
.link-navegacao.active {
    background-color: #f1f5f9;
    color: #000000;
    font-weight: 600;
    border-left: 3px solid #833dd0;
}

.link-navegacao.active i {
    color: #833dd0;
}

/* Transições suaves */
.link-navegacao {
    transition: all 0.3s ease;
}

.link-navegacao:hover {
    background-color: #f8fafc;
    transform: translateX(5px);
}

/* Breadcrumb ativo */
.item-caminho.ativo {
    color: #000000; /* Preto */
    font-weight: 700; /* Negrito */
}

/* ===== Dark mode overrides ===== */
html.dark .link-navegacao.active {
    background-color: #1E1E1E;
    color: #FFFFFF;
    border-left-color: #833dd0;
}
html.dark .item-caminho.ativo { color: #FFFFFF; }

/* Notificações no painel em dark mode */
html.dark .notificacao-painel {
  background: #1E1E1E;
  color: #FFFFFF;
  box-shadow: 0 4px 20px rgba(0,0,0,0.45);
}
</style>
`;

// Adicionar estilos ao head
document.head.insertAdjacentHTML('beforeend', estilosNavegacao);


function carregarPedidosRecentes(pedidos = []) {
  const tbody = document.querySelector('.tabela-pedidos tbody');
  if (!tbody) return;
  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    // Keep existing static rows or clear if needed
    return;
  }
  tbody.innerHTML = pedidos.map((p) => {
    const numero = p.numero || p.id || '-';
    const data = p.data || p.data_pedido || '';
    const status = p.status || 'Pendente';
    const total = typeof p.total === 'number' ? `R$ ${p.total.toFixed(2).replace('.', ',')}` : (p.total || 'R$ -');
    return `
      <tr>
        <td>${numero}</td>
        <td>${data}</td>
        <td><span class="badge">${status}</span></td>
        <td>${total}</td>
        <td><button class="botao-secundario botao-pequeno">Ver Detalhes</button></td>
      </tr>
    `;
  }).join('');
}
