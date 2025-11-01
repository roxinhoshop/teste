// ======================= CABEÇALHO MELHORADO ======================= 
// Desenvolvido por Gabriel (gabwvr)

// Executa mesmo se o script for injetado após DOMContentLoaded
(function() {
  // ===== Aplicar tema escuro salvo (fallback global) =====
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      document.body && document.body.classList && document.body.classList.add('dark');
    }
  } catch (_) {}

  // ===== Suporte global ao toggle de tema (quando scripts do cabeçalho não são injetados) =====
  function aplicarTemaInterno(tema) {
    const isDark = tema === 'dark';
    const root = document.documentElement;
    const body = document.body;
    try {
      root.classList.toggle('dark', isDark);
      if (body && body.classList) body.classList.toggle('dark', isDark);
    } catch (_) {}
    // Atualizar ícone/aria do botão se existir
    try {
      const btn = document.getElementById('btnDarkMode');
      if (btn) {
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        const icone = btn.querySelector('i');
        if (icone) {
          icone.classList.toggle('fa-sun', isDark);
          icone.classList.toggle('fa-moon', !isDark);
        }
      }
    } catch (_) {}
    try { localStorage.setItem('theme', tema); } catch (_) {}
    // Disparar evento global para que UI reaja (ícones, gráficos, etc.)
    try {
      const ev = new CustomEvent('themechange', { detail: { theme: tema } });
      document.dispatchEvent(ev);
    } catch (_) {}
  }

  function carregarTemaInterno() {
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (_) {}
    aplicarTemaInterno(saved === 'dark' ? 'dark' : 'light');
  }

  function configurarToggleTemaSeNecessario() {
    // Se o script do cabeçalho já definiu funções globais, não duplicar
    if (typeof window.aplicarTema === 'function' || typeof window.carregarTemaPreferido === 'function') {
      return;
    }
    const btn = document.getElementById('btnDarkMode');
    if (!btn || btn.dataset.darkInit === '1') return;
    btn.dataset.darkInit = '1';
    try {
      btn.addEventListener('click', function() {
        const atual = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        aplicarTemaInterno(atual === 'dark' ? 'light' : 'dark');
      });
      // Garantir estado inicial coerente
      carregarTemaInterno();
    } catch (_) {}
  }
  
  // ===== Garantir carregamento do Chatbot globalmente =====
  function ensureChatbotLoaded() {
    try {
      if (document.querySelector('.chatbot-fab')) return;
      if (!document.querySelector('link[href*="/css/chatbot.css"]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = '/css/chatbot.css';
        document.head.appendChild(l);
      }
      if (window.__CHATBOT_LOADING) return;
      window.__CHATBOT_LOADING = true;
      const s = document.createElement('script');
      s.src = '/js/chatbot.js';
      s.defer = true;
      s.onload = () => { window.__CHATBOT_LOADING = false; };
      s.onerror = () => { window.__CHATBOT_LOADING = false; };
      document.body.appendChild(s);
    } catch (_) {}
  }
  
  // ==================== CORREÇÃO DOS DEPARTAMENTOS ====================
  function corrigirDepartamentos() {
    const dropdownPrincipal = document.querySelector('.barra-categorias li.mega-dropdown') || document.querySelector('.barra-categorias li.dropdown');
    // Seleciona de forma robusta o link principal (evita problemas com :scope)
    let linkDepartamentos = dropdownPrincipal ? dropdownPrincipal.querySelector('a') : null;
    if (!linkDepartamentos) {
      // Fallback para seleção direta por combinador de filho
      linkDepartamentos = document.querySelector('.barra-categorias li.mega-dropdown > a') || document.querySelector('.barra-categorias li.dropdown > a');
    }
    const megaMenu = dropdownPrincipal ? dropdownPrincipal.querySelector('.mega-menu') : null;

    if (dropdownPrincipal && linkDepartamentos && megaMenu && !dropdownPrincipal.dataset.departamentosInit) {
      // Evita múltiplos handlers quando o cabeçalho é reinserido dinamicamente
      dropdownPrincipal.dataset.departamentosInit = '1';
      let timeoutId = null;

      // ARIA: preparar atributos de acessibilidade no trigger e no painel
      try {
        linkDepartamentos.setAttribute('aria-haspopup', 'true');
        linkDepartamentos.setAttribute('aria-expanded', 'false');
        if (!megaMenu.id) {
          megaMenu.id = 'megaMenuDepartamentos';
        }
        linkDepartamentos.setAttribute('aria-controls', megaMenu.id);
        megaMenu.setAttribute('aria-hidden', 'true');
      } catch (_) {}

      // Garante que o mega-menu não saia da página (viewport clamp)
      function clampMegaMenuToViewport() {
        try {
          requestAnimationFrame(() => {
            const rect = megaMenu.getBoundingClientRect();
            const padding = 8; // margem interna da viewport
            let shiftX = 0;
            if (rect.left < padding) {
              shiftX = padding - rect.left;
            } else if (rect.right > window.innerWidth - padding) {
              shiftX = (window.innerWidth - padding) - rect.right;
            }
            if (shiftX !== 0) {
              megaMenu.style.transform = `translateY(0) translateX(${shiftX}px)`;
            } else {
              megaMenu.style.transform = 'translateY(0)';
            }
          });
        } catch (_) {}
      }

      function focusPrimeiroItemMegaMenu() {
        try {
          const primeiroFoco = megaMenu.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
          if (primeiroFoco && typeof primeiroFoco.focus === 'function') {
            primeiroFoco.focus({ preventScroll: true });
          }
        } catch (_) {}
      }

      function abrirMegaMenu() {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        dropdownPrincipal.classList.add('open');
        try {
          linkDepartamentos.setAttribute('aria-expanded', 'true');
          megaMenu.setAttribute('aria-hidden', 'false');
        } catch (_) {}
        clampMegaMenuToViewport();
        // Inicializar comportamento de categorias com toggle (uma vez)
        try {
          if (!megaMenu.dataset.toggleInit) {
            inicializarToggleMegaCategorias();
            megaMenu.dataset.toggleInit = '1';
          }
          // Focar no primeiro elemento interativo do mega-menu
          focusPrimeiroItemMegaMenu();
          // Mobile: manter todas as categorias fechadas inicialmente
          // (removida expansão automática da primeira categoria)
        } catch (_) {}
      }

      function fecharMegaMenuComDelay() {
        timeoutId = setTimeout(() => {
          dropdownPrincipal.classList.remove('open');
          // Resetar transform aplicado dinamicamente
          try { megaMenu.style.transform = ''; } catch (_) {}
          try {
            linkDepartamentos.setAttribute('aria-expanded', 'false');
            megaMenu.setAttribute('aria-hidden', 'true');
          } catch (_) {}
        }, 150);
      }

      // Garantir inicialização do toggle mesmo antes de abrir (corrige dispositivos que não disparam a abertura inicialmente)
      try {
        if (megaMenu && !megaMenu.dataset.toggleInit) {
          inicializarToggleMegaCategorias();
          megaMenu.dataset.toggleInit = '1';
        }
      } catch (_) {}

      // Abrir/fechar por clique no mobile e suporte a hover no desktop

      // Click: toggle e fechar outros
      linkDepartamentos.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = dropdownPrincipal.classList.contains('open');

        document.querySelectorAll('.barra-categorias li.mega-dropdown, .barra-categorias li.dropdown').forEach(item => {
          if (item !== dropdownPrincipal) {
            item.classList.remove('open');
          }
        });

        if (isOpen) {
          dropdownPrincipal.classList.remove('open');
          try { megaMenu.style.transform = ''; } catch (_) {}
        } else {
          abrirMegaMenu();
        }
      });

      // Removido suporte por hover no desktop: abrir/fechar apenas por clique para consistência

      // Reposicionar/clamp ao redimensionar ou mudar orientação
      try {
        ['resize', 'orientationchange'].forEach(evt => {
          window.addEventListener(evt, () => {
            if (dropdownPrincipal.classList.contains('open')) {
              clampMegaMenuToViewport();
              // Garantir visibilidade das subcategorias já expandidas após redimensionamento
              try {
                megaMenu.querySelectorAll('.categoria-coluna.expandida .subcategorias-grid').forEach(grid => {
                  grid.style.display = 'block';
                  grid.style.opacity = '1';
                  grid.style.maxHeight = 'none';
                });
              } catch (_) {}
            }
          });
        });
      } catch (_) {}

      // Acessibilidade: abrir com Enter/Espaço
      linkDepartamentos.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          linkDepartamentos.click();
        }
      });

      // Inicializa colapso/toggle das subcategorias no mega-menu
          function inicializarToggleMegaCategorias() {
            const colunas = megaMenu.querySelectorAll('.categoria-coluna');
            colunas.forEach(coluna => {
              const header = coluna.querySelector('h4');
              const grid = coluna.querySelector('.subcategorias-grid');
              if (!header || !grid) return;

          // Adiciona ícone de seta, se não existir
          if (!header.querySelector('.toggle-icon')) {
            const toggleIcon = document.createElement('i');
            toggleIcon.className = 'fa-solid fa-chevron-down toggle-icon';
            header.appendChild(toggleIcon);
          }

          // Acessibilidade
          header.setAttribute('role', 'button');
          header.setAttribute('tabindex', '0');
          header.setAttribute('aria-expanded', 'false');

          // Estado inicial: oculto
          coluna.classList.remove('expandida');
          try {
            grid.style.maxHeight = '0px';
            grid.style.opacity = '0';
            grid.style.overflow = 'hidden';
            grid.style.transition = 'max-height 300ms ease, opacity 300ms ease';
          } catch (_) {}

          const toggleGrid = () => {
            const expandindo = !coluna.classList.contains('expandida');

            // Accordion: fechar outras categorias ao expandir esta
            if (expandindo) {
              colunas.forEach(outra => {
                if (outra !== coluna) {
                  outra.classList.remove('expandida');
                  const h = outra.querySelector('h4');
                  const g = outra.querySelector('.subcategorias-grid');
                  if (h) h.setAttribute('aria-expanded', 'false');
                  if (g) {
                    try {
                      if (getComputedStyle(g).maxHeight === 'none') {
                        g.style.maxHeight = g.scrollHeight + 'px';
                      }
                      g.style.maxHeight = '0px';
                      g.style.opacity = '0';
                    } catch (_) {}
                  }
                }
              });
            }

            coluna.classList.toggle('expandida');
            header.setAttribute('aria-expanded', expandindo ? 'true' : 'false');
            try {
              if (expandindo) {
                // Expande suavemente e garante ver todas as subcategorias
                grid.style.display = 'block';
                const fullHeight = grid.scrollHeight;
                grid.style.maxHeight = fullHeight + 'px';
                grid.style.opacity = '1';
                setTimeout(() => {
                  // Remover limite para acomodar mudanças dinâmicas sem truncar
                  grid.style.maxHeight = 'none';
                }, 310);
              } else {
                // Se estava sem limite, define a altura atual para animar recolhimento
                if (getComputedStyle(grid).maxHeight === 'none') {
                  grid.style.maxHeight = grid.scrollHeight + 'px';
                  // Forçar reflow antes de colapsar
                  void grid.offsetHeight;
                }
                grid.style.maxHeight = '0px';
                grid.style.opacity = '0';
              }
            } catch (_) {}
          };

          header.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleGrid();
          });
          // Suporte a dispositivos móveis: alternar também ao finalizar o toque
          header.addEventListener('touchend', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleGrid();
          }, { passive: false });
          header.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              toggleGrid();
            }
          });
        });
      }
    }
  }
  
  // ==================== CORREÇÃO DOS LINKS DE CATEGORIAS ====================
  function corrigirLinksCategoria() {
    // Reescrever globalmente quaisquer âncoras com "/produtos" ou "produtos" para rotas limpas (sem .html)
    document.querySelectorAll('a[href^="/produtos"]').forEach(a => {
      const hrefAtual = a.getAttribute('href') || '';
      const novo = hrefAtual
        .replace(/^\/produtos\?/, '/produtos?')
        .replace(/^\/produtos$/i, '/produtos');
      a.setAttribute('href', novo);
    });
    document.querySelectorAll('a[href^="produtos"]').forEach(a => {
      const hrefAtual = a.getAttribute('href') || '';
      if (/^produtos(\?|$)/i.test(hrefAtual)) {
        const novo = hrefAtual
          .replace(/^produtos\?/, 'produtos?')
          .replace(/^produtos$/i, 'produtos');
        a.setAttribute('href', novo);
      }
    });
    // Reescrever rotas antigas "/produtos" para "produtos.html" nas categorias e submenus
    document.querySelectorAll('.barra-categorias a[href*="/produtos"]').forEach(a => {
      const hrefAtual = a.getAttribute('href') || '';
      if (/^\/produtos(\?|$)/i.test(hrefAtual)) {
        const novo = hrefAtual
          .replace(/^\/produtos\?/, '/produtos?')
          .replace(/^\/produtos$/i, '/produtos');
        a.setAttribute('href', novo);
      }
    });
    // Corrigir todos os links de categoria
    const linksCategoria = document.querySelectorAll('.barra-categorias .submenu a');
    
    linksCategoria.forEach(link => {
      // Verificar se o link tem href válido
      const href = link.getAttribute('href');
      
      if (href && href !== '#' && href !== '') {
        // Link válido - garantir que funcione
        link.addEventListener('click', function(e) {
          // Permitir navegação normal sem logs
        });
      } else {
        // Link inválido - corrigir
        const textoLink = link.textContent.trim();
        const novoHref = `produtos?categoria=${encodeURIComponent(textoLink)}`;
        link.setAttribute('href', novoHref);
      }
    });
    
    // Corrigir links principais de categoria
    const linksPrincipais = document.querySelectorAll('.barra-categorias > ul > li > a');
    
    linksPrincipais.forEach(link => {
      const href = link.getAttribute('href');
      
      if (href && href !== '#' && !/produtos(\.html)?(\?|$)/i.test(href)) {
        const textoLink = link.textContent.trim().replace(/\s+/g, ' ');
        const novoHref = `produtos?categoria=${encodeURIComponent(textoLink)}`;
        link.setAttribute('href', novoHref);
      }
    });
  }
  
  // ==================== MELHORIAS DOS SUBMENUS ====================
  function melhorarSubmenus() {
    const itensComSubmenu = document.querySelectorAll('.barra-categorias .tem-submenu');
    
    itensComSubmenu.forEach(item => {
      const linkPrincipal = item.querySelector('a');
      const submenu = item.querySelector('.submenu');
      
      if (linkPrincipal && submenu) {
        let timeoutSubmenu = null;
        
        // Função para mostrar submenu
        function mostrarSubmenuItem() {
          if (timeoutSubmenu) {
            clearTimeout(timeoutSubmenu);
            timeoutSubmenu = null;
          }
          
          // Fechar outros submenus no mesmo nível
          const irmãos = item.parentElement.querySelectorAll('.tem-submenu');
          irmãos.forEach(irmão => {
            if (irmão !== item) {
              irmão.classList.remove('active');
            }
          });
          
          item.classList.add('active');
        }
        
        // Função para esconder submenu com delay
        function esconderSubmenuItem() {
          timeoutSubmenu = setTimeout(() => {
            item.classList.remove('active');
          }, 150);
        }
        
        // Mostrar/esconder submenu apenas por clique
        
        // Clique no mobile
        linkPrincipal.addEventListener('click', function(e) {
          const temSubmenuFilho = submenu && submenu.children.length > 0;
          
          if (temSubmenuFilho) {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle do submenu
            item.classList.toggle('active');
          }
          // Se não tem submenu, permite navegação normal
        });
      }
    });
  }
  
  // ==================== FECHAR MENUS AO CLICAR FORA ====================
  function adicionarEventoFecharMenus() {
    document.addEventListener('click', function(e) {
      // Verificar se o clique foi fora da barra de categorias
      if (!e.target.closest('.barra-categorias')) {
        // Fechar todos os dropdowns
        document.querySelectorAll('.barra-categorias li.mega-dropdown, .barra-categorias li.dropdown').forEach(dropdown => {
          dropdown.classList.remove('open');
          // Atualizar ARIA ao fechar
          try {
            const trigger = dropdown.querySelector('> a');
            const panel = dropdown.querySelector('.mega-menu');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
            if (panel) panel.setAttribute('aria-hidden', 'true');
          } catch (_) {}
        });
        // Fechar submenus antigos, se existirem
        document.querySelectorAll('.barra-categorias .tem-submenu').forEach(submenu => {
          submenu.classList.remove('active');
        });
      }
    });

    // Fechar menu ao pressionar ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        // Fechar todos os dropdowns
        document.querySelectorAll('.barra-categorias li.mega-dropdown, .barra-categorias li.dropdown').forEach(dropdown => {
          const estavaAberto = dropdown.classList.contains('open');
          dropdown.classList.remove('open');
          // Atualizar ARIA ao fechar
          try {
            const trigger = dropdown.querySelector('> a');
            const panel = dropdown.querySelector('.mega-menu');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
            if (panel) panel.setAttribute('aria-hidden', 'true');
            // Retornar foco ao trigger se estava aberto
            if (estavaAberto && trigger && typeof trigger.focus === 'function') {
              trigger.focus({ preventScroll: true });
            }
          } catch (_) {}
        });
        // Fechar submenus antigos, se existirem
        document.querySelectorAll('.barra-categorias .tem-submenu').forEach(submenu => {
          submenu.classList.remove('active');
        });
      }
    });
  }
  
  // ==================== SUPORTE PARA TOUCH/MOBILE ====================
  function adicionarSuporteTouch() {
    const links = document.querySelectorAll('.barra-categorias a');
    
    links.forEach(link => {
      // Adicionar classe para feedback visual no touch
      link.addEventListener('touchstart', function() {
        this.classList.add('touch-active');
      });
      
      link.addEventListener('touchend', function() {
        setTimeout(() => {
          this.classList.remove('touch-active');
        }, 150);
      });
      
      link.addEventListener('touchcancel', function() {
        this.classList.remove('touch-active');
      });
    });
    
    // Melhorar experiência touch para dropdowns
    const dropdowns = document.querySelectorAll('.barra-categorias li.mega-dropdown, .barra-categorias li.dropdown');
    dropdowns.forEach(dropdown => {
      dropdown.addEventListener('touchstart', function(e) {
        // Prevenir que outros eventos de touch interfiram
        e.stopPropagation();
      });
    });
  }
  
  // ==================== INICIALIZAÇÃO ====================
  function inicializar() {
    // Aguardar um pouco para garantir que o DOM esteja completamente carregado
    setTimeout(() => {
      ensureChatbotLoaded();
      corrigirDepartamentos();
      corrigirLinksCategoria();
      melhorarSubmenus();
      adicionarEventoFecharMenus();
      adicionarSuporteTouch();
      // Configurar toggle do tema se necessário (páginas que não injetam scripts do cabeçalho)
      try { configurarToggleTemaSeNecessario(); } catch (_) {}
      try {
        inicializarLoginBox();
      } catch (e) {
        // silencioso se login box não disponível
      }
      try {
        inicializarBuscaGlobal();
      } catch (_) {}
    }, 100);
  }
  
  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }
  
  // Reinicializar se o conteúdo for carregado dinamicamente
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Verificar se foram adicionados elementos relevantes
        const nodes = Array.from(mutation.addedNodes);
        const barraAdicionada = nodes.some(node => node.classList && node.classList.contains('barra-categorias'));
        const headerAdicionado = nodes.some(node => (node.tagName === 'NAV' && node.classList && node.classList.contains('cabecalho')) || (node.querySelector && node.querySelector('#btnDarkMode')));

        if (barraAdicionada) {
          console.log('Barra de categorias carregada dinamicamente, reaplicando melhorias...');
          setTimeout(inicializar, 100);
        }
        if (headerAdicionado) {
          // Quando o cabeçalho/toggle aparece, configurar o toggle de tema se necessário
          setTimeout(() => { try { configurarToggleTemaSeNecessario(); } catch (_) {} }, 50);
          setTimeout(() => { try { inicializarBuscaGlobal(); } catch (_) {} }, 80);
        }
      }
    });
  });
  
  // Observar mudanças no body
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();

// ==================== FUNÇÕES DE LOGIN NO CABEÇALHO ====================
function preventDefault(e) { e.preventDefault(); }

function obterPrimeiroNome(nomeCompleto) {
  if (!nomeCompleto || typeof nomeCompleto !== 'string') return '';
  const partes = nomeCompleto.trim().split(/\s+/);
  return partes[0] || '';
}

function inicializarLoginBox() {
  // Evitar múltiplas inicializações (idempotente)
  if (window.__loginBoxInit) {
    return;
  }
  const caixaLogin = document.getElementById('caixa-login');
  const statusLogin = document.getElementById('status-login');
  const subtextoLogin = document.getElementById('subtexto-login');
  const dropdownUsuario = document.getElementById('dropdown-usuario');
  const setaLogin = document.getElementById('seta-login');
  const botaoLogout = document.getElementById('botao-logout');

  if (!caixaLogin || !statusLogin || !subtextoLogin) return;

  // Ocultar completamente a caixinha nas páginas de autenticação (login e cadastro)
  try {
    const path = String(window.location.pathname || '');
    const isAuthPage = /(^|\/)(login|cadastro|login-vendedor|cadastro-vendedor)(\.html)?(\/?|\?|$)/i.test(path);
    if (isAuthPage) {
      caixaLogin.style.display = 'none';
      // Não prosseguir com inicialização de eventos/estado para evitar interferências
      return;
    }
  } catch (_) {}

  // A partir daqui, podemos marcar como iniciado com segurança
  window.__loginBoxInit = true;

  // Remover vestígios de autenticação do localStorage
  try {
    ['token','usuario','emailCadastro','dadosVerificacao','emailVerificado'].forEach(k => localStorage.removeItem(k));
  } catch {}

  let API_BASE = (window.API_BASE || window.location.origin);
  // Removido AbortController para evitar net::ERR_ABORTED no console

  // Utilitários de sessão local do vendedor (fallback)
  const getPerfilVendedorLocal = () => {
    try { return JSON.parse(localStorage.getItem('vendedor:perfil')); } catch { return null; }
  };
  const isVendedorLocal = () => {
    try { return localStorage.getItem('auth:vendor') === '1' || !!localStorage.getItem('vendedor:perfil'); } catch { return false; }
  };
  const limparSessaoVendedorLocal = () => {
    try {
      localStorage.removeItem('auth:vendor');
      localStorage.removeItem('vendedor:perfil');
    } catch {}
  };

  // Utilitários de sessão local do cliente (fallback)
  const getPerfilClienteLocal = () => {
    try { return JSON.parse(localStorage.getItem('cliente:perfil')); } catch { return null; }
  };
  const isClienteLocal = () => {
    try { return localStorage.getItem('auth:customer') === '1' || !!localStorage.getItem('cliente:perfil'); } catch { return false; }
  };
  const limparSessaoClienteLocal = () => {
    try {
      localStorage.removeItem('auth:customer');
      localStorage.removeItem('cliente:perfil');
    } catch {}
  };

  const aplicarNaoLogado = () => {
    statusLogin.textContent = 'Entre';
    subtextoLogin.textContent = 'Iniciar Sessão';
    const dropdownLogin = document.getElementById('dropdown-login');
    if (dropdownUsuario) dropdownUsuario.style.display = 'none';
    if (dropdownLogin) dropdownLogin.style.display = 'none';

    // Clique/toggle do dropdown de login (cliente/vendedor)
    caixaLogin.onclick = function(e) {
      // Permite que cliques em links internos naveguem normalmente
      const clicouEmLink = e.target && e.target.closest('#dropdown-login .opcoes-usuario a');
      if (clicouEmLink) return;
      e.preventDefault();
      if (!dropdownLogin) {
        try { if (authAbortController) authAbortController.abort(); } catch {}
        window.location.href = '/login.html';
        return;
      }
      const aberto = dropdownLogin.style.display === 'block';
      dropdownLogin.style.display = aberto ? 'none' : 'block';
      if (!aberto) {
        dropdownLogin.classList.add('aberta');
        caixaLogin.classList.add('open');
      } else {
        dropdownLogin.classList.remove('aberta');
        caixaLogin.classList.remove('open');
      }
      if (setaLogin) setaLogin.classList.toggle('aberta', !aberto);
    };
    // Ícone de seta para indicar dropdown
    if (setaLogin) {
      setaLogin.classList.remove('fa-arrow-right');
      setaLogin.classList.add('fa-chevron-down');
    }
    // Fechar dropdown ao clicar fora e dar suporte a teclado
    const fecharDropdownLogin = () => {
      const dropdownLoginEl = document.getElementById('dropdown-login');
      if (dropdownLoginEl) {
        dropdownLoginEl.style.display = 'none';
        dropdownLoginEl.classList.remove('aberta');
      }
      if (caixaLogin) caixaLogin.classList.remove('open');
      if (setaLogin) setaLogin.classList.remove('aberta');
    };
    if (!window.__dropdownLoginOutsideHandlerAdded) {
      document.addEventListener('click', (ev) => {
        if (!ev.target.closest('#caixa-login')) {
          fecharDropdownLogin();
        }
      });
      window.__dropdownLoginOutsideHandlerAdded = true;
    }
    caixaLogin.setAttribute('tabindex', '0');
    caixaLogin.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        caixaLogin.click();
      }
      if (ev.key === 'Escape') {
        fecharDropdownLogin();
      }
    });
    // Ocultar link de Configurações no rodapé para deslogados
    try {
      const linkConfigFooter = document.getElementById('link-configuracoes-footer');
      if (linkConfigFooter) linkConfigFooter.style.display = 'none';
      const linkHistoricoFooter = document.getElementById('link-historico-footer');
      if (linkHistoricoFooter) linkHistoricoFooter.style.display = 'none';
    } catch {}
  };

  // Estado padrão imediato: não logado, para navegação instantânea
  aplicarNaoLogado();

  // Prefetch leve dos assets da página de login para acelerar transição
  try {
    setTimeout(() => {
      const assets = [
        { href: '/login.html', rel: 'prefetch' },
        { href: 'css/login.css', rel: 'prefetch' },
        { href: 'js/login.js', rel: 'prefetch' },
        { href: '/login-vendedor.html', rel: 'prefetch' },
        { href: 'js/login-vendedor.js', rel: 'prefetch' }
      ];
      assets.forEach(({ href, rel }) => {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        document.head.appendChild(link);
      });
    }, 100);
  } catch {}

  const aplicarLogado = (usuario) => {
    const dropdownLogin = document.getElementById('dropdown-login');
    // Preferir nome do perfil local do vendedor se existir
    const perfilVend = getPerfilVendedorLocal();
    const perfilCli = getPerfilClienteLocal();
    const nome = perfilVend?.nome || perfilCli?.nome || usuario?.nome || usuario?.name || perfilVend?.email || perfilCli?.email || '';
    const primeiroNome = obterPrimeiroNome(nome) || (usuario?.email ? usuario.email.split('@')[0] : 'Usuário');
    statusLogin.textContent = `Olá, ${primeiroNome}!`;
    subtextoLogin.textContent = 'Minha Conta';
    // Atualizar avatar no cabeçalho, se disponível
    const avatarEl = document.getElementById('avatar-usuario');
    if (avatarEl) {
      let src = '/imagens/logos/avatar-roxo.svg';
      if (usuario && typeof usuario.foto_perfil === 'string' && usuario.foto_perfil.startsWith('data:image/')) {
        src = usuario.foto_perfil;
      } else if (usuario && typeof usuario.foto_perfil === 'string' && usuario.foto_perfil.trim()) {
        src = usuario.foto_perfil;
      }
      avatarEl.src = src;
    }
    // Alterar seta para baixo indicando dropdown
    if (setaLogin) {
      setaLogin.classList.remove('fa-arrow-right');
      setaLogin.classList.add('fa-chevron-down');
}

// ==================== BUSCA GLOBAL NO CABEÇALHO ====================
function inicializarBuscaGlobal() {
  const campo = document.getElementById('campo-busca-global');
  const botao = document.getElementById('botao-busca-global');
  const limpar = document.getElementById('botao-limpar-busca');
  const lista = document.getElementById('sugestoes-busca');
  const preview = document.getElementById('busca-preview');
  const form = document.getElementById('form-busca-global') || (campo ? campo.closest('form') : null);

  if (!campo || !botao) return;
  if (campo.dataset.buscaInit === '1') return; // evitar múltiplas inicializações
  campo.dataset.buscaInit = '1';

  const API_BASE = (window.API_BASE || window.location.origin);

  // ===== Pesquisas Recentes (localStorage) =====
  const RECENTS_KEY = 'roxinho_search_recents';
  const MAX_RECENTS = 10;
  const lerRecentes = () => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      const arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  };
  const salvarRecentes = (arr) => {
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(arr.slice(0, MAX_RECENTS))); } catch (_) {}
  };
  const registrarRecente = (sug) => {
    if (!sug || !sug.texto) return;
    const atuais = lerRecentes();
    const filtrados = atuais.filter(x => !(String(x.texto||'') === String(sug.texto||'') && String(x.url||'') === String(sug.url||'')));
    const novo = { tipo: sug.tipo || 'busca', texto: String(sug.texto||''), url: String(sug.url||''), ts: Date.now() };
    const ordenado = [novo, ...filtrados].sort((a,b)=>b.ts-a.ts).slice(0, MAX_RECENTS);
    salvarRecentes(ordenado);
  };
  const construirSugRecente = (texto) => ({ tipo: 'busca', texto, url: `/produtos?busca=${encodeURIComponent(texto)}` });

  const debounce = (fn, delay) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  };

  const escapeHtml = (str) => String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  // Estado da lista de sugestões
  let activeIndex = -1;
  let currentSuggestions = [];

  const fecharSugestoes = () => {
    if (lista) {
      lista.style.display = 'none';
      lista.innerHTML = '';
    }
    try { campo.setAttribute('aria-expanded', 'false'); } catch {}
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    activeIndex = -1;
    currentSuggestions = [];
    if (limpar) { limpar.style.display = (campo && campo.value && campo.value.trim()) ? 'flex' : 'none'; }
  };

  const setActiveIndex = (idx) => {
    const items = lista ? Array.from(lista.querySelectorAll('.sugestao-item')) : [];
    items.forEach((el, i) => {
      if (i === idx) {
        el.classList.add('active');
        el.setAttribute('aria-selected', 'true');
        try { campo.setAttribute('aria-activedescendant', el.id || ''); } catch {}
      } else {
        el.classList.remove('active');
        el.setAttribute('aria-selected', 'false');
      }
    });
    activeIndex = idx;
  };

  const highlight = (text, term) => {
    const t = String(term || '').trim();
    if (!t) return escapeHtml(text);
    try {
      const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
      return escapeHtml(text).replace(re, '<mark>$1</mark>');
    } catch (_) {
      return escapeHtml(text);
    }
  };

  const renderSugestoesComCabecalho = (sugs = [], cabecalho = '') => {
    if (!lista) return;
    if (!Array.isArray(sugs) || sugs.length === 0) { fecharSugestoes(); return; }
    currentSuggestions = sugs.slice(0);
    const q = String(campo.value || '').trim();
    const headerHtml = cabecalho ? `<div class="sugestoes-header">${escapeHtml(cabecalho)}</div>` : '';
    const html = headerHtml + sugs.map((s, i) => {
      const href = String(s.url || '').startsWith('/') ? s.url : ('/' + String(s.url || ''));
      const tipo = s.tipo === 'categoria'
        ? 'Categoria'
        : (s.tipo === 'subcategoria'
          ? 'Subcategoria'
          : (s.tipo === 'marca' ? 'Marca' : (s.tipo === 'busca' ? 'Busca' : 'Produto')));
      const icon = s.tipo === 'produto' ? 'fa-box' : (s.tipo === 'categoria' ? 'fa-list' : (s.tipo === 'subcategoria' ? 'fa-layer-group' : (s.tipo === 'marca' ? 'fa-tags' : 'fa-magnifying-glass')));
      const precoTxt = (s.preco !== undefined && s.preco !== null) ? ` • R$ ${Number(s.preco).toFixed(2).replace('.', ',')}` : '';
      return `<a class="sugestao-item" id="sug-item-${i}" role="option" aria-selected="false" href="${href}">
        <i class="fa-solid ${icon}" aria-hidden="true"></i>
        <span class="tipo">${tipo}</span>
        <span class="texto">${q ? highlight(String(s.texto||''), q) : escapeHtml(String(s.texto||''))}</span>
        <span class="extra">${escapeHtml(precoTxt)}</span>
      </a>`;
    }).join('');
    lista.innerHTML = html;
    lista.style.display = 'block';
    try { campo.setAttribute('aria-expanded', 'true'); } catch {}

    Array.from(lista.querySelectorAll('.sugestao-item')).forEach((el, i) => {
      el.addEventListener('mouseenter', () => setActiveIndex(i));
      el.addEventListener('mousemove', () => setActiveIndex(i));
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const url = el.getAttribute('href');
        if (url) window.location.href = url;
      });
    });
    setActiveIndex(0);
  };

  const renderRecentes = () => {
    const rs = lerRecentes();
    if (!rs.length) { fecharSugestoes(); return; }
    renderSugestoesComCabecalho(rs, 'Pesquisas recentes');
  };

  const renderSugestoes = (sugs = []) => {
    if (!lista) return;
    if (!Array.isArray(sugs) || sugs.length === 0) { fecharSugestoes(); return; }
    currentSuggestions = sugs.slice(0);
    const q = String(campo.value || '').trim();
    const html = sugs.map((s, i) => {
      const href = String(s.url || '').startsWith('/') ? s.url : ('/' + String(s.url || ''));
      const tipo = s.tipo === 'categoria'
        ? 'Categoria'
        : (s.tipo === 'subcategoria'
          ? 'Subcategoria'
          : (s.tipo === 'marca' ? 'Marca' : 'Produto'));
      const icon = s.tipo === 'produto' ? 'fa-box' : (s.tipo === 'categoria' ? 'fa-list' : (s.tipo === 'subcategoria' ? 'fa-layer-group' : 'fa-tags'));
      const precoTxt = (s.preco !== undefined && s.preco !== null) ? ` • R$ ${Number(s.preco).toFixed(2).replace('.', ',')}` : '';
      return `<a class="sugestao-item" id="sug-item-${i}" role="option" aria-selected="false" href="${href}">
        <i class="fa-solid ${icon}" aria-hidden="true"></i>
        <span class="tipo">${tipo}</span>
        <span class="texto">${highlight(String(s.texto||''), q)}</span>
        <span class="extra">${escapeHtml(precoTxt)}</span>
      </a>`;
    }).join('');
    lista.innerHTML = html;
    lista.style.display = 'block';
    try { campo.setAttribute('aria-expanded', 'true'); } catch {}

    // Eventos de hover/clique para melhorar UX
    Array.from(lista.querySelectorAll('.sugestao-item')).forEach((el, i) => {
      el.addEventListener('mouseenter', () => setActiveIndex(i));
      el.addEventListener('mousemove', () => setActiveIndex(i));
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const url = el.getAttribute('href');
        if (url) window.location.href = url;
      });
    });
    // Ativa primeiro por padrão, semelhante ao Google
    setActiveIndex(0);
  };

  const renderPreview = (pv) => {
    if (!preview) return;
    if (!pv || !pv.produto) { preview.style.display = 'none'; preview.innerHTML = ''; return; }
    const p = pv.produto;
    const titulo = escapeHtml(p.titulo || p.nome || '');
    const precoML = p.precoMercadoLivre;
    const precoAMZ = p.precoAmazon;
    const precoMin = (typeof precoML === 'number' || typeof precoAMZ === 'number')
      ? Math.min(precoML ?? Number.POSITIVE_INFINITY, precoAMZ ?? Number.POSITIVE_INFINITY)
      : p.preco;
    const precoTxt = (typeof precoMin === 'number' && isFinite(precoMin)) ? `R$ ${Number(precoMin).toFixed(2).replace('.', ',')}` : '';
    const href = `/pagina-produto?id=${encodeURIComponent(p.id)}`;
    preview.innerHTML = `<button class="preview-close" aria-label="Fechar preview" title="Fechar">&times;</button>`+
      `<a class="preview-link" href="${href}"><strong>${titulo}</strong>${precoTxt ? ` • <span class="preco">${precoTxt}</span>` : ''}</a>`;
    preview.style.display = 'block';
    const btnClose = preview.querySelector('.preview-close');
    if (btnClose) btnClose.addEventListener('click', () => { preview.style.display = 'none'; preview.innerHTML = ''; });
  };

  // Fallback local: classificar termo no cliente quando Enter é pressionado muito rápido
  const classificarTermoLocal = (termo) => {
    const t = String(termo || '').toLowerCase();
    const reSmart = /smartphone|celular|iphone(?:\s*\d+)?|galaxy|samsung|samsumg|s\s?24|android|ios/;
    const reConsole = /\bps5\b|playstation\s*5|\bxbox\b|nintendo\s*switch|console/;
    const reNotebook = /notebook|laptop|ultrabook|pc\s+montado|computador\s+montado|pc\s+completo|pc\s+pronto/;
    const reTV = /smart\s*tv|\btv\b|oled|4k|8k|uhd/;
    if (reSmart.test(t)) return { categoria: 'Celular & Smartphone', subcategoria: 'Smartphones' };
    if (reConsole.test(t)) return { categoria: 'Games', subcategoria: 'Consoles' };
    if (reNotebook.test(t)) return { categoria: 'Computadores', subcategoria: 'Notebooks' };
    if (reTV.test(t)) return { categoria: 'TV & Áudio', subcategoria: 'Smart TVs' };
    return { categoria: '', subcategoria: '' };
  };

  const consultarSugestoes = debounce(async (term) => {
    const q = String(term || '').trim();
    if (limpar) { limpar.style.display = q ? 'flex' : 'none'; }
    // Mostrar sugestões já a partir de 1 caractere para tempo real
    if (q.length < 1) { renderRecentes(); return; }
    try {
      try { campo.setAttribute('aria-busy', 'true'); } catch {}
      const resp = await fetch(`${API_BASE}/api/products/search?q=${encodeURIComponent(q)}`);
      if (!resp.ok) {
        // Se a API falhar, manter dropdown aberto com opção de busca direta
        const intent = classificarTermoLocal(q);
        const items = [];
        if (intent && intent.categoria) {
          const sugIntent = intent.subcategoria
            ? { tipo: 'subcategoria', texto: intent.subcategoria, url: `/produtos?categoria=${encodeURIComponent(intent.categoria)}&subcategoria=${encodeURIComponent(intent.subcategoria)}` }
            : { tipo: 'categoria', texto: intent.categoria, url: `/produtos?categoria=${encodeURIComponent(intent.categoria)}` };
          items.push(sugIntent);
        }
        items.push(construirSugRecente(q));
        renderSugestoesComCabecalho(items, 'Resultados');
        return;
      }
      const data = await resp.json();
      const sugs = Array.isArray(data.suggestions) ? data.suggestions : [];
      // Inserir intenção local no topo quando reconhecida, evitando duplicatas
      const intent = classificarTermoLocal(q);
      if (intent && intent.categoria) {
        const sugIntent = intent.subcategoria
          ? { tipo: 'subcategoria', texto: intent.subcategoria, url: `/produtos?categoria=${encodeURIComponent(intent.categoria)}&subcategoria=${encodeURIComponent(intent.subcategoria)}` }
          : { tipo: 'categoria', texto: intent.categoria, url: `/produtos?categoria=${encodeURIComponent(intent.categoria)}` };
        const existe = sugs.some(s => String(s.url || '') === String(sugIntent.url || ''));
        if (!existe) sugs.unshift(sugIntent);
      }
      if (!sugs.length) {
        // Sem sugestões: mostrar intenção local (se houver) e busca direta
        const items = [];
        if (intent && intent.categoria) {
          const sugIntent = intent.subcategoria
            ? { tipo: 'subcategoria', texto: intent.subcategoria, url: `/produtos?categoria=${encodeURIComponent(intent.categoria)}&subcategoria=${encodeURIComponent(intent.subcategoria)}` }
            : { tipo: 'categoria', texto: intent.categoria, url: `/produtos?categoria=${encodeURIComponent(intent.categoria)}` };
          items.push(sugIntent);
        }
        items.push(construirSugRecente(q));
        renderSugestoesComCabecalho(items, 'Resultados');
      } else {
        renderSugestoes(sugs);
      }
      renderPreview(data.preview || null);
    } catch (_) {
      // Falha geral: ainda oferecer a busca direta
      const intent = classificarTermoLocal(q);
      const items = [];
      if (intent && intent.categoria) {
        const sugIntent = intent.subcategoria
          ? { tipo: 'subcategoria', texto: intent.subcategoria, url: `/produtos?categoria=${encodeURIComponent(intent.categoria)}&subcategoria=${encodeURIComponent(intent.subcategoria)}` }
          : { tipo: 'categoria', texto: intent.categoria, url: `/produtos?categoria=${encodeURIComponent(intent.categoria)}` };
        items.push(sugIntent);
      }
      items.push(construirSugRecente(q));
      renderSugestoesComCabecalho(items, 'Resultados');
    } finally {
      try { campo.removeAttribute('aria-busy'); } catch {}
    }
  // Reduzir debounce para respostas mais rápidas no dropdown
  }, 120);

  const executarBusca = async () => {
    const q = String(campo.value || '').trim();
    if (!q) return;
    fecharSugestoes();
    // Registrar como recente, preferindo categoria/subcategoria se vierem da API
    try {
      const resp = await fetch(`${API_BASE}/api/products/search?q=${encodeURIComponent(q)}`);
      let sug = null;
      if (resp.ok) {
        const data = await resp.json();
        const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
        // Preferir subcategoria > categoria > marca > produto
        sug = list.find(it => it.tipo === 'subcategoria')
          || list.find(it => it.tipo === 'categoria')
          || list.find(it => it.tipo === 'marca')
          || list.find(it => it.tipo === 'produto')
          || null;
        if (sug && sug.url) {
          try { registrarRecente(sug); } catch(_) {}
          window.location.href = String(sug.url).startsWith('/') ? sug.url : ('/' + sug.url);
          return;
        }
      }
      registrarRecente(sug || construirSugRecente(q));
    } catch (_) { registrarRecente(construirSugRecente(q)); }

    // Fallback inteligente: se não houve sugestão da API, tentar classificar localmente
    const intent = classificarTermoLocal(q);
    if (intent && intent.categoria) {
      const destinoIntent = intent.subcategoria
        ? `/produtos.html?categoria=${encodeURIComponent(intent.categoria)}&subcategoria=${encodeURIComponent(intent.subcategoria)}`
        : `/produtos.html?categoria=${encodeURIComponent(intent.categoria)}`;
      window.location.href = destinoIntent;
      return;
    }

    const destino = `/produtos.html?busca=${encodeURIComponent(q)}`;

    // Se já estamos na página de produtos, atualiza sem redirecionar
    if (typeof window.atualizarBuscaProdutos === 'function' && /produtos(\.html)?$/i.test(window.location.pathname)) {
      try { window.atualizarBuscaProdutos(q); } catch (_) {}
      try {
        const url = new URL(window.location);
        url.searchParams.set('busca', q);
        window.history.pushState({}, '', url);
      } catch (_) {}
      return;
    }
    // Caso contrário, navega para a página de produtos com o termo
    window.location.href = destino;
  };

  // Reativar sugestões ao digitar, estilo barra do Google
  campo.addEventListener('input', (e) => {
    const val = e.target.value;
    if (limpar) { limpar.style.display = String(val || '').trim() ? 'flex' : 'none'; }
    consultarSugestoes(val);
  });
  campo.addEventListener('keydown', (e) => {
    const items = lista ? Array.from(lista.querySelectorAll('.sugestao-item')) : [];
    if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length) {
        const idx = activeIndex >= 0 ? activeIndex : 0;
        const el = items[idx];
        const url = el && el.getAttribute('href');
        if (url) { window.location.href = url; return; }
      }
      executarBusca();
    }
    else if (e.key === 'Escape') { fecharSugestoes(); }
    else if (e.key === 'ArrowDown') {
      if (items.length) {
        e.preventDefault();
        const next = Math.min((activeIndex < 0 ? 0 : activeIndex + 1), items.length - 1);
        setActiveIndex(next);
      }
    } else if (e.key === 'ArrowUp') {
      if (items.length) {
        e.preventDefault();
        const prev = Math.max(0, (activeIndex < 0 ? 0 : activeIndex - 1));
        setActiveIndex(prev);
      }
    }
  });
  // Se houver formulário, preferir submit para evitar duplicidade
  if (form) {
    form.addEventListener('submit', (e) => { e.preventDefault(); executarBusca(); });
  } else if (botao) {
    botao.addEventListener('click', () => executarBusca());
  }
  // Botão de limpar busca
  if (limpar) {
    limpar.addEventListener('click', (e) => {
      e.preventDefault();
      try { campo.value = ''; campo.focus(); } catch(_) {}
      fecharSugestoes();
      if (limpar) { limpar.style.display = 'none'; }
    });
  }

  // Botão limpar (X): limpar campo, sugestões e preview
  if (limpar) {
    limpar.addEventListener('click', () => {
      campo.value = '';
      fecharSugestoes();
      limpar.style.display = 'none';
      campo.focus();
      renderRecentes();
    });
  }

  // Marca como inicializado para evitar bind duplicado por scripts inline
  try { campo.dataset.buscaInit = '1'; } catch {}

  // Fechar dropdown ao clicar fora
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('.caixa-pesquisa')) { fecharSugestoes(); }
  });

  // Mostrar recentes ao focar no campo quando vazio
  campo.addEventListener('focus', () => {
    const q = String(campo.value||'').trim();
    if (!q) renderRecentes();
  });
}

    // Inserir itens por role (vendedor/admin) acima de "Configurações"
    try {
      const opcoes = dropdownUsuario?.querySelector('.opcoes-usuario');
      if (opcoes) {
        const role = String(usuario && usuario.role || '').toLowerCase();
        const ehVendedor = role === 'vendedor' || isVendedorLocal();
        const ehAdmin = role === 'admin';

        // Painel do Vendedor
        const linkVend = opcoes.querySelector('#link-painel-vendedor');
        // Admin também enxerga Painel do Vendedor
        if ((ehVendedor || ehAdmin) && !linkVend) {
          const aPainel = document.createElement('a');
          aPainel.href = '/painel-vendedor.html';
          aPainel.id = 'link-painel-vendedor';
          aPainel.innerHTML = '<i class="fa-solid fa-store"></i> Painel do Vendedor';
          const linkConfig = opcoes.querySelector('a[href="/configuracoes"]');
          if (linkConfig) opcoes.insertBefore(aPainel, linkConfig); else opcoes.appendChild(aPainel);
        } else if (!ehVendedor && !ehAdmin && linkVend) {
          linkVend.remove();
        }

        // Administração (todos com role admin)
        const linkPainelAdmin = opcoes.querySelector('#link-administracao');
        if (ehAdmin && !linkPainelAdmin) {
          const aAdmin = document.createElement('a');
          aAdmin.href = '/administracao.html';
          aAdmin.id = 'link-administracao';
          aAdmin.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Administração';
          const linkConfig = opcoes.querySelector('a[href="/configuracoes"]');
          if (linkConfig) opcoes.insertBefore(aAdmin, linkConfig); else opcoes.appendChild(aAdmin);
        } else if (!ehAdmin && linkPainelAdmin) {
          linkPainelAdmin.remove();
        }

        // Remover quaisquer alternadores de modo do dropdown
        try {
          opcoes.querySelector('#link-switch-vendedor')?.remove();
          opcoes.querySelector('#link-switch-cliente')?.remove();
        } catch {}
      }
    } catch {}
    caixaLogin.onclick = function(e) {
      // Permitir navegação nos links do dropdown sem bloquear
      const clicouEmLink = e.target && e.target.closest('#dropdown-usuario .opcoes-usuario a');
      if (clicouEmLink) {
        return; // não prevenir o default, não togglar o dropdown
      }
      e.preventDefault();
      if (dropdownLogin) {
        dropdownLogin.style.display = 'none';
        dropdownLogin.classList.remove('aberta');
      }
      if (!dropdownUsuario) return;
      const aberto = dropdownUsuario.style.display === 'block';
      dropdownUsuario.style.display = aberto ? 'none' : 'block';
      if (!aberto) {
        dropdownUsuario.classList.add('aberta');
        caixaLogin.classList.add('open');
      } else {
        dropdownUsuario.classList.remove('aberta');
        caixaLogin.classList.remove('open');
      }
      if (setaLogin) setaLogin.classList.toggle('aberta', !aberto);
    };

    // Fechar dropdown ao clicar fora
    const fecharDropdownUsuario = () => {
      if (dropdownUsuario) {
        dropdownUsuario.style.display = 'none';
        dropdownUsuario.classList.remove('aberta');
      }
      if (caixaLogin) caixaLogin.classList.remove('open');
      if (setaLogin) setaLogin.classList.remove('aberta');
    };

    if (!window.__dropdownUsuarioOutsideHandlerAdded) {
      document.addEventListener('click', (ev) => {
        if (!ev.target.closest('#caixa-login')) {
          fecharDropdownUsuario();
        }
      });
      window.__dropdownUsuarioOutsideHandlerAdded = true;
    }

    // Suporte a teclado
    caixaLogin.setAttribute('tabindex', '0');
    caixaLogin.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        caixaLogin.click();
      }
      if (ev.key === 'Escape') {
        fecharDropdownUsuario();
      }
    });

    // Feedback visual em itens
    try {
      dropdownUsuario.querySelectorAll('.opcoes-usuario a').forEach(a => {
        a.addEventListener('mousedown', () => a.classList.add('pressed'));
        a.addEventListener('mouseup', () => a.classList.remove('pressed'));
        a.addEventListener('mouseleave', () => a.classList.remove('pressed'));
        a.addEventListener('touchstart', () => a.classList.add('pressed'));
        a.addEventListener('touchend', () => a.classList.remove('pressed'));
        a.addEventListener('click', (evt) => {
          // Impede que o clique borbulhe para o container e cancele a navegação
          evt.stopPropagation();
          fecharDropdownUsuario();
        });
      });
    } catch {}
    if (botaoLogout) {
      botaoLogout.addEventListener('click', async function(e) {
        e.preventDefault();
        try {
          await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
        } catch {}
        // limpar sessão local
        try { localStorage.removeItem('auth:token'); } catch {}
        // limpar sessão local do vendedor
        limparSessaoVendedorLocal();
        limparSessaoClienteLocal();
        try { localStorage.setItem('auth:event', 'logout:' + Date.now()); } catch {}
        if (dropdownUsuario) dropdownUsuario.style.display = 'none';
        aplicarNaoLogado();
        window.location.href = '/login.html';
      });
    }
    // Mostrar link de Configurações no rodapé para logados
    try {
      const linkConfigFooter = document.getElementById('link-configuracoes-footer');
      if (linkConfigFooter) linkConfigFooter.style.display = '';
      const linkHistoricoFooter = document.getElementById('link-historico-footer');
      if (linkHistoricoFooter) linkHistoricoFooter.style.display = '';
    } catch {}

    // Removido: link do Painel Admin não existe mais
  };

  // Consultar usuário atual via cookie (backend) usando base única
  const checarAuth = async () => {
    if (window.__authCheckInFlight) return;
    window.__authCheckInFlight = true;
    try {
      const getMe = (typeof window.getAuthMe === 'function')
        ? window.getAuthMe
        : async () => {
            try {
              const resp = await fetch(`${API_BASE}/api/auth/me`, { cache: 'no-store', credentials: 'include' });
              if (resp && resp.ok) {
                try { return await resp.json(); } catch { return { success: false, user: null }; }
              }
            } catch {}
            return { success: false, user: null };
          };
      const data = await getMe().catch(() => ({ success: false, user: null }));
      if (data && data.success && data.user) {
        aplicarLogado(data.user);
      } else {
        // Fallback: vendedor ou cliente local
        const perfilVend = getPerfilVendedorLocal();
        const perfilCli = getPerfilClienteLocal();
        if (perfilVend) {
          aplicarLogado(perfilVend);
        } else if (perfilCli) {
          aplicarLogado(perfilCli);
        } else {
          aplicarNaoLogado();
        }
      }
    } catch (_) {
      // Fallback offline: vendedor ou cliente local
      const perfilVend = getPerfilVendedorLocal();
      const perfilCli = getPerfilClienteLocal();
      if (perfilVend) {
        aplicarLogado(perfilVend);
      } else if (perfilCli) {
        aplicarLogado(perfilCli);
      } else {
        aplicarNaoLogado();
      }
    } finally {
      window.__authCheckInFlight = false;
    }
  };
  // Evita checagem em páginas de autenticação para reduzir latência
  const isAuthPage = /(^|\/)(login|cadastro|login-vendedor|cadastro-vendedor)(\.html)?(\/?|\?|$)/i.test(window.location.pathname);
  if (!isAuthPage) {
    // Executa apenas uma vez imediatamente
    checarAuth();
  }
  // Revalida quando a aba volta ao foco ou quando há eventos de autenticação em outras abas
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !isAuthPage) {
        checarAuth();
      }
    });
    window.addEventListener('storage', (e) => {
      const k = e && e.key ? String(e.key) : '';
      if (/^auth:/i.test(k) && !isAuthPage) {
        checarAuth();
      }
    });
  } catch {}
  // Removida revalidação periódica para evitar logs e requisições desnecessárias
}
