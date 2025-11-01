// Roteamento amigável: exibe e navega usando URLs sem .html
(function(){
  try {
    // 1) Ao carregar, remover .html do endereço exibido
    document.addEventListener('DOMContentLoaded', function(){
      try {
        const url = new URL(window.location.href);
        if (url.pathname.endsWith('.html')) {
          const cleanPath = url.pathname.replace(/\.html$/, '');
          const target = cleanPath === '' ? '/' : cleanPath;
          history.replaceState({}, '', target + url.search + url.hash);
        }
      } catch {}
    });

    // 2) Atualizar atributos href visuais para remover .html
    document.addEventListener('DOMContentLoaded', function(){
      document.querySelectorAll('a[href$=".html"]').forEach(a => {
        try {
          const href = a.getAttribute('href');
          const url = new URL(href, window.location.origin);
          const clean = url.pathname.replace(/\.html$/, '') + url.search + url.hash;
          a.setAttribute('href', clean);
        } catch {}
      });
    });

    // 3) Interceptar cliques em links com .html e navegar para rota limpa
    document.addEventListener('click', function(e){
      const a = e.target.closest('a[href]');
      if (!a) return;
      try {
        const rawHref = a.getAttribute('href');
        if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;
        const url = new URL(rawHref, window.location.origin);
        if (url.origin !== window.location.origin) return;
        const path = url.pathname;
        if (/\.html$/i.test(path)) {
          if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || a.target === '_blank') return;
          e.preventDefault();
          const clean = path.replace(/\.html$/i, '') + url.search + url.hash;
          window.location.assign(clean);
        }
      } catch {}
    }, true);
  } catch {}
})();
