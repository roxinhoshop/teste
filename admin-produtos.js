// Administração: Todos os Produtos
(function(){
  // Mapa de categorias e subcategorias (espelhado de js/produtos.js)
  const sistemaCategorias = {
    'Hardware': { subcategorias: ['Processadores', 'Placas de Vídeo', 'Memórias RAM', 'Placas Mãe', 'Fontes', 'Coolers', 'Gabinetes', 'Armazenamento', 'Placas de Som'] },
    'Periféricos': { subcategorias: ['Teclados', 'Mouses', 'Headsets', 'Webcams', 'Microfones', 'Mousepads', 'Controles', 'Caixas de Som', 'Monitores'] },
    'Computadores': { subcategorias: ['PCs Gamer', 'Workstations', 'All-in-One', 'Mini PCs', 'Notebooks', 'Chromebooks', 'Ultrabooks', 'Tablets'] },
    'Games': { subcategorias: ['Consoles', 'Jogos PC', 'Jogos Console', 'Acessórios Gaming', 'Cadeiras Gamer', 'Mesas Gamer', 'Controles', 'Volantes'] },
    'Celular & Smartphone': { subcategorias: ['Smartphones', 'Capas e Películas', 'Carregadores', 'Fones de Ouvido', 'Power Banks', 'Suportes', 'Smartwatches'] },
    'TV & Áudio': { subcategorias: ['Smart TVs', 'TVs 4K', 'TVs 8K', 'Suportes TV', 'Conversores', 'Antenas', 'Soundbars', 'Home Theater'] },
    'Áudio': { subcategorias: ['Fones de Ouvido', 'Caixas de Som', 'Soundbars', 'Amplificadores', 'Microfones', 'Interfaces de Áudio', 'Monitores de Referência'] },
    'Espaço Gamer': { subcategorias: ['Cadeiras Gamer', 'Mesas Gamer', 'Suportes Monitor', 'Iluminação RGB', 'Decoração', 'Organização', 'Tapetes'] },
    'Casa Inteligente': { subcategorias: ['Assistentes Virtuais', 'Câmeras Segurança', 'Lâmpadas Smart', 'Tomadas Smart', 'Sensores', 'Fechaduras Digitais', 'Termostatos'] },
    'Giftcards': { subcategorias: ['Mais populares','Serviços', 'Jogos', 'Xbox', 'Nintendo'] },
  };

  // Estado de paginação
  let listaProdutos = [];
  let paginaAtual = 1;
  const itensPorPagina = 6;
  let totalPaginas = 1;

  let carregado = false;

  function createOption(value, text, selected=false) {
    const o = document.createElement('option');
    o.value = value; o.textContent = text;
    if (selected) o.selected = true; return o;
  }

  function popularSelectCategoria(sel, current) {
    sel.innerHTML = '';
    sel.appendChild(createOption('', 'Selecione...'));
    Object.keys(sistemaCategorias).forEach(cat => {
      sel.appendChild(createOption(cat, cat, String(current||'')===cat));
    });
  }

  function popularSelectSubcategoria(sel, categoria, current) {
    sel.innerHTML = '';
    sel.appendChild(createOption('', 'Selecione...'));
    const grupo = sistemaCategorias[categoria];
    const lista = grupo?.subcategorias || [];
    lista.forEach(sub => sel.appendChild(createOption(sub, sub, String(current||'')===sub)));
  }

  function primeiraImagem(p) {
    let imgs = [];
    if (Array.isArray(p.imagens)) imgs = p.imagens;
    else if (typeof p.imagens === 'string') { try { imgs = JSON.parse(p.imagens); } catch(_){} }
    return Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : '/imagens/thumbs/produto1.webp';
  }

  function criarLinhaProduto(p) {
    const tr = document.createElement('tr');
    // Foto
    const tdFoto = document.createElement('td');
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = primeiraImagem(p);
    img.alt = p.titulo || 'Foto do produto';
    tdFoto.appendChild(img);

    // Nome
    const tdNome = document.createElement('td');
    tdNome.textContent = p.titulo || p.nome || `#${p.id}`;

    // Categoria
    const tdCat = document.createElement('td');
    const selCat = document.createElement('select');
    popularSelectCategoria(selCat, p.categoria);
    tdCat.appendChild(selCat);

    // Subcategoria
    const tdSub = document.createElement('td');
    const selSub = document.createElement('select');
    popularSelectSubcategoria(selSub, selCat.value, p.subcategoria);
    tdSub.appendChild(selSub);

    selCat.addEventListener('change', () => {
      popularSelectSubcategoria(selSub, selCat.value, '');
    });

    // Ações
    const tdAcoes = document.createElement('td');
    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn btn-secundario';
    btnEditar.type = 'button';
    btnEditar.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar';
    btnEditar.addEventListener('click', () => {
      abrirModalProdutoAdm(p);
    });

    const btnSalvar = document.createElement('button');
    btnSalvar.className = 'btn btn-primario';
    btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar';
    btnSalvar.addEventListener('click', async () => {
      const originalHTML = btnSalvar.innerHTML;
      btnSalvar.disabled = true;
      btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
      const payload = { categoria: selCat.value || null, subcategoria: selSub.value || null };
      try {
        const r = await fetch(`/api/products/${p.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        const j = await r.json();
        if (r.ok && j.success) {
          window.sitePopup && window.sitePopup.alert('Categoria atualizada!', 'Sucesso');
          btnSalvar.textContent = 'Salvo';
          setTimeout(() => { btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar'; }, 1200);
        } else {
          throw new Error(j.message || 'Falha ao salvar');
        }
      } catch (e) {
        window.sitePopup && window.sitePopup.alert(e.message || 'Erro ao salvar', 'Erro');
        btnSalvar.innerHTML = originalHTML;
      } finally {
        btnSalvar.disabled = false;
      }
    });

    tdAcoes.appendChild(btnEditar);
    tdAcoes.appendChild(btnSalvar);

    tr.appendChild(tdFoto);
    tr.appendChild(tdNome);
    tr.appendChild(tdCat);
    tr.appendChild(tdSub);
    tr.appendChild(tdAcoes);
    return tr;
  }

  function abrirModalProdutoAdm(p) {
    const modal = document.getElementById('modalEditarProdutoAdm');
    const form = document.getElementById('formEditarProdutoAdm');
    if (!modal || !form) return;
    form.dataset.id = String(p.id);
    const get = (x) => document.getElementById(x);
    const nomeEl = get('admEditNome');
    const descEl = get('admEditDescricao');
    const precoMLEl = get('admEditPrecoML');
    const precoAZEl = get('admEditPrecoAmazon');
    const fotoEl = get('admEditFoto');
    const linkMLEl = get('admEditLinkML');
    const linkAZEl = get('admEditLinkAmazon');
    const catEl = get('admEditCategoria');
    const subEl = get('admEditSubcategoria');
    const statusEl = get('admEditStatus');

    if (nomeEl) nomeEl.value = p.titulo || '';
    if (descEl) descEl.value = p.descricao || '';
    if (fotoEl) fotoEl.value = primeiraImagem(p) || '';
    const precoML = p.precoMercadoLivre !== undefined ? Number(p.precoMercadoLivre) : Number(p.precoML ?? NaN);
    const precoAZ = p.precoAmazon !== undefined ? Number(p.precoAmazon) : Number(p.precoAZ ?? NaN);
    if (precoMLEl) precoMLEl.value = !isNaN(precoML) ? String(precoML) : '';
    if (precoAZEl) precoAZEl.value = !isNaN(precoAZ) ? String(precoAZ) : '';
    if (linkMLEl) linkMLEl.value = p.linkMercadoLivre || '';
    if (linkAZEl) linkAZEl.value = p.linkAmazon || '';
    if (catEl) popularSelectCategoria(catEl, p.categoria);
    if (subEl) popularSelectSubcategoria(subEl, catEl?.value || p.categoria || '', p.subcategoria);
    if (catEl && subEl) {
      catEl.addEventListener('change', () => popularSelectSubcategoria(subEl, catEl.value, ''));
    }
    if (statusEl) statusEl.value = String(p.status || 'ativo').toLowerCase();
    modal.classList.add('visivel');
    modal.setAttribute('aria-hidden','false');
    modal.setAttribute('aria-modal','true');
  }

  async function salvarEdicaoProdutoAdm(e) {
    e.preventDefault();
    const form = document.getElementById('formEditarProdutoAdm');
    if (!form) return;
    const id = form.dataset.id;
    const get = (x) => document.getElementById(x);
    const nome = (get('admEditNome')?.value || '').trim();
    const descricao = (get('admEditDescricao')?.value || '').trim();
    const fotoUrl = (get('admEditFoto')?.value || '').trim();
    const linkMercadoLivre = (get('admEditLinkML')?.value || '').trim();
    const linkAmazon = (get('admEditLinkAmazon')?.value || '').trim();
    const categoria = (get('admEditCategoria')?.value || '').trim();
    const subcategoria = (get('admEditSubcategoria')?.value || '').trim();
    const status = (get('admEditStatus')?.value || '').trim();
    const precoMLRaw = get('admEditPrecoML')?.value;
    const precoAZRaw = get('admEditPrecoAmazon')?.value;
    const precoMercadoLivre = precoMLRaw ? parseFloat(precoMLRaw) : undefined;
    const precoAmazon = precoAZRaw ? parseFloat(precoAZRaw) : undefined;
    const payload = {
      titulo: nome || undefined,
      descricao: descricao || undefined,
      linkMercadoLivre: linkMercadoLivre || undefined,
      linkAmazon: linkAmazon || undefined,
      categoria: categoria || undefined,
      subcategoria: subcategoria || undefined,
      status: status || undefined,
    };
    if (!isNaN(precoMercadoLivre)) payload.precoMercadoLivre = precoMercadoLivre;
    if (!isNaN(precoAmazon)) payload.precoAmazon = precoAmazon;
    // imagens: enviar como JSON string de array contendo a foto
    if (fotoUrl) payload.imagens = JSON.stringify([fotoUrl]);

    const btnSubmit = document.getElementById('admBtnSalvarEdit');
    const originalHTML = btnSubmit ? btnSubmit.innerHTML : '';
    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...'; }
    try {
      const r = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (r.ok && j.success) {
        window.sitePopup && window.sitePopup.alert('Produto atualizado!', 'Sucesso');
        fecharModalProdutoAdm();
        carregado = false;
        await carregarProdutosAdmin();
      } else {
        throw new Error(j.message || 'Falha ao salvar');
      }
    } catch (e) {
      window.sitePopup && window.sitePopup.alert(e.message || 'Erro ao salvar', 'Erro');
    } finally {
      if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = originalHTML || '<i class="fa-solid fa-floppy-disk"></i> Salvar'; }
    }
  }

  function fecharModalProdutoAdm() {
    const modal = document.getElementById('modalEditarProdutoAdm');
    if (modal) {
      modal.classList.remove('visivel');
      modal.setAttribute('aria-hidden','true');
      modal.setAttribute('aria-modal','false');
    }
  }

  function renderTabelaProdutos() {
    const tbody = document.getElementById('tabelaProdutosBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!Array.isArray(listaProdutos) || listaProdutos.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'Nenhum produto encontrado';
      tr.appendChild(td);
      tbody.appendChild(tr);
      const pag = document.getElementById('paginacaoProdutos');
      if (pag) pag.style.display = 'none';
      return;
    }
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const pagina = listaProdutos.slice(inicio, fim);
    pagina.forEach(p => tbody.appendChild(criarLinhaProduto(p)));
  }

  function renderPaginacaoProdutos() {
    const cont = document.getElementById('paginacaoProdutos');
    if (!cont) return;
    cont.innerHTML = '';
    totalPaginas = Math.max(1, Math.ceil((listaProdutos?.length || 0) / itensPorPagina));
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
        renderTabelaProdutos();
        renderPaginacaoProdutos();
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
        renderTabelaProdutos();
        renderPaginacaoProdutos();
      });
      cont.appendChild(b);
    }
    function addEllipsis() {
      const s = document.createElement('span');
      s.className = 'pontos';
      s.textContent = '...';
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
        renderTabelaProdutos();
        renderPaginacaoProdutos();
      }
    });
    cont.appendChild(btnNext);
  }

  async function carregarProdutosAdmin() {
    if (carregado) return; // evita recargas múltiplas
    try {
      const resp = await fetch('/api/products', { credentials: 'include' });
      const json = await resp.json();
      listaProdutos = Array.isArray(json?.data) ? json.data : [];
      paginaAtual = 1;
      totalPaginas = Math.max(1, Math.ceil(listaProdutos.length / itensPorPagina));
      // Removido: contagem acima do dashboard foi retirada do HTML
      // Atualiza cards do dashboard (Admin)
      const cardTotal = document.getElementById('adminCardTotalProdutos');
      const cardAtivos = document.getElementById('adminCardAtivos');
      if (cardTotal) cardTotal.textContent = String(listaProdutos.length);
      if (cardAtivos) {
        // Se o endpoint já retorna apenas ativos, ativos == total
        let ativos = listaProdutos.length;
        try {
          const temStatus = listaProdutos.some(p => typeof p.status === 'string');
          if (temStatus) ativos = listaProdutos.filter(p => String(p.status || '').toLowerCase() === 'ativo').length;
        } catch {}
        cardAtivos.textContent = String(ativos);
      }
      renderTabelaProdutos();
      renderPaginacaoProdutos();

      carregado = true;
    } catch (e) {
      console.error('Erro ao carregar produtos admin:', e);
    }
  }

  function setupAbasAdmin() {
    const btns = Array.from(document.querySelectorAll('.aba-admin'));
    const secVend = document.getElementById('sec-vendedores');
    const secProd = document.getElementById('sec-produtos');
    const secUsuarios = document.getElementById('sec-usuarios');
    btns.forEach(b => {
      b.addEventListener('click', () => {
        btns.forEach(x => x.classList.remove('ativa'));
        b.classList.add('ativa');
        const alvo = b.getAttribute('data-target');
        try {
          localStorage.setItem('admin.activeTab', String(alvo || ''));
          if (alvo) {
            const newUrl = `${window.location.pathname}${window.location.search}${alvo}`;
            window.history.replaceState(null, '', newUrl);
          }
        } catch(_) {}
        if (alvo === '#sec-produtos') {
          secVend && (secVend.style.display = 'none');
          secProd && (secProd.style.display = 'block');
          secUsuarios && (secUsuarios.style.display = 'none');
          carregarProdutosAdmin();
        } else if (alvo === '#sec-usuarios') {
          secVend && (secVend.style.display = 'none');
          secProd && (secProd.style.display = 'none');
          secUsuarios && (secUsuarios.style.display = 'block');
          try { window.carregarUsuariosAdmin && window.carregarUsuariosAdmin(); } catch {}
        } else {
          secProd && (secProd.style.display = 'none');
          secVend && (secVend.style.display = 'block');
          secUsuarios && (secUsuarios.style.display = 'none');
        }
      });
    });

    // Estado inicial: restaurar aba ativa via hash ou localStorage
    let initial = (window.location.hash || '').trim();
    if (initial !== '#sec-produtos' && initial !== '#sec-vendedores' && initial !== '#sec-usuarios') {
      try { initial = localStorage.getItem('admin.activeTab') || ''; } catch(_) {}
    }
    if (initial !== '#sec-produtos' && initial !== '#sec-vendedores' && initial !== '#sec-usuarios') {
      initial = '#sec-vendedores';
    }

    const btnInicial = btns.find(b => b.getAttribute('data-target') === initial) || btns[0];
    if (btnInicial) {
      btns.forEach(x => x.classList.remove('ativa'));
      btnInicial.classList.add('ativa');
      const alvo = btnInicial.getAttribute('data-target');
      if (alvo === '#sec-produtos') {
        secVend && (secVend.style.display = 'none');
        secProd && (secProd.style.display = 'block');
        secUsuarios && (secUsuarios.style.display = 'none');
        carregarProdutosAdmin();
      } else if (alvo === '#sec-usuarios') {
        secVend && (secVend.style.display = 'none');
        secProd && (secProd.style.display = 'none');
        secUsuarios && (secUsuarios.style.display = 'block');
        try { window.carregarUsuariosAdmin && window.carregarUsuariosAdmin(); } catch {}
      } else {
        secProd && (secProd.style.display = 'none');
        secVend && (secVend.style.display = 'block');
        secUsuarios && (secUsuarios.style.display = 'none');
      }
      try {
        localStorage.setItem('admin.activeTab', String(alvo || ''));
        if (alvo) {
          const newUrl = `${window.location.pathname}${window.location.search}${alvo}`;
          window.history.replaceState(null, '', newUrl);
        }
      } catch(_) {}
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupAbasAdmin();
    // Eventos do modal de edição de produto (Admin)
    const form = document.getElementById('formEditarProdutoAdm');
    const fechar = document.getElementById('admFecharModal');
    const cancelar = document.getElementById('admBtnCancelarEdit');
    const salvar = document.getElementById('admBtnSalvarEdit');
    if (form) form.addEventListener('submit', salvarEdicaoProdutoAdm);
    if (fechar) fechar.addEventListener('click', fecharModalProdutoAdm);
    if (cancelar) cancelar.addEventListener('click', fecharModalProdutoAdm);
    if (salvar) salvar.addEventListener('click', salvarEdicaoProdutoAdm);
  });
})();
