// Tabela de Vendedores (somente backend)
(function () {
  const EL = {};
  const state = {
    todos: [],
    filtrados: [],
    paginaAtual: 1,
    itensPorPagina: Infinity,
    sort: { campo: 'criadoEm', dir: 'desc' },
    filtros: { texto: '', status: 'todos', atividadeDias: 'todos' },
    readonly: false,
    backend: false
  };

  document.addEventListener('DOMContentLoaded', init);

  // Helpers para autenticação de desenvolvimento (localhost): gerar JWT HS256 com segredo 'devsecret'
  const isLocalHost = () => /^(localhost|127\.0\.0\.1)$/.test(location.hostname || '');
  const base64url = (input) => {
    const bin = (typeof input === 'string') ? input : String.fromCharCode(...new Uint8Array(input));
    return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };
  async function createDevAdminToken() {
    if (!isLocalHost()) return null;
    if (!(window.crypto && crypto.subtle)) return null;
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode('devsecret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const header = { alg: 'HS256', typ: 'JWT' };
      const payload = { id: 1, iat: Math.floor(Date.now() / 1000) };
      const headerEnc = base64url(enc.encode(JSON.stringify(header)));
      const payloadEnc = base64url(enc.encode(JSON.stringify(payload)));
      const toSign = enc.encode(headerEnc + '.' + payloadEnc);
      const sig = await crypto.subtle.sign('HMAC', key, toSign);
      const sigEnc = base64url(sig);
      return headerEnc + '.' + payloadEnc + '.' + sigEnc;
    } catch (_) {
      return null;
    }
  }

  async function init() {
    mapElements();
    bindEvents();
    // Inicia com "Todos" os itens por página para exibir toda a lista
    if (EL.itensPorPagina) { try { EL.itensPorPagina.value = 'todos'; } catch (_) {} }
    await carregarVendedores();
    aplicarFiltrosOrdenacao();
    render();
  }

  function mapElements() {
    EL.busca = document.getElementById('filtroBusca');
    EL.status = document.getElementById('filtroStatus');
    EL.atividade = document.getElementById('filtroAtividade');
    EL.itensPorPagina = document.getElementById('itensPorPagina');
    EL.tbody = document.getElementById('tabelaVendedoresBody');
    EL.paginacao = document.getElementById('paginacao');
    EL.modal = document.getElementById('modalEditar');
    EL.btnFecharModal = document.getElementById('fecharModal');
    EL.btnSalvarEdicao = document.getElementById('salvarEdicao');
    EL.btnCancelarEdicao = document.getElementById('cancelarEdicao');
    EL.editarNome = document.getElementById('editarNome');
    EL.editarNomeLoja = document.getElementById('editarNomeLoja');
    EL.editarCPF = document.getElementById('editarCPF');
    EL.editarStatus = document.getElementById('editarStatus');
    EL.linkDocumento = document.getElementById('linkDocumento');
    // Abas
    EL.tabsStatus = document.querySelector('.tabs-status');
    EL.tabButtons = EL.tabsStatus ? Array.from(EL.tabsStatus.querySelectorAll('.tab-btn')) : [];
    EL.tabCountTodos = document.getElementById('tabCountTodos');
    EL.tabCountPendentes = document.getElementById('tabCountPendentes');
    EL.tabCountAtivos = document.getElementById('tabCountAtivos');
    EL.tabCountInativos = document.getElementById('tabCountInativos');
  }

  function bindEvents() {
    if (EL.busca) EL.busca.addEventListener('input', () => {
      state.filtros.texto = (EL.busca.value || '').trim().toLowerCase();
      state.paginaAtual = 1;
      aplicarFiltrosOrdenacao();
      render();
    });
    if (EL.status) EL.status.addEventListener('change', () => {
      state.filtros.status = EL.status.value;
      state.paginaAtual = 1;
      updateTabsActiveUI();
      aplicarFiltrosOrdenacao();
      render();
    });
    if (EL.atividade) EL.atividade.addEventListener('change', () => {
      state.filtros.atividadeDias = EL.atividade.value; // 'todos' | '7' | '30'
      state.paginaAtual = 1;
      aplicarFiltrosOrdenacao();
      render();
    });
    if (EL.itensPorPagina) EL.itensPorPagina.addEventListener('change', () => {
      const val = EL.itensPorPagina.value;
      if (String(val) === 'todos') {
        state.itensPorPagina = Infinity;
      } else {
        state.itensPorPagina = Math.max(1, Number(val || 10));
      }
      state.paginaAtual = 1;
      render();
    });

    // Sort por cabeçalho
    document.querySelectorAll('.tabela-vendedores thead th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const campo = th.getAttribute('data-sort');
        if (!campo) return;
        if (state.sort.campo === campo) {
          state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort.campo = campo;
          state.sort.dir = 'asc';
        }
        aplicarFiltrosOrdenacao();
        render();
      });
    });

    // Modal
    if (EL.btnFecharModal) EL.btnFecharModal.addEventListener('click', fecharModal);
    if (EL.btnCancelarEdicao) EL.btnCancelarEdicao.addEventListener('click', fecharModal);
    if (EL.btnSalvarEdicao) EL.btnSalvarEdicao.addEventListener('click', salvarEdicaoAtual);

    // Máscara CPF no modal
    if (EL.editarCPF) {
      EL.editarCPF.addEventListener('input', () => {
        const limpo = (EL.editarCPF.value.match(/\d+/g) || []).join('').slice(0, 11);
        EL.editarCPF.value = mascaraCPF(limpo);
      });
    }
    // Abas de status
    if (EL.tabButtons && EL.tabButtons.length) {
      EL.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const s = btn.getAttribute('data-status') || 'todos';
          state.filtros.status = s;
          if (EL.status) { EL.status.value = s; }
          state.paginaAtual = 1;
          updateTabsActiveUI();
          aplicarFiltrosOrdenacao();
          render();
        });
      });
    }
  }

  async function carregarVendedores() {
    const API_BASE = window.API_BASE || window.location.origin;
    const todos = [];
    try {
      const headers = {};
      try {
        const tok = await createDevAdminToken();
        if (tok) headers['Authorization'] = 'Bearer ' + tok;
      } catch (_) {}
      // Vendedores
      const rVend = await fetch(`${API_BASE}/api/vendors`, { credentials: 'include', headers });
      const ctVend = (rVend.headers.get('content-type') || '').toLowerCase();
      const dataVend = ctVend.includes('application/json') ? await rVend.json().catch(() => ({})) : {};
      if (rVend.ok && dataVend && dataVend.success && Array.isArray(dataVend.data)) {
        const arrVend = dataVend.data.map(v => {
          const nome = [v.nome, v.sobrenome].filter(Boolean).join(' ').trim();
          const criadoTs = v.criadoEm ? new Date(v.criadoEm).getTime() : Date.now();
          return {
            tipo: 'vendor',
            id: String(v.id),
            nome: nome || '—',
            cpf: String(v.documento || ''),
            email: String(v.email || ''),
            status: String(v.status || 'ativo'),
            criadoEm: Number(criadoTs),
            nomeLoja: String(v.nomeLoja || ''),
            arquivoDocumento: v.arquivoDocumento || null
          };
        });
        todos.push(...arrVend);
      }

      // Cadastros pendentes
      const rPend = await fetch(`${API_BASE}/api/vendors/pending`, { credentials: 'include', headers });
      const ctPend = (rPend.headers.get('content-type') || '').toLowerCase();
      const dataPend = ctPend.includes('application/json') ? await rPend.json().catch(() => ({})) : {};
      if (rPend.ok && dataPend && dataPend.success && Array.isArray(dataPend.data)) {
        const arrPend = dataPend.data.map(p => {
          const nome = [p.nome, p.sobrenome].filter(Boolean).join(' ').trim();
          const criadoTs = p.criadoEm ? new Date(p.criadoEm).getTime() : (p.criadoEmVendor ? new Date(p.criadoEmVendor).getTime() : Date.now());
          return {
            tipo: 'pendente',
            id: String(p.vendedorId),
            nome: nome || (p.nomeVendedor || '—'),
            cpf: String(p.documento || ''),
            email: String(p.email || ''),
            status: 'pendente',
            criadoEm: Number(criadoTs),
            nomeLoja: String(p.nomeLoja || ''),
            arquivoDocumento: p.arquivoDocumento || null
          };
        });
        todos.push(...arrPend);
      }

      state.todos = todos.sort((a, b) => b.criadoEm - a.criadoEm);
      state.readonly = false;
      state.backend = true;
      updateTabsCounts();
      updateTabsActiveUI();
    } catch (err) {
      console.error('Falha ao carregar vendedores:', err);
      state.todos = [];
      state.readonly = true;
      state.backend = false;
      updateTabsCounts();
      updateTabsActiveUI();
    }
  }

  // MVP local removido: todos os dados são carregados do backend

  function aplicarFiltrosOrdenacao() {
    const txt = state.filtros.texto;
    const st = state.filtros.status;
    const ad = state.filtros.atividadeDias;
    let out = state.todos.slice();

    if (txt) {
      out = out.filter(v =>
        (v.nome || '').toLowerCase().includes(txt) ||
        (v.email || '').toLowerCase().includes(txt) ||
        mascaraCPF(String(v.cpf || '')).includes(txt)
      );
    }
    if (st && st !== 'todos') {
      const status = String(st);
      if (status === 'pendente') {
        out = out.filter(v => v.tipo === 'pendente');
      } else if (status === 'ativo') {
        out = out.filter(v => (v.tipo || 'vendor') === 'vendor' && (v.status || 'ativo') === 'ativo');
      } else if (status === 'inativo') {
        out = out.filter(v => (v.tipo || 'vendor') === 'vendor' && (v.status || '') === 'inativo');
      }
    }
    if (ad && ad !== 'todos') {
      const dias = Number(ad);
      const lim = Date.now() - dias * 86400000;
      out = out.filter(v => Number(v.criadoEm || 0) >= lim);
    }

    // Ordenação
    const { campo, dir } = state.sort;
    out.sort((a, b) => cmp(a[campo], b[campo], dir));

    state.filtrados = out;
  }

  function cmp(a, b, dir) {
    const va = normalizar(a);
    const vb = normalizar(b);
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  }
  function normalizar(v) {
    if (v == null) return '';
    if (typeof v === 'number') return v;
    if (!isNaN(Number(v))) return Number(v);
    return String(v).toLowerCase();
  }

  function render() {
    renderTabela();
    renderPaginacao();
  }

  function updateTabsCounts() {
    const total = state.todos.length;
    const pend = state.todos.filter(v => v.tipo === 'pendente').length;
    const atv = state.todos.filter(v => (v.tipo || 'vendor') === 'vendor' && (v.status || 'ativo') === 'ativo').length;
    const inat = state.todos.filter(v => (v.tipo || 'vendor') === 'vendor' && (v.status || '') === 'inativo').length;
    if (EL.tabCountTodos) EL.tabCountTodos.textContent = String(total);
    if (EL.tabCountPendentes) EL.tabCountPendentes.textContent = String(pend);
    if (EL.tabCountAtivos) EL.tabCountAtivos.textContent = String(atv);
    if (EL.tabCountInativos) EL.tabCountInativos.textContent = String(inat);
  }

  function updateTabsActiveUI() {
    if (!EL.tabButtons || !EL.tabButtons.length) return;
    const cur = state.filtros.status || 'todos';
    EL.tabButtons.forEach(b => {
      const s = b.getAttribute('data-status') || 'todos';
      if (s === cur) b.classList.add('ativa');
      else b.classList.remove('ativa');
    });
  }

  function renderTabela() {
    if (!EL.tbody) return;
    const start = (state.paginaAtual - 1) * state.itensPorPagina;
    const end = start + state.itensPorPagina;
    const page = state.filtrados.slice(start, end);
    EL.tbody.innerHTML = page.map(v => `
      <tr>
        <td>${escapeHTML(v.nome || '—')}</td>
        <td>${escapeHTML(mascaraCPF(String(v.cpf || '')) || '—')}</td>
        <td>${escapeHTML(v.email || '—')}</td>
        <td>${badgeStatus(v.status || 'ativo')}</td>
        <td>${formatarData(v.criadoEm)}</td>
        <td>
          ${state.readonly ? '<span class="muted">—</span>' : `
          <div class="acoes">
            <button class="btn btn-secundario" data-acao="inspecionar" data-id="${encodeURIComponent(v.id)}">
              <i class="fa-solid fa-eye"></i> Inspecionar
            </button>
            <button class="btn btn-secundario" data-acao="editar" data-id="${encodeURIComponent(v.id)}">
              <i class="fa-solid fa-pen"></i> Editar
            </button>
            ${v.tipo === 'pendente'
              ? `
                <button class="btn btn-primario" data-acao="aprovar" data-id="${encodeURIComponent(v.id)}"><i class="fa-solid fa-check"></i> Aprovar</button>
                <button class="btn btn-perigo" data-acao="rejeitar" data-id="${encodeURIComponent(v.id)}"><i class="fa-solid fa-xmark"></i> Rejeitar</button>
              `
              : (v.status === 'inativo'
                  ? `<button class="btn btn-primario" data-acao="ativar" data-id="${encodeURIComponent(v.id)}"><i class="fa-solid fa-toggle-on"></i> Ativar</button>`
                  : `<button class="btn btn-perigo" data-acao="desativar" data-id="${encodeURIComponent(v.id)}"><i class="fa-solid fa-toggle-off"></i> Desativar</button>`
                )
            }
            ${state.backend && (v.tipo || 'vendor') === 'vendor' ? `<button class="btn btn-perigo" data-acao="excluir" data-id="${encodeURIComponent(v.id)}"><i class="fa-solid fa-trash"></i> Excluir</button>` : ''}
          </div>`}
        </td>
      </tr>
    `).join('');

    // Delegação para ações
    if (!state.readonly) {
      EL.tbody.querySelectorAll('button[data-acao]').forEach(btn => {
        btn.addEventListener('click', onAcao);
      });
    }
  }

  function onAcao(e) {
    if (state.readonly) return;
    const btn = e.currentTarget;
    const acao = btn.getAttribute('data-acao');
    const id = decodeURIComponent(btn.getAttribute('data-id') || '');
    const item = state.todos.find(v => v.id === id);
    if (!item) return;
    if (acao === 'editar') abrirModal(item, 'editar');
    else if (acao === 'inspecionar') abrirModal(item, 'inspecionar');
    else if (acao === 'desativar') atualizarStatusAPI(item, 'inativo');
    else if (acao === 'ativar') atualizarStatusAPI(item, 'ativo');
    else if (acao === 'aprovar') atualizarStatusAPI(item, 'ativo');
    else if (acao === 'rejeitar') {
      const confirmar = window.sitePopup
        ? window.sitePopup.confirm('Tem certeza que deseja rejeitar este vendedor?', 'Confirmar')
        : Promise.resolve(window.confirm('Tem certeza que deseja rejeitar este vendedor?'));
      confirmar.then(ok => {
        if (!ok) return;
        atualizarStatusAPI(item, 'inativo');
      });
    }
    else if (acao === 'excluir' && state.backend) excluirVendorAPI(item);
  }

  // Atualização local removida (MVP)

  async function atualizarStatusAPI(item, novo) {
    const API_BASE = window.API_BASE || window.location.origin;
    try {
      const headers = { 'Content-Type': 'application/json' };
      try {
        const tok = await createDevAdminToken();
        if (tok) headers['Authorization'] = 'Bearer ' + tok;
      } catch (_) {}
      const r = await fetch(`${API_BASE}/api/vendors/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: novo })
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data && data.success) {
        await carregarVendedores();
        aplicarFiltrosOrdenacao();
        render();
      } else {
        window.sitePopup && window.sitePopup.alert('Falha ao atualizar status: ' + (data.message || r.status), 'Erro');
      }
    } catch (err) {
      window.sitePopup && window.sitePopup.alert('Erro ao atualizar status. Verifique sua sessão da Loja.', 'Erro');
    }
  }

  // Paginação
  function renderPaginacao() {
    if (!EL.paginacao) return;
    const total = state.filtrados.length;
    const paginas = Math.max(1, Math.ceil(total / state.itensPorPagina));
    const atual = Math.min(state.paginaAtual, paginas);
    state.paginaAtual = atual;

    const mkBtn = (label, page, disabled, ativo) => `<button ${disabled ? 'disabled' : ''} data-p="${page}" class="${ativo ? 'ativo' : ''}">${label}</button>`;

    const parts = [];
    parts.push(mkBtn('«', Math.max(1, atual - 1), atual === 1, false));
    for (let p = 1; p <= paginas; p++) {
      if (p === 1 || p === paginas || Math.abs(p - atual) <= 1) {
        parts.push(mkBtn(String(p), p, false, p === atual));
      } else if (Math.abs(p - atual) === 2) {
        parts.push('<span style="padding:0 4px">…</span>');
      }
    }
    parts.push(mkBtn('»', Math.min(paginas, atual + 1), atual === paginas, false));
    EL.paginacao.innerHTML = parts.join('');
    EL.paginacao.querySelectorAll('button[data-p]').forEach(b => b.addEventListener('click', () => {
      const p = Number(b.getAttribute('data-p')) || 1;
      state.paginaAtual = p;
      render();
    }));
  }

  // Modal edição
  let idEditando = null;
  function abrirModal(item, modo = 'editar') {
    idEditando = item.id;
    const somenteLeitura = modo === 'inspecionar';
    if (EL.editarNome) {
      EL.editarNome.value = item.nome && item.nome !== '—' ? item.nome : '';
      EL.editarNome.disabled = !!somenteLeitura;
    }
    if (EL.editarNomeLoja) {
      EL.editarNomeLoja.value = String(item.nomeLoja || '').trim();
      // Campo informativo: manter desabilitado
      EL.editarNomeLoja.disabled = true;
    }
    if (EL.editarCPF) {
      EL.editarCPF.value = mascaraCPF(String(item.cpf || ''));
      EL.editarCPF.disabled = !!somenteLeitura;
    }
    if (EL.editarStatus) {
      EL.editarStatus.value = item.status || 'ativo';
      EL.editarStatus.disabled = !!somenteLeitura;
    }
    if (EL.linkDocumento) {
      const doc = item.arquivoDocumento;
      if (doc) {
        EL.linkDocumento.href = doc;
        EL.linkDocumento.style.display = '';
        try { EL.linkDocumento.setAttribute('download', 'documento-vendedor'); } catch (_) {}
        EL.linkDocumento.textContent = 'Abrir documento';
      } else {
        EL.linkDocumento.removeAttribute('href');
        EL.linkDocumento.style.display = '';
        EL.linkDocumento.textContent = 'Documento não disponível';
      }
    }
    if (EL.modal) {
      // Atualiza título do modal conforme o modo
      const titulo = EL.modal.querySelector('.modal-cabecalho h3');
      if (titulo) {
        titulo.innerHTML = somenteLeitura
          ? '<i class="fa-solid fa-eye"></i> Inspecionar vendedor'
          : '<i class="fa-solid fa-pen-to-square"></i> Editar vendedor';
      }
      // Exibe/oculta botão salvar em modo leitura
      if (EL.btnSalvarEdicao) EL.btnSalvarEdicao.style.display = somenteLeitura ? 'none' : '';
      EL.modal.classList.add('visivel');
      EL.modal.setAttribute('aria-hidden', 'false');
      EL.modal.setAttribute('aria-modal', 'true');
    }
  }
  function fecharModal() {
    idEditando = null;
    if (EL.modal) {
      EL.modal.classList.remove('visivel');
      EL.modal.setAttribute('aria-hidden', 'true');
      EL.modal.setAttribute('aria-modal', 'false');
    }
  }
  function salvarEdicaoAtual() {
    if (state.readonly) return;
    if (!idEditando) return;
    const nomeExib = (EL.editarNome && EL.editarNome.value || '').trim();
    const cpf = (EL.editarCPF && EL.editarCPF.value || '').replace(/\D+/g, '');
    const status = (EL.editarStatus && EL.editarStatus.value) || 'ativo';
    salvarEdicaoAPI(idEditando, { nomeExib, cpf, status });
  }

  async function salvarEdicaoAPI(id, { nomeExib, cpf, status }) {
    const API_BASE = window.API_BASE || window.location.origin;
    try {
      // Quebra nome exibido em nome/sobrenome para a tabela usuario
      let nome = undefined, sobrenome = undefined;
      if (nomeExib) {
        const parts = nomeExib.split(/\s+/);
        nome = parts.shift() || '';
        sobrenome = parts.length ? parts.join(' ') : '';
      }
      const payload = {
        status,
        documento: cpf || undefined,
        nome,
        sobrenome
      };
      const headers = { 'Content-Type': 'application/json' };
      try {
        const tok = await createDevAdminToken();
        if (tok) headers['Authorization'] = 'Bearer ' + tok;
      } catch (_) {}
      const r = await fetch(`${API_BASE}/api/vendors/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data && data.success) {
        fecharModal();
        await carregarVendedores();
        aplicarFiltrosOrdenacao();
        render();
      } else {
        window.sitePopup && window.sitePopup.alert('Falha ao salvar edição: ' + (data.message || r.status), 'Erro');
      }
    } catch (err) {
      window.sitePopup && window.sitePopup.alert('Erro ao salvar edição. Verifique sua sessão da Loja.', 'Erro');
    }
  }

  async function excluirVendorAPI(item) {
    const API_BASE = window.API_BASE || window.location.origin;
    const confirmar = window.sitePopup
      ? window.sitePopup.confirm('Tem certeza que deseja excluir este vendedor?', 'Confirmar')
      : Promise.resolve(window.confirm('Tem certeza que deseja excluir este vendedor?'));
    const ok = await confirmar;
    if (!ok) return;
    try {
      const headers = {};
      try {
        const tok = await createDevAdminToken();
        if (tok) headers['Authorization'] = 'Bearer ' + tok;
      } catch (_) {}
      const r = await fetch(`${API_BASE}/api/vendors/${encodeURIComponent(item.id)}?hard=false`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data && data.success) {
        await carregarVendedores();
        aplicarFiltrosOrdenacao();
        render();
      } else {
        window.sitePopup && window.sitePopup.alert('Falha ao excluir vendedor: ' + (data.message || r.status), 'Erro');
      }
    } catch (err) {
      window.sitePopup && window.sitePopup.alert('Erro ao excluir vendedor. Verifique sua sessão da Loja.', 'Erro');
    }
  }

  // Removidos utilitários de MVP local (obterExtras/salvarExtras)

  // Utils
  function mascaraCPF(v) {
    const s = String(v || '').replace(/\D+/g, '').slice(0, 11);
    if (s.length <= 3) return s;
    if (s.length <= 6) return `${s.slice(0,3)}.${s.slice(3)}`;
    if (s.length <= 9) return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6)}`;
    return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9,11)}`;
  }
  function formatarData(ts) {
    const d = new Date(Number(ts || Date.now()));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function badgeStatus(status) {
    const st = (status || 'ativo');
    const cls = st === 'inativo' ? 'status-inativo' : (st === 'pendente' ? 'status-pendente' : 'status-ativo');
    const icon = st === 'inativo' ? 'fa-toggle-off' : (st === 'pendente' ? 'fa-hourglass-half' : 'fa-toggle-on');
    const txt = st === 'inativo' ? 'Inativo' : (st === 'pendente' ? 'Pendente' : 'Ativo');
    return `<span class="status-badge ${cls}"><i class="fa-solid ${icon}"></i>${txt}</span>`;
  }
  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
