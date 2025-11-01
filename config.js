// Configuração global de API com fallback automático e variável central
(function(){
  // Base padrão: usar mesma origem do front (sem forçar localhost)
  const CONFIG_API_BASE = '';

  // Sanitiza valores com aspas/backticks acidentais e valida a origem
  function sanitizeBase(input) {
    try {
      if (typeof input !== 'string') return '';
      let s = input.trim();

      // Remove aspas/backticks de borda se vierem em pares
      const wrappers = ["'", '"', '`'];
      wrappers.forEach(q => {
        if (s.startsWith(q) && s.endsWith(q)) {
          s = s.slice(1, -1);
        }
      });

      // Remove backticks internos acidentais e barras finais
      s = s.replace(/[`]/g, '').replace(/\/+$/, '');

      // Valida e retorna apenas origin (protocolo+host+porta)
      const u = new URL(s);
      return u.origin;
    } catch {
      try { return (window.location && window.location.origin || '').replace(/\/+$/, ''); } catch { return ''; }
    }
  }

  try {
    // Permite override por parâmetros de URL: ?apiBase=... ou ?localApi=1
    let urlOverride = '';
    try {
      const search = (window.location && window.location.search) ? window.location.search : '';
      const usp = new URLSearchParams(search);
      const pApiBase = usp.get('apiBase');
      if (pApiBase && String(pApiBase).trim()) {
        urlOverride = sanitizeBase(String(pApiBase).trim());
      }
    } catch {}

    // Respeita valor já definido externamente, senão usa parâmetro de URL, senão constante padrão
    const pre = (typeof window.API_BASE === 'string' && window.API_BASE.trim()) ? window.API_BASE.trim() : null;
    const origin = sanitizeBase(urlOverride || pre || CONFIG_API_BASE || (window.location && window.location.origin) || '');
    Object.defineProperty(window, 'API_BASE', { value: origin, configurable: true });
    try {
      const same = String(origin || '').replace(/\/+$/, '') === String(window.location.origin || '').replace(/\/+$/, '');
      Object.defineProperty(window, '__API_CROSS_ORIGIN', { value: !same, configurable: true });
    } catch(_) {}
  } catch {
    try { window.API_BASE = sanitizeBase(CONFIG_API_BASE || window.location.origin || ''); } catch {}
  }

  // Patch global de fetch: quando chamado com caminho relativo '/api',
  // prefixa automaticamente com API_BASE para centralizar a configuração
  try {
    const origFetch = window.fetch;
    if (typeof origFetch === 'function' && !window.__fetchApiPatched) {
      window.fetch = function(input, init) {
        try {
          let url = input;
          if (typeof url === 'string' && url.startsWith('/api')) {
            url = `${window.API_BASE}${url}`;
          }
          const opts = init;
          return origFetch.call(this, url, opts);
        } catch {}
        return origFetch.call(this, input, init);
      };
      window.__fetchApiPatched = true;
    }
  } catch {}
})();

// ===== Helper global para ícone da Amazon conforme tema =====
(function(){
  try {
    // Define função global que retorna o caminho do ícone da Amazon de acordo com o tema atual
    window.getAmazonIconByTheme = function() {
      const isDark = document.documentElement.classList.contains('dark');
      // Em dark, preferir versão clara; em light, versão padrão
      return isDark ? '/imagens/logos/amazon-icon.png' : '/imagens/logos/Amazon_icon.png';
    };

    // Atualiza ícones já renderizados quando o tema mudar
    window.updateAmazonIconsOnTheme = function() {
      const src = window.getAmazonIconByTheme();
      document.querySelectorAll('img.icone-plataforma[alt="Amazon"], img[data-store="amazon"], img[data-amazon-icon="1"]').forEach(img => {
        try { img.src = src; } catch(_) {}
      });
    };

    // Ouvir mudanças de tema (evento customizado)
    document.addEventListener('themechange', function(){
      try { window.updateAmazonIconsOnTheme(); } catch(_) {}
    });

    // Ajuste inicial após carregamento
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){
        try { window.updateAmazonIconsOnTheme(); } catch(_) {}
      });
    } else {
      try { window.updateAmazonIconsOnTheme(); } catch(_) {}
    }
  } catch(_) {}
})();

// ===== Helper central para consultar /api/auth/me com cache e guarda de unload =====
(function(){
  try {
    // Marcar quando a página estiver sendo descarregada
    try { window.__pageUnloading = false; } catch(_) {}
    try { window.addEventListener('beforeunload', function(){ try { window.__pageUnloading = true; } catch(_) {} }); } catch(_) {}

    const authCache = { value: null, pending: null, ts: 0 };
    const MAX_AGE_MS = 10_000; // 10s de cache leve para evitar chamadas duplicadas

    // Exposta globalmente para reutilização em diferentes módulos
    window.getAuthMe = async function(force) {
      try {
        const unloading = !!window.__pageUnloading;
        const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
        if (unloading || hidden) {
          // Evita iniciar requisição durante unload/aba oculta
          return { success: false, user: null };
        }

        if (!force && authCache.pending) {
          return authCache.pending;
        }

        const freshEnough = authCache.value && (Date.now() - authCache.ts) < MAX_AGE_MS;
        if (!force && freshEnough) {
          return authCache.value;
        }

        const p = (async () => {
          try {
            const resp = await fetch(`${window.API_BASE}/api/auth/me`, { cache: 'no-store', credentials: 'include' });
            if (resp && resp.ok) {
              try {
                const data = await resp.json();
                authCache.value = data;
                authCache.ts = Date.now();
                return data;
              } catch {
                // JSON inválido: tratar como não autenticado
                authCache.value = { success: false, user: null };
                authCache.ts = Date.now();
                return authCache.value;
              }
            }
          } catch (_) {
            // Erros (inclui abort): devolver estado não autenticado sem lançar
            return { success: false, user: null };
          } finally {
            authCache.pending = null;
          }
          return { success: false, user: null };
        })();
        authCache.pending = p;
        return p;
      } catch(_) {
        return { success: false, user: null };
      }
    };
  } catch(_) {}
})();
