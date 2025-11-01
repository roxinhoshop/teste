// Administração: Usuários
(function(){
  let listaUsuarios = [];
  let paginaAtual = 1;
  const itensPorPagina = 10;
  let totalPaginas = 1;
  let usuarioEmEdicaoId = null;

  function criarLinhaUsuario(u) {
    const tr = document.createElement('tr');
    const tdId = document.createElement('td'); tdId.textContent = String(u.id);
    const tdNome = document.createElement('td'); tdNome.textContent = `${u.nome || ''}${u.sobrenome ? ' ' + u.sobrenome : ''}`.trim();
    const tdEmail = document.createElement('td'); tdEmail.textContent = u.email || '—';
    const tdRole = document.createElement('td'); tdRole.textContent = String(u.role || 'cliente');
    const tdAcoes = document.createElement('td');
    tdAcoes.style.whiteSpace = 'nowrap';
    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn btn-secundario';
    btnEditar.textContent = 'Editar';
    btnEditar.addEventListener('click', () => abrirModalEdicaoUsuario(u));
    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-perigo';
    btnExcluir.style.marginLeft = '8px';
    btnExcluir.textContent = 'Excluir';
    btnExcluir.addEventListener('click', () => confirmarExcluirUsuario(u));
    tdAcoes.appendChild(btnEditar);
    tdAcoes.appendChild(btnExcluir);
    tr.appendChild(tdId);
    tr.appendChild(tdNome);
    tr.appendChild(tdEmail);
    tr.appendChild(tdRole);
    tr.appendChild(tdAcoes);
    return tr;
  }

  function renderTabelaUsuarios() {
    const tbody = document.getElementById('tabelaUsuariosBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!Array.isArray(listaUsuarios) || listaUsuarios.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5; td.textContent = 'Nenhum usuário encontrado';
      tr.appendChild(td); tbody.appendChild(tr);
      const pag = document.getElementById('paginacaoUsuarios');
      if (pag) pag.style.display = 'none';
      return;
    }
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const pagina = listaUsuarios.slice(inicio, fim);
    pagina.forEach(u => tbody.appendChild(criarLinhaUsuario(u)));
  }

  function renderPaginacaoUsuarios() {
    const cont = document.getElementById('paginacaoUsuarios');
    if (!cont) return;
    cont.innerHTML = '';
    totalPaginas = Math.max(1, Math.ceil((listaUsuarios?.length || 0) / itensPorPagina));
    if (totalPaginas <= 1) { cont.style.display = 'none'; return; }
    cont.style.display = 'flex';

    const info = document.createElement('span');
    info.className = 'info-pagina';
    info.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    cont.appendChild(info);

    const btnPrev = document.createElement('button');
    btnPrev.className = 'btn btn-secundario';
    btnPrev.textContent = '‹ Anterior';
    btnPrev.disabled = paginaAtual === 1;
    btnPrev.addEventListener('click', () => {
      if (paginaAtual > 1) {
        paginaAtual -= 1;
        renderTabelaUsuarios();
        renderPaginacaoUsuarios();
      }
    });
    cont.appendChild(btnPrev);

    function addPageButton(p) {
      const b = document.createElement('button');
      b.className = 'btn ' + (p === paginaAtual ? 'btn-primario' : 'btn-secundario');
      b.textContent = String(p);
      b.disabled = p === paginaAtual;
      b.addEventListener('click', () => {
        paginaAtual = p;
        renderTabelaUsuarios();
        renderPaginacaoUsuarios();
      });
      cont.appendChild(b);
    }
    function addEllipsis() {
      const s = document.createElement('span');
      s.className = 'pontos'; s.textContent = '...';
      cont.appendChild(s);
    }

    const start = Math.max(1, paginaAtual - 2);
    const end = Math.min(totalPaginas, paginaAtual + 2);
    if (start > 1) { addPageButton(1); if (start > 2) addEllipsis(); }
    for (let p = start; p <= end; p++) addPageButton(p);
    if (end < totalPaginas) { if (end < totalPaginas - 1) addEllipsis(); addPageButton(totalPaginas); }

    const btnNext = document.createElement('button');
    btnNext.className = 'btn btn-secundario';
    btnNext.textContent = 'Próxima ›';
    btnNext.disabled = paginaAtual === totalPaginas;
    btnNext.addEventListener('click', () => {
      if (paginaAtual < totalPaginas) {
        paginaAtual += 1;
        renderTabelaUsuarios();
        renderPaginacaoUsuarios();
      }
    });
    cont.appendChild(btnNext);
  }

  async function carregarUsuariosAdmin() {
    try {
      const resp = await fetch('/api/users', { credentials: 'include' });
      const json = await resp.json();
      if (!resp.ok || !json?.success) {
        throw new Error(json?.message || 'Falha ao carregar usuários');
      }
      listaUsuarios = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      paginaAtual = 1;
      totalPaginas = Math.max(1, Math.ceil(listaUsuarios.length / itensPorPagina));
      renderTabelaUsuarios();
      renderPaginacaoUsuarios();
    } catch (e) {
      console.warn('Erro ao carregar usuários:', e);
      const tbody = document.getElementById('tabelaUsuariosBody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar usuários ou acesso restrito.</td></tr>';
      }
      const pag = document.getElementById('paginacaoUsuarios');
      if (pag) pag.style.display = 'none';
    }
  }

  // ===== Modal de edição de usuário =====
  function abrirModalEdicaoUsuario(u) {
    usuarioEmEdicaoId = u.id;
    const modal = document.getElementById('modalEditarUsuario');
    if (!modal) return;
    const nome = document.getElementById('editarUsuarioNome');
    const sobrenome = document.getElementById('editarUsuarioSobrenome');
    const email = document.getElementById('editarUsuarioEmail');
    const role = document.getElementById('editarUsuarioRole');
    if (nome) nome.value = u.nome || '';
    if (sobrenome) sobrenome.value = u.sobrenome || '';
    if (email) email.value = u.email || '';
    if (role) role.value = (u.role || 'cliente').toLowerCase();
    modal.classList.add('visivel');
    modal.setAttribute('aria-hidden', 'false');
    modal.setAttribute('aria-modal', 'true');
  }

  async function salvarEdicaoUsuario() {
    if (!usuarioEmEdicaoId) return;
    const nome = document.getElementById('editarUsuarioNome')?.value || '';
    const sobrenome = document.getElementById('editarUsuarioSobrenome')?.value || '';
    const email = document.getElementById('editarUsuarioEmail')?.value || '';
    const role = document.getElementById('editarUsuarioRole')?.value || '';
    try {
      const resp = await fetch(`/api/users/${usuarioEmEdicaoId}` , {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nome, sobrenome, email, role })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.success) {
        throw new Error(json?.message || 'Falha ao salvar alterações');
      }
      fecharModalEdicaoUsuario();
      await carregarUsuariosAdmin();
    } catch (e) {
      alert('Erro ao salvar usuário: ' + (e?.message || e));
    }
  }

  function fecharModalEdicaoUsuario() {
    const modal = document.getElementById('modalEditarUsuario');
    if (modal) {
      modal.classList.remove('visivel');
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('aria-modal', 'false');
    }
    usuarioEmEdicaoId = null;
  }

  async function confirmarExcluirUsuario(u) {
    if (!u?.id) return;
    const ok = confirm(`Excluir usuário #${u.id} (${u.email})?`);
    if (!ok) return;
    try {
      const resp = await fetch(`/api/users/${u.id}`, { method: 'DELETE', credentials: 'include' });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.success) {
        throw new Error(json?.message || 'Falha ao excluir usuário');
      }
      await carregarUsuariosAdmin();
    } catch (e) {
      alert('Erro ao excluir usuário: ' + (e?.message || e));
    }
  }

  // Bind botões do modal
  document.addEventListener('DOMContentLoaded', () => {
    const btnFechar = document.getElementById('fecharModalUsuario');
    const btnCancelar = document.getElementById('cancelarEdicaoUsuario');
    const btnSalvar = document.getElementById('salvarEdicaoUsuario');
    if (btnFechar) btnFechar.addEventListener('click', fecharModalEdicaoUsuario);
    if (btnCancelar) btnCancelar.addEventListener('click', fecharModalEdicaoUsuario);
    if (btnSalvar) btnSalvar.addEventListener('click', salvarEdicaoUsuario);
  });

  // Expor para controle de abas
  window.carregarUsuariosAdmin = carregarUsuariosAdmin;
})();
