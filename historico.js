// Histórico de Produtos Visualizados
(function() {
  const HIST_KEY = 'historico_visualizacoes';
  const listaEl = document.getElementById('listaHistorico');
  const vazioEl = document.getElementById('estadoVazio');

  async function verificarAutenticacao() {
    try {
      const API_BASE = window.API_BASE || window.location.origin;
      const resp = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      if (resp && resp.ok) {
        const data = await resp.json().catch(() => null);
        if (data && data.success && data.user) return true;
      }
    } catch (_) {}
    try { window.sitePopup && window.sitePopup.alert('Faça login para ver seu histórico.', 'Autenticação necessária'); } catch {}
  setTimeout(() => { window.location.href = '/login'; }, 800);
    return false;
  }

  function paraNumero(valor) {
    if (valor === null || valor === undefined) return null;
    const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  function formatarMoeda(valor) {
    const n = paraNumero(valor);
    if (n === null) return 'R$ 0,00';
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  function formatarDataISO(iso) {
    const d = iso ? new Date(iso) : new Date();
    try {
      return d.toLocaleString('pt-BR', { hour12: false });
    } catch (_) {
      return d.toISOString();
    }
  }

  function obterHistorico() {
    try {
      const raw = localStorage.getItem(HIST_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function salvarHistorico(arr) {
    try {
      localStorage.setItem(HIST_KEY, JSON.stringify(arr));
    } catch (_) {}
  }

  async function obterProdutosApi() {
    try {
      const API_BASE = window.API_BASE || window.location.origin;
      const resp = await fetch(`${API_BASE}/api/products`);
      let lista = [];
      if (resp.ok) {
        const json = await resp.json();
        lista = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      }
      return Array.isArray(lista) ? lista : [];
    } catch (_) {
      return [];
    }
  }

  async function limparHistoricoInexistentes() {
    const produtos = await obterProdutosApi();
    const validIds = new Set(produtos.map(p => Number(p.id)));
    const atual = obterHistorico();
    const filtrado = atual.filter(it => validIds.has(Number(it.id)));
    salvarHistorico(filtrado);
    return produtos;
  }

  function removerItem(id) {
    const atual = obterHistorico();
    const filtrado = atual.filter(it => String(it.id) !== String(id));
    salvarHistorico(filtrado);
    renderizar();
  }

  async function renderizar() {
    const produtos = await limparHistoricoInexistentes();
    const mapaProdutos = new Map(produtos.map(p => [String(p.id), p]));

    const historico = obterHistorico()
      .sort((a, b) => new Date(b.visualizadoEm) - new Date(a.visualizadoEm))
      .slice(0, 5);

    const vazio = historico.length === 0;
    if (vazioEl) {
      vazioEl.hidden = !vazio;
      vazioEl.style.display = vazio ? '' : 'none';
    }
    if (!listaEl) return;

    listaEl.setAttribute('aria-busy', 'true');
    if (vazio) {
      listaEl.innerHTML = '';
      try { listaEl.style.display = 'none'; } catch (_) {}
      listaEl.setAttribute('aria-busy', 'false');
      return;
    }
    try { listaEl.style.display = ''; } catch (_) {}

    const itensHTML = historico.map(item => {
      const p = mapaProdutos.get(String(item.id));
  const thumb = (item.imagem || (p && p.imagem)) || '/imagens/thumbs/produto1.webp';
      const nome = (p && (p.titulo || p.nome)) || item.titulo || item.nome || 'Produto';
      const precoML = paraNumero(p && p.precoMercadoLivre);
      const precoAMZ = paraNumero(p && p.precoAmazon);
      const candidatos = [precoML, precoAMZ].filter(v => v !== null && v > 0);
      const menorPreco = candidatos.length ? Math.min(...candidatos) : null;
      const menorPrecoFmt = menorPreco !== null ? formatarMoeda(menorPreco) : '';
      const parcelaFmt = menorPreco !== null ? formatarMoeda(menorPreco / 10) : '';
      const data = formatarDataISO(item.visualizadoEm);
      return `
        <li class="item-historico" data-id="${item.id}">
  <a href="/pagina-produto?id=${item.id}" class="link-item" aria-label="Ver produto ${nome}">
            <img src="${thumb}" alt="${nome}" class="thumb-produto" onerror="this.style.display='none'">
            <div class="detalhes-produto">
              <div class="nome-produto">${nome}</div>
              ${menorPrecoFmt ? `
              <div class="preco-destaque-historico">
                <span class="menor-preco-label">Menor preço</span>
                <div class="preco-principal">${menorPrecoFmt}</div>
                <div class="parcelamento">em até 10x de ${parcelaFmt} sem juros</div>
                <div class="comparar-lojas"><i class="fa-solid fa-up-right-from-square"></i> Comparar lojas</div>
              </div>
              ` : ''}
              <div class="data-visualizacao"><span class="label">Visualizado em:</span><span class="valor">${data}</span></div>
            </div>
          </a>
          <div class="acoes-item">
            <button type="button" class="btn-remover" aria-label="Remover item do histórico" title="Remover">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </li>
      `;
    }).join('');

    listaEl.innerHTML = itensHTML;
    listaEl.setAttribute('aria-busy', 'false');
  }

  // Delegação para remover
  if (listaEl) {
    listaEl.addEventListener('click', function(ev) {
      const btn = ev.target.closest('.btn-remover');
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      const li = btn.closest('.item-historico');
      const id = li?.getAttribute('data-id');
      if (id) removerItem(id);
    });
  }

  // Inicializa
  verificarAutenticacao().then(ok => { if (ok) renderizar(); });
})();
