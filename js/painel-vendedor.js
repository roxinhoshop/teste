// Painel do Vendedor - JS de abas, tabela de vendedores e MVP local de produtos

(function () {
  const STORAGE_KEYS = {
    historico: 'vendor:historico',
    config: 'vendor:config',
    vendedores: 'vendor:vendedores',
  };
  let vendorProdutos = []
  // Paginação de produtos do vendedor
  let vendorPaginaAtual = 1
  let vendorItensPorPagina = (() => {
    try {
      const v = parseInt(localStorage.getItem('vendor:produtos:perPage') || '6', 10)
      return isNaN(v) || v < 1 ? 6 : v
    } catch { return 6 }
  })()
  let vendorTotalPaginas = 1

  // Mapa de categorias e subcategorias (espelhado de js/produtos.js)
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

  function getJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function logHistorico(msg) {
    const historico = getJSON(STORAGE_KEYS.historico, []);
    historico.unshift({ msg, at: new Date().toISOString() });
    setJSON(STORAGE_KEYS.historico, historico.slice(0, 200));
    renderHistorico();
  }

  function formatBRL(n) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0));
  }

  // Abas
  function initAbas() {
    const botoes = document.querySelectorAll('.abas .aba');
    const conteudos = document.querySelectorAll('.conteudo-aba');

    const setAba = (alvoSel) => {
      const btn = Array.from(botoes).find(b => b.dataset.alvo === alvoSel);
      const alvo = document.querySelector(alvoSel);
      if (!btn || !alvo) return;
      botoes.forEach(b => b.classList.remove('ativa'));
      conteudos.forEach(c => c.classList.remove('visivel'));
      btn.classList.add('ativa');
      alvo.classList.add('visivel');
      try {
        localStorage.setItem('vendor:abaAtiva', alvoSel);
        // Atualiza a URL sem provocar scroll
        const newUrl = `${window.location.pathname}${window.location.search}${alvoSel}`;
        window.history.replaceState(null, '', newUrl);
      } catch {}
    };

    // Restaurar aba ativa (hash > localStorage > default existente)
    const hash = window.location.hash;
    const salva = (() => { try { return localStorage.getItem('vendor:abaAtiva'); } catch { return null; } })();
    const alvoInicial = (hash && Array.from(botoes).some(b => b.dataset.alvo === hash))
      ? hash
      : (salva && Array.from(botoes).some(b => b.dataset.alvo === salva))
        ? salva
        : null;
    if (alvoInicial) setAba(alvoInicial);

    botoes.forEach(btn => {
      btn.addEventListener('click', () => setAba(btn.dataset.alvo));
    });
  }

  // Dashboard stats dummy a partir do estoque
  function updateStats() {
    const produtos = Array.isArray(vendorProdutos) ? vendorProdutos : [];
    const total = produtos.length;
    const ativos = produtos.filter(p => String(p.status || '').toLowerCase() !== 'inativo').length;
    const vendas = getJSON('vendor:falso:vendas30', 0);
    const aguardando = produtos.filter(p => String(p.status || '').toLowerCase() === 'aguardando').length;
    const ids = {
      total: 'stat-total-produtos',
      ativos: 'stat-produtos-ativos',
      vendas: 'stat-vendas',
      aguardando: 'stat-aguardando',
    };
    const el = id => document.getElementById(id);
    if (el(ids.total)) el(ids.total).textContent = total;
    if (el(ids.ativos)) el(ids.ativos).textContent = ativos;
    if (el(ids.vendas)) el(ids.vendas).textContent = vendas;
    if (el(ids.aguardando)) el(ids.aguardando).textContent = aguardando;
  }

  async function refreshProdutos() {
    try {
      const r = await fetch('/api/vendors/products/me', { credentials: 'include' })
      const data = await r.json()
      vendorProdutos = (data && data.success && Array.isArray(data.data)) ? data.data : []
      if (!data || !data.success) {
        mostrarToast(data?.message || 'Não autorizado. Faça login como vendedor.', 'error')
      }
      vendorPaginaAtual = 1
      vendorTotalPaginas = Math.max(1, Math.ceil((vendorProdutos?.length || 0) / vendorItensPorPagina))
      renderProdutos()
      renderPaginacaoProdutosVend()
      updateStats()
    } catch (e) {
      console.warn('Falha ao obter produtos do vendedor:', e)
      mostrarToast('Erro ao obter produtos do vendedor.', 'error')
    }
  }

  function initProdutos() {
    const form = document.getElementById('formProduto');
    const tbody = document.getElementById('tbodyProdutos');
    const btnLimpar = document.getElementById('btnLimparForm');
    if (!form || !tbody) return;

    // Inicializar selects de Categoria/Subcategoria
    initCategoriaSubcategoria();
    // Inicializar controle de Itens por página
    initItensPorPaginaProdutos();

    // Formatação de preço (preview em BRL nos inputs de preço)
    const precoMLEl = document.getElementById('produtoPrecoML');
    const precoAZEl = document.getElementById('produtoPrecoAmazon');
    const fmtMLEl = document.getElementById('precoMLFormatado');
    const fmtAZEl = document.getElementById('precoAmazonFormatado');
    const updateFmt = (el, out) => {
      if (!el || !out) return;
      const val = parseFloat(el.value);
      out.textContent = !isNaN(val) ? formatBRL(val) : '';
    };
    ['input','change','blur'].forEach(ev => {
      if (precoMLEl && fmtMLEl) precoMLEl.addEventListener(ev, () => updateFmt(precoMLEl, fmtMLEl));
      if (precoAZEl && fmtAZEl) precoAZEl.addEventListener(ev, () => updateFmt(precoAZEl, fmtAZEl));
    });
    // Atualizar previews iniciais se houver valores preenchidos
    updateFmt(precoMLEl, fmtMLEl);
    updateFmt(precoAZEl, fmtAZEl);

    form.addEventListener('reset', () => {
      if (fmtMLEl) fmtMLEl.textContent = '';
      if (fmtAZEl) fmtAZEl.textContent = '';
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btnSubmit = form.querySelector('button[type="submit"]');
      const originalHTML = btnSubmit ? btnSubmit.innerHTML : '';
      if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adicionando...'; }
      const nome = document.getElementById('produtoNome').value.trim();
      const descricao = (document.getElementById('produtoDescricao')?.value || '').trim();
      const precoML = parseFloat(document.getElementById('produtoPrecoML').value);
      const precoAZRaw = document.getElementById('produtoPrecoAmazon')?.value;
      const precoAZ = precoAZRaw !== undefined && precoAZRaw !== '' ? parseFloat(precoAZRaw) : NaN;
      const fotoUrl = (document.getElementById('produtoFoto')?.value || '').trim();
      const linkML = (document.getElementById('produtoLinkML')?.value || '').trim();
      const linkAmazon = (document.getElementById('produtoLinkAmazon')?.value || '').trim();
      const categoria = (document.getElementById('produtoCategoria')?.value || '').trim();
      const subcategoria = (document.getElementById('produtoSubcategoria')?.value || '').trim();
      if (!nome || isNaN(precoML)) { if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = originalHTML; } return; }
      try {
        const r = await fetch('/api/vendors/products/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            nome,
            descricao,
            fotoUrl,
            linkMercadoLivre: linkML,
            linkAmazon,
            categoria,
            subcategoria,
            precoMercadoLivre: precoML,
            precoAmazon: isNaN(precoAZ) ? undefined : precoAZ
          })
        })
        const data = await r.json()
        if (data && data.success) {
          logHistorico(`Produto importado: ${nome}`)
          mostrarToast('Produto adicionado com sucesso.', 'success')
          form.reset()
          await refreshProdutos()
          if (btnSubmit) {
            btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Adicionado';
            setTimeout(() => { btnSubmit.innerHTML = originalHTML; }, 1200);
          }
        } else {
          logHistorico('Falha ao importar produto')
          mostrarToast(data?.message || 'Falha ao adicionar produto.', 'error')
          if (btnSubmit) btnSubmit.innerHTML = originalHTML;
        }
      } catch (e) {
        console.warn('Erro ao importar produto:', e)
        logHistorico('Erro ao importar produto')
        mostrarToast('Erro ao adicionar produto.', 'error')
        if (btnSubmit) btnSubmit.innerHTML = originalHTML;
      } finally {
        if (btnSubmit) btnSubmit.disabled = false;
      }
    });

    btnLimpar?.addEventListener('click', () => form.reset());
    refreshProdutos();
  }

  function initItensPorPaginaProdutos() {
    const sel = document.getElementById('prodItensPorPagina')
    if (!sel) return
    try { sel.value = String(vendorItensPorPagina) } catch {}
    sel.addEventListener('change', () => {
      const val = parseInt(sel.value, 10)
      vendorItensPorPagina = isNaN(val) || val < 1 ? 6 : val
      try { localStorage.setItem('vendor:produtos:perPage', String(vendorItensPorPagina)) } catch {}
      vendorPaginaAtual = 1
      vendorTotalPaginas = Math.max(1, Math.ceil((vendorProdutos?.length || 0) / vendorItensPorPagina))
      renderProdutos()
      renderPaginacaoProdutosVend()
    })
  }

  function initCategoriaSubcategoria() {
    const catSel = document.getElementById('produtoCategoria');
    const subSel = document.getElementById('produtoSubcategoria');
    if (!catSel || !subSel) return;
    const categorias = Object.keys(sistemaCategorias);
    catSel.innerHTML = ['<option value="">Selecione...</option>', ...categorias.map(c => `<option value="${c}">${c}</option>`)].join('');
    const atualizarSubcategorias = () => {
      const cat = catSel.value;
      const subs = cat ? (sistemaCategorias[cat]?.subcategorias || []) : [];
      subSel.innerHTML = ['<option value="">Selecione...</option>', ...subs.map(s => `<option value="${s}">${s}</option>`)].join('');
    };
    catSel.addEventListener('change', atualizarSubcategorias);
    atualizarSubcategorias();
  }

  function renderProdutos() {
    const tbody = document.getElementById('tbodyProdutos');
    if (!tbody) return;
    const produtos = Array.isArray(vendorProdutos) ? vendorProdutos : [];
    if (!produtos.length) {
      tbody.innerHTML = '<tr><td colspan="5">Nenhum produto encontrado</td></tr>'
      const cont = document.getElementById('paginacaoProdutosVend')
      if (cont) cont.style.display = 'none'
      return
    }
    const inicio = (vendorPaginaAtual - 1) * vendorItensPorPagina
    const fim = inicio + vendorItensPorPagina
    const pagina = produtos.slice(inicio, fim)
    tbody.innerHTML = pagina.map(p => {
      let img = ''
      try {
        const arr = JSON.parse(p.imagens || '[]')
        img = Array.isArray(arr) && arr.length ? arr[0] : ''
      } catch { img = '' }
      const precoML = p.precoMercadoLivre !== undefined ? Number(p.precoMercadoLivre) : Number(p.precoML ?? 0)
      const precoAZ = p.precoAmazon !== undefined ? Number(p.precoAmazon) : Number(p.precoAZ ?? 0)
      const preco = Number(!isNaN(precoML) && precoML > 0 ? precoML : (!isNaN(precoAZ) && precoAZ > 0 ? precoAZ : 0))
      const statusLower = String(p.status || '').toLowerCase()
      const statusClass = statusLower === 'ativo' ? 'ativo' : 'inativo'
      const toggleText = statusLower === 'ativo' ? 'Desativar' : 'Ativar'
      return `
      <tr data-id="${p.id}">
        <td>${img ? `<img src="${img}" alt="${p.titulo || ''}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;"/>` : ''}</td>
        <td class="col-nome">${p.titulo || ''}</td>
        <td class="col-preco">${formatBRL(preco)}</td>
        <td><span class="badge ${statusClass}">${p.status || 'inativo'}</span></td>
        <td class="acoes">
          <button class="btn editar" data-acao="editar"><i class="fa-solid fa-pen"></i> Editar</button>
          <button class="btn desativar" data-acao="toggle"><i class="fa-solid fa-power-off"></i> ${toggleText}</button>
        </td>
      </tr>
      <tr class="detalhes-produto" data-id="${p.id}">
        <td colspan="5">
          <div class="conteudo">
            <span class="preco">Preço ML: ${precoML > 0 ? formatBRL(precoML) : '—'}</span>
            <span class="preco">Preço Amazon: ${precoAZ > 0 ? formatBRL(precoAZ) : '—'}</span>
            <div class="acoes">
              <button class="btn desativar" data-acao="excluir"><i class="fa-solid fa-trash"></i> Excluir</button>
            </div>
          </div>
        </td>
      </tr>`
    }).join('');
    tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', onAcaoProduto));
    // Interatividade: clique na linha alterna exibição dos detalhes
    tbody.querySelectorAll('tr[data-id]').forEach(row => {
      row.addEventListener('click', (ev) => {
        // Evitar conflito quando clicar nos botões de ação
        if (ev.target.closest('button')) return;
        const id = row.getAttribute('data-id');
        const detalhes = tbody.querySelector(`tr.detalhes-produto[data-id="${id}"]`);
        if (detalhes) detalhes.classList.toggle('aberto');
      });
    });
  }

  function renderPaginacaoProdutosVend() {
    const cont = document.getElementById('paginacaoProdutosVend')
    if (!cont) return
    cont.innerHTML = ''
    vendorTotalPaginas = Math.max(1, Math.ceil((vendorProdutos?.length || 0) / vendorItensPorPagina))
    if (vendorTotalPaginas <= 1) { cont.style.display = 'none'; return }
    cont.style.display = 'flex'

    const info = document.createElement('span')
    info.className = 'info-pagina'
    info.textContent = `Página ${vendorPaginaAtual} de ${vendorTotalPaginas}`
    cont.appendChild(info)

    const mkBtn = (label, onClick, disabled, ativo) => {
      const b = document.createElement('button')
      b.textContent = label
      b.disabled = !!disabled
      b.className = ativo ? 'ativo' : ''
      b.addEventListener('click', onClick)
      return b
    }

    const prev = mkBtn('‹ Anterior', () => {
      if (vendorPaginaAtual > 1) {
        vendorPaginaAtual -= 1
        renderProdutos()
        renderPaginacaoProdutosVend()
      }
    }, vendorPaginaAtual === 1, false)
    cont.appendChild(prev)

    const start = Math.max(1, vendorPaginaAtual - 2)
    const end = Math.min(vendorTotalPaginas, vendorPaginaAtual + 2)
    if (start > 1) cont.appendChild(mkBtn('1', () => { vendorPaginaAtual = 1; renderProdutos(); renderPaginacaoProdutosVend() }, false, false))
    if (start > 2) { const el = document.createElement('span'); el.textContent = '...'; cont.appendChild(el) }
    for (let p = start; p <= end; p++) {
      cont.appendChild(mkBtn(String(p), () => { vendorPaginaAtual = p; renderProdutos(); renderPaginacaoProdutosVend() }, false, p === vendorPaginaAtual))
    }
    if (end < vendorTotalPaginas - 1) { const el = document.createElement('span'); el.textContent = '...'; cont.appendChild(el) }
    if (end < vendorTotalPaginas) cont.appendChild(mkBtn(String(vendorTotalPaginas), () => { vendorPaginaAtual = vendorTotalPaginas; renderProdutos(); renderPaginacaoProdutosVend() }, false, false))

    const next = mkBtn('Próxima ›', () => {
      if (vendorPaginaAtual < vendorTotalPaginas) {
        vendorPaginaAtual += 1
        renderProdutos()
        renderPaginacaoProdutosVend()
      }
    }, vendorPaginaAtual === vendorTotalPaginas, false)
    cont.appendChild(next)
  }

  function onAcaoProduto(e) {
    const btn = e.currentTarget;
    const acao = btn.dataset.acao;
    const id = btn.closest('tr')?.dataset.id;
    if (!id) return;
    const idx = vendorProdutos.findIndex(p => String(p.id) === String(id));
    if (idx === -1) return;
    const atual = vendorProdutos[idx]
    if (acao === 'toggle') {
      const novo = String(atual.status || '').toLowerCase() === 'ativo' ? 'inativo' : 'ativo'
      ;(async () => {
        try {
          const r = await fetch(`/api/vendors/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: novo })
          })
          const data = await r.json()
          if (data && data.success) {
            logHistorico(`Produto ${novo === 'ativo' ? 'ativado' : 'desativado'}: ${atual.titulo || ''}`)
            mostrarToast(`Produto ${novo === 'ativo' ? 'ativado' : 'desativado'} com sucesso.`, 'success')
            await refreshProdutos()
          } else {
            logHistorico('Falha ao atualizar status do produto')
            mostrarToast(data?.message || 'Falha ao atualizar status do produto.', 'error')
          }
        } catch (e) {
          console.warn('Erro ao atualizar produto:', e)
          logHistorico('Erro ao atualizar status do produto')
          mostrarToast('Erro ao atualizar status do produto.', 'error')
        }
      })()
    }
    if (acao === 'editar') {
      const modal = document.getElementById('modalEditarProduto');
      const form = document.getElementById('formEditarProdutoVend');
      if (modal && form) {
        // Prefill campos do formulário inline
        form.dataset.id = String(id);
        const get = (x) => document.getElementById(x);
        const nomeEl = get('editProdutoNome');
        const descEl = get('editProdutoDescricao');
        const precoMLEl = get('editProdutoPrecoML');
        const precoAZEl = get('editProdutoPrecoAmazon');
        const fmtMLEl = get('editPrecoMLFormatado');
        const fmtAZEl = get('editPrecoAmazonFormatado');
        const fotoEl = get('editProdutoFoto');
        const linkMLEl = get('editProdutoLinkML');
        const linkAZEl = get('editProdutoLinkAmazon');
        const catEl = get('editProdutoCategoria');
        const subEl = get('editProdutoSubcategoria');
        const statusEl = get('editProdutoStatus');

        if (nomeEl) nomeEl.value = atual.titulo || '';
        if (descEl) descEl.value = atual.descricao || '';
        let img = '';
        try {
          const arr = JSON.parse(atual.imagens || '[]');
          img = Array.isArray(arr) && arr.length ? arr[0] : '';
        } catch { img = ''; }
        if (fotoEl) fotoEl.value = img || '';

        const precoML = atual.precoMercadoLivre !== undefined ? Number(atual.precoMercadoLivre) : Number(atual.precoML ?? NaN);
        const precoAZ = atual.precoAmazon !== undefined ? Number(atual.precoAmazon) : Number(atual.precoAZ ?? NaN);
        if (precoMLEl) precoMLEl.value = !isNaN(precoML) ? String(precoML) : '';
        if (precoAZEl) precoAZEl.value = !isNaN(precoAZ) ? String(precoAZ) : '';
        const updateFmt = (el, out) => { if (!el || !out) return; const val = parseFloat(el.value); out.textContent = !isNaN(val) ? formatBRL(val) : ''; };
        updateFmt(precoMLEl, fmtMLEl);
        updateFmt(precoAZEl, fmtAZEl);
        ['input','change','blur'].forEach(ev => {
          if (precoMLEl && fmtMLEl) precoMLEl.addEventListener(ev, () => updateFmt(precoMLEl, fmtMLEl));
          if (precoAZEl && fmtAZEl) precoAZEl.addEventListener(ev, () => updateFmt(precoAZEl, fmtAZEl));
        });

        if (linkMLEl) linkMLEl.value = atual.linkMercadoLivre || atual.linkML || '';
        if (linkAZEl) linkAZEl.value = atual.linkAmazon || '';

        // Popular selects de categoria/subcategoria
        if (catEl) {
          const categorias = Object.keys(sistemaCategorias);
          catEl.innerHTML = ['<option value="">Selecione...</option>', ...categorias.map(c => `<option value="${c}">${c}</option>`)].join('');
          catEl.value = atual.categoria || '';
        }
        if (subEl) {
          const cat = (catEl?.value || atual.categoria || '');
          const subs = cat ? (sistemaCategorias[cat]?.subcategorias || []) : [];
          subEl.innerHTML = ['<option value="">Selecione...</option>', ...subs.map(s => `<option value="${s}">${s}</option>`)].join('');
          subEl.value = atual.subcategoria || '';
        }
        catEl?.addEventListener('change', () => {
          const cat = catEl.value;
          const subs = cat ? (sistemaCategorias[cat]?.subcategorias || []) : [];
          subEl.innerHTML = ['<option value="">Selecione...</option>', ...subs.map(s => `<option value="${s}">${s}</option>`)].join('');
        });

        if (statusEl) statusEl.value = (String(atual.status || '').toLowerCase() === 'inativo') ? 'inativo' : 'ativo';

        modal.classList.add('visivel');
      }
    }

    if (acao === 'excluir') {
      ;(async () => {
        const confirmFn = (window.sitePopup && window.sitePopup.confirm)
          ? window.sitePopup.confirm
          : async (msg) => confirm(msg)
        const ok = await confirmFn('Tem certeza que deseja excluir este produto?', 'Confirmar')
        if (!ok) return
        try {
          const r = await fetch(`/api/vendors/products/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          })
          const data = await r.json()
          if (data && data.success) {
            logHistorico(`Produto excluído: ${atual.titulo || ''}`)
            mostrarToast('Produto excluído com sucesso.', 'success')
            await refreshProdutos()
          } else {
            logHistorico('Falha ao excluir produto')
            mostrarToast(data?.message || 'Falha ao excluir produto.', 'error')
          }
        } catch (e) {
          console.warn('Erro ao excluir produto:', e)
          logHistorico('Erro ao excluir produto')
          mostrarToast('Erro ao excluir produto.', 'error')
        }
      })()
    }
  }

  // Toast simples para feedback ao usuário
  function mostrarToast(msg, tipo = 'info') {
    const cont = document.getElementById('toastContainer')
    if (!cont) { try { window.sitePopup && window.sitePopup.alert(String(msg), tipo === 'error' ? 'Erro' : 'Aviso') } catch {} return }
    const el = document.createElement('div')
    el.className = `toast ${tipo}`
    el.innerHTML = `<span>${msg}</span><span class="acao">Fechar</span>`
    const remover = () => { try { el.remove() } catch {} }
    el.querySelector('.acao')?.addEventListener('click', remover)
    cont.appendChild(el)
    setTimeout(remover, 4000)
  }

  // Vendedores - tabela integrada
  function initVendedores() {
    // Dados seed locais se não existir
    const seed = [
      { id: crypto.randomUUID(), nome: 'João Silva', cpf: '111.222.333-44', email: 'joao@example.com', status: 'ativo', criadoEm: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'Maria Souza', cpf: '555.666.777-88', email: 'maria@example.com', status: 'inativo', criadoEm: new Date().toISOString() },
    ];
    const existentes = getJSON(STORAGE_KEYS.vendedores, null);
    if (!existentes) setJSON(STORAGE_KEYS.vendedores, seed);
    renderVendedores();
    initVendedoresEventos();
  }

  function renderVendedores() {
    const body = document.getElementById('tabelaVendedoresBody');
    if (!body) return;
    const busca = document.getElementById('filtroBusca')?.value?.toLowerCase() ?? '';
    const status = document.getElementById('filtroStatus')?.value ?? 'todos';
    let vendedores = getJSON(STORAGE_KEYS.vendedores, []);
    if (busca) {
      vendedores = vendedores.filter(v =>
        v.nome.toLowerCase().includes(busca) || v.email.toLowerCase().includes(busca) || v.cpf.toLowerCase().includes(busca)
      );
    }
    if (status !== 'todos') vendedores = vendedores.filter(v => v.status === status);
    body.innerHTML = vendedores.map(v => `
      <tr data-id="${v.id}">
        <td>${v.nome}</td>
        <td>${v.cpf}</td>
        <td>${v.email}</td>
        <td><span class="badge ${v.status}">${v.status}</span></td>
        <td>${new Date(v.criadoEm).toLocaleDateString('pt-BR')}</td>
        <td class="acoes">
          <button class="btn editar" data-acao="editar"><i class="fa-solid fa-pen"></i> Editar</button>
          <button class="btn desativar" data-acao="toggle"><i class="fa-solid fa-power-off"></i> ${v.status === 'ativo' ? 'Desativar' : 'Ativar'}</button>
        </td>
      </tr>
    `).join('');
    body.querySelectorAll('button').forEach(b => b.addEventListener('click', onAcaoVendedor));
  }

  function initVendedoresEventos() {
    document.getElementById('filtroBusca')?.addEventListener('input', renderVendedores);
    document.getElementById('filtroStatus')?.addEventListener('change', renderVendedores);
    document.getElementById('itensPorPagina')?.addEventListener('change', renderVendedores); // MVP sem paginação real
  }

  function onAcaoVendedor(e) {
    const btn = e.currentTarget;
    const acao = btn.dataset.acao;
    const id = btn.closest('tr')?.dataset.id;
    if (!id) return;
    const lista = getJSON(STORAGE_KEYS.vendedores, []);
    const idx = lista.findIndex(v => v.id === id);
    if (idx === -1) return;
    if (acao === 'toggle') {
      const novo = lista[idx].status === 'ativo' ? 'inativo' : 'ativo';
      lista[idx].status = novo;
      setJSON(STORAGE_KEYS.vendedores, lista);
      renderVendedores();
      logHistorico(`Vendedor ${novo === 'ativo' ? 'ativado' : 'desativado'}: ${lista[idx].nome}`);
    }
    if (acao === 'editar') {
      (async () => {
        const promptFn = (window.sitePopup && window.sitePopup.prompt)
          ? window.sitePopup.prompt
          : async (msg) => {
              const val = prompt(msg)
              return val === null ? null : val
            }
        const nomeRes = await promptFn('Informe o nome do vendedor:', 'Editar vendedor', String(lista[idx].nome || ''))
        const emailRes = await promptFn('Informe o e-mail do vendedor:', 'Editar vendedor', String(lista[idx].email || ''))
        const cpfRes = await promptFn('Informe o CPF do vendedor:', 'Editar vendedor', String(lista[idx].cpf || ''))
        const nome = nomeRes ?? lista[idx].nome
        const email = emailRes ?? lista[idx].email
        const cpf = cpfRes ?? lista[idx].cpf
        if (String(nome).trim() && String(email).trim() && String(cpf).trim()) {
          lista[idx].nome = String(nome).trim()
          lista[idx].email = String(email).trim()
          lista[idx].cpf = String(cpf).trim()
          setJSON(STORAGE_KEYS.vendedores, lista)
          renderVendedores()
          logHistorico(`Vendedor editado: ${nome}`)
        }
      })()
    }
  }

  // Config
  function initConfig() {
    const form = document.getElementById('formConfig');
    if (!form) return;
    const cfg = getJSON(STORAGE_KEYS.config, {});
    const nomeEl = document.getElementById('configNomeLoja');
    const telEl = document.getElementById('configTelefone');
    const sobreEl = document.getElementById('configSobre');
    if (nomeEl) nomeEl.value = cfg.nomeLoja ?? '';
    if (telEl) telEl.value = cfg.telefone ?? '';
    if (sobreEl) sobreEl.value = cfg.sobre ?? '';

    // Máscara de telefone BR (celular e fixo)
    const formatTelefoneBR = (v) => {
      const d = String(v || '').replace(/\D/g, '').slice(0, 11);
      if (d.length <= 10) {
        // (11) 2345-6789
        return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (m, a, b, c) => {
          let out = '';
          if (a) out += `(${a}` + (a.length === 2 ? ')' : '') + ' ';
          if (b) out += b + (b.length === 4 ? '-' : '');
          if (c) out += c;
          return out.trim();
        });
      }
      // (11) 91234-5678
      return d.replace(/(\d{0,2})(\d{0,5})(\d{0,4}).*/, (m, a, b, c) => {
        let out = '';
        if (a) out += `(${a}` + (a.length === 2 ? ')' : '') + ' ';
        if (b) out += b + (b.length === 5 ? '-' : '');
        if (c) out += c;
        return out.trim();
      });
    };
    if (telEl) {
      const applyMask = () => { telEl.value = formatTelefoneBR(telEl.value); };
      ['input','change','blur','paste'].forEach(ev => telEl.addEventListener(ev, applyMask));
      // Aplicar máscara ao valor inicial (prefill/local)
      applyMask();
    }

    // Prefetch do servidor (se autenticado) para preencher dados
    (async () => {
      try {
        const r = await fetch('/api/vendors/store/me', { credentials: 'include' });
        const data = await r.json();
        if (data && data.success && data.data) {
          const s = data.data;
          if (nomeEl) nomeEl.value = s.nomeLoja || '';
          if (telEl) { telEl.value = s.telefone || ''; telEl.dispatchEvent(new Event('input')); }
          if (sobreEl) sobreEl.value = s.sobre || '';
          setJSON(STORAGE_KEYS.config, { nomeLoja: s.nomeLoja || '', telefone: s.telefone || '', sobre: s.sobre || '' });
        }
      } catch (e) {
        console.warn('Falha ao obter dados da loja:', e);
      }
    })();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btnSubmit = form.querySelector('button[type="submit"]');
      const originalHTML = btnSubmit ? btnSubmit.innerHTML : '';
      if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...'; }
      const novo = {
        nomeLoja: (nomeEl?.value || '').trim(),
        telefone: (telEl?.value || '').trim(),
        sobre: (sobreEl?.value || '').trim(),
      };
      try {
        const r = await fetch('/api/vendors/store/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(novo)
        });
        const data = await r.json();
        if (data && data.success) {
          setJSON(STORAGE_KEYS.config, novo);
          logHistorico('Configurações salvas no servidor');
          mostrarToast('Configurações salvas com sucesso.', 'success');
          if (btnSubmit) {
            btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Salvo';
            setTimeout(() => { btnSubmit.innerHTML = originalHTML; }, 1200);
          }
        } else {
          logHistorico('Falha ao salvar configurações no servidor');
          mostrarToast(data?.message || 'Falha ao salvar configurações.', 'error');
          if (btnSubmit) btnSubmit.innerHTML = originalHTML;
        }
      } catch (e) {
        console.warn('Erro ao salvar loja do vendedor:', e);
        logHistorico('Erro ao salvar configurações no servidor');
        mostrarToast('Erro ao salvar configurações.', 'error');
        if (btnSubmit) btnSubmit.innerHTML = originalHTML;
      } finally {
        if (btnSubmit) btnSubmit.disabled = false;
      }
    });
  }

  let historicoPaginaAtual = 1;
  let historicoItensPorPagina = (() => {
    const raw = localStorage.getItem('vendor:historico:perPage');
    const n = parseInt(raw || '10', 10);
    return isNaN(n) ? 10 : n;
  })();

  function renderHistorico() {
    const ul = document.getElementById('listaHistorico');
    if (!ul) return;
    const historico = getJSON(STORAGE_KEYS.historico, []);
    const total = historico.length;
    const porPagina = historicoItensPorPagina || 10;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    if (historicoPaginaAtual > totalPaginas) historicoPaginaAtual = totalPaginas;
    if (historicoPaginaAtual < 1) historicoPaginaAtual = 1;

    const inicio = (historicoPaginaAtual - 1) * porPagina;
    const fim = inicio + porPagina;
    const itensPagina = historico.slice(inicio, fim);

    ul.innerHTML = itensPagina.map(h => `
      <li>
        <i class="fa-solid fa-circle-dot" style="color:#883fd8"></i>
        <span>${h.msg}</span>
        <time>— ${new Date(h.at).toLocaleString('pt-BR')}</time>
      </li>
    `).join('');

    const pagEl = document.getElementById('paginacaoHistorico');
    const infoEl = document.getElementById('histPageInfo');
    const prevBtn = document.getElementById('btnHistPrev');
    const nextBtn = document.getElementById('btnHistNext');
    const sel = document.getElementById('historicoItensPorPagina');
    if (sel) sel.value = String(porPagina);
    if (pagEl) {
      pagEl.style.display = totalPaginas > 1 ? '' : 'none';
      if (infoEl) infoEl.textContent = `${historicoPaginaAtual} / ${totalPaginas}`;
      if (prevBtn) prevBtn.disabled = historicoPaginaAtual <= 1;
      if (nextBtn) nextBtn.disabled = historicoPaginaAtual >= totalPaginas;
    }
  }

  function initHistoricoControls() {
    const sel = document.getElementById('historicoItensPorPagina');
    const prevBtn = document.getElementById('btnHistPrev');
    const nextBtn = document.getElementById('btnHistNext');
    if (sel) {
      sel.addEventListener('change', (e) => {
        const n = parseInt(e.target.value, 10);
        historicoItensPorPagina = isNaN(n) ? 10 : n;
        localStorage.setItem('vendor:historico:perPage', String(historicoItensPorPagina));
        historicoPaginaAtual = 1;
        renderHistorico();
      });
    }
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (historicoPaginaAtual > 1) {
        historicoPaginaAtual--;
        renderHistorico();
      }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const historico = getJSON(STORAGE_KEYS.historico, []);
      const totalPaginas = Math.max(1, Math.ceil(historico.length / (historicoItensPorPagina || 10)));
      if (historicoPaginaAtual < totalPaginas) {
        historicoPaginaAtual++;
        renderHistorico();
      }
    });
  }

  function aplicarBoasVindas() {
    const nome = (() => {
      try {
        const raw = localStorage.getItem('auth:user');
        if (raw) {
          const u = JSON.parse(raw);
          return u?.nome || u?.name || u?.email || 'Vendedor(a)';
        }
      } catch {}
      try {
        const raw2 = localStorage.getItem('vendedor:perfil');
        if (raw2) {
          const u2 = JSON.parse(raw2);
          return u2?.nome || u2?.name || u2?.email || 'Vendedor(a)';
        }
      } catch {}
      return 'Vendedor(a)';
    })();
    const el = document.getElementById('boas-vindas-vendedor');
    if (el) el.textContent = `Bem-vindo(a), ${nome}.`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAbas();
    initProdutos();
    initVendedores();
    initConfig();
    initHistoricoControls();
    renderHistorico();
    aplicarBoasVindas();
    // Modal de edição: fechar, cancelar e salvar
    const modal = document.getElementById('modalEditarProduto');
    const fechar = document.getElementById('fecharModalEditar');
    const formEdit = document.getElementById('formEditarProdutoVend');
    const btnCancelar = document.getElementById('btnCancelarEdicaoProduto');

    const fecharModalEdicao = () => {
      if (modal) modal.classList.remove('visivel');
      if (formEdit) {
        formEdit.reset();
        delete formEdit.dataset.id;
        // Limpar previews de preço
        const fmtML = document.getElementById('editPrecoMLFormatado');
        const fmtAZ = document.getElementById('editPrecoAmazonFormatado');
        if (fmtML) fmtML.textContent = '';
        if (fmtAZ) fmtAZ.textContent = '';
      }
    };
    if (fechar && modal) fechar.addEventListener('click', () => { fecharModalEdicao(); refreshProdutos(); });
    if (btnCancelar) btnCancelar.addEventListener('click', () => { fecharModalEdicao(); });

    if (formEdit) {
      formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = formEdit.dataset.id;
        if (!id) { fecharModalEdicao(); return; }
        const get = (x) => document.getElementById(x);
        const btnSubmit = document.getElementById('btnSalvarEdicaoProduto');
        const originalHTML = btnSubmit ? btnSubmit.innerHTML : '';
        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...'; }
        const nome = (get('editProdutoNome')?.value || '').trim();
        const descricao = (get('editProdutoDescricao')?.value || '').trim();
        const fotoUrl = (get('editProdutoFoto')?.value || '').trim();
        const linkMercadoLivre = (get('editProdutoLinkML')?.value || '').trim();
        const linkAmazon = (get('editProdutoLinkAmazon')?.value || '').trim();
        const categoria = (get('editProdutoCategoria')?.value || '').trim();
        const subcategoria = (get('editProdutoSubcategoria')?.value || '').trim();
        const status = (get('editProdutoStatus')?.value || '').trim();
        const precoMLRaw = get('editProdutoPrecoML')?.value;
        const precoAZRaw = get('editProdutoPrecoAmazon')?.value;
        const precoMercadoLivre = precoMLRaw !== undefined && precoMLRaw !== '' ? Number(precoMLRaw) : undefined;
        const precoAmazon = precoAZRaw !== undefined && precoAZRaw !== '' ? Number(precoAZRaw) : undefined;
        try {
          const r = await fetch(`/api/vendors/products/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ nome, descricao, fotoUrl, linkMercadoLivre, linkAmazon, categoria, subcategoria, status, precoMercadoLivre, precoAmazon })
          });
          const data = await r.json();
          if (data && data.success) {
            mostrarToast('Produto atualizado com sucesso.', 'success');
            logHistorico(`Produto editado: ${nome || data.data?.titulo || ''}`);
            fecharModalEdicao();
            await refreshProdutos();
            if (btnSubmit) {
              btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Salvo';
              setTimeout(() => { btnSubmit.innerHTML = originalHTML; }, 1200);
            }
          } else {
            mostrarToast(data?.message || 'Falha ao atualizar produto.', 'error');
            if (btnSubmit) btnSubmit.innerHTML = originalHTML;
          }
        } catch (err) {
          console.warn('Erro ao salvar produto do vendedor:', err);
          mostrarToast('Erro ao salvar produto.', 'error');
          if (btnSubmit) btnSubmit.innerHTML = originalHTML;
        } finally {
          if (btnSubmit) btnSubmit.disabled = false;
        }
      });
    }
  });
})();
