// Chatbot Roxinho - UI minimalista com opções numeradas e integração API
(function() {
  const STORAGE_KEY = 'roxinho_chatbot_history_v1';
  // Resetar histórico do chatbot a cada recarregamento da página
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}

  function el(tag, cls, children) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (Array.isArray(children)) children.forEach(c => e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return e;
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch(_) { return []; }
  }
  function saveHistory(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-200))); } catch(_) {}
  }

  function avatarPaths() {
    return {
      roxinho: '/imagens/chatbot-roxinho.png',
      roxFallback: '/imagens/logos/avatar-roxo.svg',
      user: '/imagens/logos/avatar-roxo.svg'
    };
  }

  // Obtém perfil rápido do cliente (localStorage) com fallback leve à API
  async function obterPerfilCliente() {
    try {
      const raw = localStorage.getItem('cliente:perfil');
      if (raw) {
        const p = JSON.parse(raw);
        const nome = String(p?.nome || p?.name || '').trim();
        if (nome) return { logged: true, nome };
      }
    } catch (_) {}
    // Fallback à API (não bloqueia erros)
    try {
      const getMe = (typeof window.getAuthMe === 'function') ? window.getAuthMe : null;
      const data = getMe ? await getMe().catch(() => null) : null;
      const nome = String(data?.user?.nome || data?.user?.name || '').trim();
      if (data && data.success && nome) return { logged: true, nome };
    } catch (_) {}
    return { logged: false, nome: '' };
  }

  function primeiroNome(nome) {
    const n = String(nome || '').trim();
    if (!n) return '';
    return n.split(/\s+/)[0];
  }

  function buildMenu(categoriasSug = [], userName = '', isLogged = false) {
    const wrap = el('div');
    const saud = userName ? `Olá, ${primeiroNome(userName)}! Eu sou o Roxinho 💜. ` : 'Olá! Eu sou o Roxinho 💜. ';
    const intro = saud + 'Estou aqui para te ajudar com dúvidas sobre o site, políticas, contato e sua conta. Toque em um botão prontinho abaixo.';
    wrap.appendChild(el('div', null, [document.createTextNode(intro)]));
    const list = el('div', 'chat-options');
    list.appendChild(quickBtn('Ajuda', 'help'));
    list.appendChild(quickBtn('Políticas', 'policies'));
    list.appendChild(quickBtn('Contato', 'contact'));
    list.appendChild(quickBtn('Minha conta', 'account'));
    if (!isLogged) {
      list.appendChild(quickBtn('Fazer login', 'login'));
    }
    // Mantemos foco em botões úteis; sem promoções ou sugestões de produtos

    wrap.appendChild(list);
    return wrap;
  }

  function quickBtn(label, action, payload) {
    const it = el('button', 'chat-option');
    it.type = 'button';
    it.textContent = label;
    it.dataset.action = action;
    if (payload) it.dataset.payload = JSON.stringify(payload);
    return it;
  }

  function send(url, opts) {
    try {
      const API_BASE = window.API_BASE || window.location.origin;
      const isAbsolute = /^https?:\/\//i.test(url);
      const fullUrl = isAbsolute ? url : (API_BASE + url);
      const fetchOpts = Object.assign({ credentials: 'include' }, opts || {});
      return fetch(fullUrl, fetchOpts)
        .then(r => r.json())
        .catch(e => ({ ok: false, error: 'network_error', message: String(e) }));
    } catch (e) {
      return Promise.resolve({ ok: false, error: 'init_error', message: String(e) });
    }
  }

  function formatProducts(items) {
    if (!Array.isArray(items) || items.length === 0) return 'Nenhum produto encontrado para este critério.';
    return items.map((p, i) => `${i+1}. ${p.titulo} — ${p.categoria}${p.subcategoria ? ' / '+p.subcategoria : ''} • R$ ${Number(p.preco).toFixed(2)}`).join('\n');
  }

  function policiesText() {
    return 'Resumo: Mantemos transparência de preços e histórico para ajudar você a decidir melhor. Para dúvidas ou suporte, visite a página de contato.';
  }

  function setup() {
    const { roxinho, roxFallback, user } = avatarPaths();
    // Botão flutuante
    const fab = el('button', 'chatbot-fab');
    // Ícone moderno em SVG (balão de conversa com 3 pontos)
    const fabSvg = el('span');
    fabSvg.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H10l-6 4 1.5-4H4c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z"/></svg>';
    fab.appendChild(fabSvg);
    document.body.appendChild(fab);

    // Backdrop + modal
    const backdrop = el('div', 'chatbot-modal-backdrop');
    const modal = el('div', 'chatbot-modal');
    const header = el('div', 'chatbot-header');
    const hImg = el('img'); hImg.src = roxinho; hImg.onerror = () => { hImg.src = roxFallback; };
    const hTitle = el('div', 'chatbot-title', [document.createTextNode('Roxinho Assistente')]);
    const hSub = el('div', 'chatbot-subtitle', [document.createTextNode('Escolha uma opção')]);
    header.appendChild(hImg); header.appendChild(el('div', null, [hTitle, hSub]));
    const body = el('div', 'chatbot-body');
    const footer = el('div', 'chatbot-footer');
    const input = el('input', 'chat-input'); input.placeholder = 'Digite sua pergunta ou toque em um botão';
    const sendBtn = el('button', 'chat-send', [document.createTextNode('Enviar')]);
    // Desabilita entrada de texto: apenas botões pré-definidos
    input.disabled = true;
    sendBtn.disabled = true;
    footer.style.display = 'none';
    footer.appendChild(input); footer.appendChild(sendBtn);
    modal.appendChild(header); modal.appendChild(body); modal.appendChild(footer);
    document.body.appendChild(backdrop); document.body.appendChild(modal);

    // Preaquecer dados para respostas mais rápidas (não bloqueia UI)
    try {
      // chamar sem aguardar; cache interno acelera próximas interações
      carregarCategorias().catch(() => {});
      obterPerfilCliente().catch(() => {});
    } catch (_) {}

    let lastBotText = '';
    function addRow(textOrNode, who) {
      const isNode = textOrNode && typeof textOrNode === 'object' && (textOrNode.nodeType === 1 || textOrNode.nodeType === 3 || textOrNode.nodeType === 11);
      const txt = isNode ? '' : String(textOrNode || '').trim();
      if (who === 'bot' && txt && txt === lastBotText) {
        return; // evita repetição de falas do Roxinho
      }
      const row = el('div', 'chat-row' + (who === 'user' ? ' user' : ''));
      const avatar = el('img', 'chat-avatar'); avatar.src = who === 'user' ? user : roxinho; avatar.onerror = () => { avatar.src = roxFallback; };
      const bubble = el('div', 'chat-bubble');
      if (isNode) bubble.appendChild(textOrNode); else bubble.appendChild(document.createTextNode(txt));
      if (who === 'user') { row.appendChild(bubble); row.appendChild(avatar); }
      else { row.appendChild(avatar); row.appendChild(bubble); }
      body.appendChild(row);
      body.scrollTop = body.scrollHeight;
      const histText = txt || (isNode ? '[conteúdo rico]' : '');
      const hist = loadHistory(); hist.push({ who, text: histText, ts: Date.now() }); saveHistory(hist);
      if (who === 'bot') lastBotText = txt;
    }

    function showTyping() {
      const row = el('div', 'chat-row');
      const avatar = el('img', 'chat-avatar'); avatar.src = roxinho; avatar.onerror = () => { avatar.src = roxFallback; };
      const dots = el('span', 'dots');
      const bubble = el('div', 'chat-bubble chat-typing', [dots]);
      row.appendChild(avatar); row.appendChild(bubble);
      body.appendChild(row);
      body.scrollTop = body.scrollHeight;
      return () => { try { row.remove(); } catch(_){} };
    }

    async function addOptions() {
      // Loader imediato enquanto carrega perfil/categorias
      const stopLoading = showTyping();
      const [cats, perfil] = await Promise.all([carregarCategorias(), obterPerfilCliente()]).catch(() => [[], { logged: false, nome: '' }]);
      stopLoading();
      const cont = buildMenu([], perfil.nome, perfil.logged);
      const row = el('div', 'chat-row');
      const avatar = el('img', 'chat-avatar'); avatar.src = roxinho; avatar.onerror = () => { avatar.src = roxFallback; };
      const bubble = el('div', 'chat-bubble'); bubble.appendChild(cont);
      row.appendChild(avatar); row.appendChild(bubble);
      body.appendChild(row);
      const opts = cont.querySelectorAll('.chat-option');
      opts.forEach(o => o.addEventListener('click', () => {
        const action = o.dataset.action;
        const payload = o.dataset.payload ? JSON.parse(o.dataset.payload) : null;
        handleQuick(action, payload);
      }));
      body.scrollTop = body.scrollHeight;
    }

    function open() {
      backdrop.classList.add('open'); modal.classList.add('open');
      body.innerHTML = '';
      const hist = loadHistory();
      if (hist.length) hist.forEach(m => addRow(m.text, m.who));
      else {
        // Sem mensagem genérica; mostra diretamente um menu acolhedor
        addOptions();
      }
    }
    function close() { backdrop.classList.remove('open'); modal.classList.remove('open'); }

    backdrop.addEventListener('click', close);
    fab.addEventListener('click', () => { if (modal.classList.contains('open')) close(); else open(); });

    async function handleQuick(action, payload) {
      if (!action) return;
      if (action === 'help') {
        addRow('Posso ajudar com políticas, contato e sua conta. Use os botões acima para navegar.', 'bot');
        return;
      }
      if (action === 'policies') {
        const stop = showTyping();
        const txt = policiesText();
        stop();
        const cont = el('div');
        cont.appendChild(document.createTextNode(txt));
        cont.appendChild(document.createElement('br'));
        cont.appendChild(document.createElement('br'));
        cont.appendChild(document.createTextNode('Veja mais em: '));
        cont.appendChild(makePageLink('Políticas', 'politicas'));
        cont.appendChild(document.createTextNode(' e '));
        cont.appendChild(makePageLink('Contato', 'contato'));
        addRow(cont, 'bot');
        return;
      }
      if (action === 'contact') {
        const cont = el('div');
        cont.appendChild(document.createTextNode('Você pode falar conosco pela página de '));
        cont.appendChild(makePageLink('Contato', 'contato'));
        cont.appendChild(document.createTextNode('. Estou por aqui para dúvidas rápidas também!'));
        addRow(cont, 'bot');
        return;
      }
      if (action === 'account') {
        const stop = showTyping();
        const me = await send('/api/auth/me');
        stop();
        if (me?.success && me?.user) {
          const u = me.user;
          const cont = el('div', 'account-preview');
          const img = el('img', 'acc-img');
          img.src = (u.foto_perfil || '/imagens/logos/avatar-roxo.svg');
          const info = el('div', 'acc-info');
          const nomeCompleto = `${(u.nome || '').trim()} ${((u.sobrenome || '').trim())}`.trim();
          const nameEl = el('div', 'acc-name', [document.createTextNode(nomeCompleto || u.email || 'Usuário')]);
          const createdRaw = (u.createdAt || u.created_at || u.criadoEm || u.criado_em || null);
          const createdFmt = formatDate(createdRaw);
          const createdEl = el('div', 'acc-created', [document.createTextNode(createdFmt ? `Conta criada em: ${createdFmt}` : 'Conta criada: —')]);
          info.appendChild(nameEl);
          info.appendChild(createdEl);
          cont.appendChild(img);
          cont.appendChild(info);
          addRow(cont, 'bot');
        } else {
          addRow('Você não está autenticado no momento. Faça login para ver os detalhes da sua conta.', 'bot');
        }
        return;
      }
      if (action === 'login') {
        const cont = el('div');
        cont.appendChild(document.createTextNode('Abrindo tela de '));
        cont.appendChild(makePageLink('Login', 'login'));
        cont.appendChild(document.createTextNode('…'));
        addRow(cont, 'bot');
        try { window.location.href = '/login'; } catch(_) {}
        return;
      }
      // Sem botões de promoções/sugestões de produtos no menu
    }

    sendBtn.addEventListener('click', () => {
      const val = input.value.trim(); if (!val) return; input.value = ''; handleInput(val);
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const val = input.value.trim(); if (!val) return; input.value=''; handleInput(val); }});

    // Escuta resposta de categoria após escolher 1 ou 2
    let lastChoice = null;
    body.addEventListener('DOMNodeInserted', () => {
      // simples detecção: se última mensagem do bot pede categoria, guarda estado
      const rows = body.querySelectorAll('.chat-row');
      const last = rows[rows.length - 1];
      if (!last) return;
      const txt = last.querySelector('.chat-bubble')?.textContent || '';
      if (/Catálogo mais BARATO/i.test(txt)) lastChoice = 'cheap';
      else if (/Catálogo mais CARO/i.test(txt)) lastChoice = 'expensive';
    });

    let lastAbort = null;
    async function searchByCategory(cat, mode, extra = {}) {
      const baseUrl = mode === 'cheap' ? `/api/products/top-cheap?categoria=${encodeURIComponent(cat)}` : `/api/products/top-expensive?categoria=${encodeURIComponent(cat)}`;
      const url = extra.subcategoria ? `${baseUrl}&subcategoria=${encodeURIComponent(extra.subcategoria)}` : baseUrl;
      const limit = extra.limit || 5; // respostas mais rápidas
      const stop = showTyping();
      try {
        if (lastAbort) { try { lastAbort.abort(); } catch(_){} }
        lastAbort = new AbortController();
        const r = await send(url + `&limit=${limit}`, { signal: lastAbort.signal });
        stop();
        let items = r?.data || [];
        if (extra.maxPrice) {
          const max = Number(extra.maxPrice);
          items = items.filter(p => Number(p.preco) <= max);
        }
        addRow(formatProductsNode(items), 'bot');
      } catch (_) {
        stop();
        addRow('Tive um pequeno problema ao buscar agora. Tente novamente em instantes.', 'bot');
      }
    }

    // Interpretar textos livres como categoria após escolhas 1/2
    // Cache simples de categorias para ajudar a detecção por texto livre
    let categoriasCache = [];
    async function carregarCategorias() {
      if (categoriasCache.length) return categoriasCache;
      try {
        const resp = await send('/api/products');
        const lista = Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : []);
        categoriasCache = Array.from(new Set((lista || []).map(p => p.categoria).filter(Boolean)));
      } catch (_) { categoriasCache = []; }
      return categoriasCache;
    }

    function detectarModo(txtLower) {
      if (/barat/i.test(txtLower)) return 'cheap';
      if (/car[oa]/i.test(txtLower) || /caros/i.test(txtLower)) return 'expensive';
      if (/mais\s+barat/i.test(txtLower)) return 'cheap';
      if (/mais\s+car/i.test(txtLower)) return 'expensive';
      return null;
    }
    function extrairPrecoMax(txtLower) {
      const m = txtLower.match(/(r\$\s*)?(\d{1,3}(?:[\.,]\d{3})*)(?:[\.,](\d{2}))?/);
      if (!m) return null;
      const num = m[2].replace(/[\.]/g, '').replace(',', '.');
      return Number(num);
    }

    function mapSynonyms(txtLower) {
      const syn = [
        { key: 'smartphones', aliases: ['smartphone', 'celular', 'iphone', 'android', 'telefone'] },
        { key: 'hardware', aliases: ['peças', 'componentes', 'gpu', 'placa de vídeo', 'placa de video', 'rtx', 'gtx', 'radeon', 'ssd', 'ram', 'memória', 'memoria', 'placa mãe', 'placa mae'] },
        { key: 'computadores', aliases: ['pc', 'desktop', 'notebook', 'notebooks', 'laptop', 'ultrabook'] },
        { key: 'periféricos', aliases: ['perifericos', 'teclado', 'mouse', 'monitor', 'webcam', 'headset', 'fone de ouvido'] },
        { key: 'notebooks', aliases: ['notebook', 'laptop', 'ultrabook'] },
        { key: 'teclados', aliases: ['teclado', 'keyboard', 'mecânico', 'mecanico'] },
        { key: 'placas de vídeo', aliases: ['gpu', 'rtx', 'gtx', 'radeon'] },
        { key: 'consoles', aliases: ['console', 'ps5', 'playstation', 'xbox', 'nintendo'] },
      ];
      for (const s of syn) {
        if (txtLower.includes(s.key) || s.aliases.some(a => txtLower.includes(a))) {
          return s.key;
        }
      }
      return null;
    }

    async function executarConsultaInteligente({ mode, categoria, subcategoria, maxPrice }) {
      const cats = await carregarCategorias();
      const catDetectada = categoria || cats.find(c => c && categoria && String(c).toLowerCase() === String(categoria).toLowerCase());
      const extra = {};
      if (subcategoria) extra.subcategoria = subcategoria;
      if (maxPrice) extra.maxPrice = maxPrice;
      await searchByCategory(catDetectada || (categoria || 'Hardware'), mode || 'cheap', extra);
      lastChoice = null;
    }

    async function handleInput(val) {
      const v = String(val || '').trim();
      if (!v) return;
      if (v.toLowerCase() === 'menu') { addRow('Voltando ao menu principal…', 'bot'); addOptions(); return; }

      // Se o usuário já escolheu barato/caro, interpretar próximo texto como categoria
      if (lastChoice === 'cheap' || lastChoice === 'expensive') {
        addRow(v, 'user');
        addRow('Entendi! Um instante…', 'bot');
        await searchByCategory(v, lastChoice);
        lastChoice = null;
        return;
      }

      const txtLower = v.toLowerCase();
      // Respostas rápidas acolhedoras
      if (/ajuda|como funciona|dúvidas|duvidas/.test(txtLower)) { addRow(v, 'user'); addRow('Posso ajudar com políticas, contato e sua conta. Se quiser buscar produtos, diga a categoria e se prefere mais baratos ou caros.', 'bot'); return; }
      if (/pol[ií]ticas|termos/.test(txtLower)) { 
        addRow(v, 'user'); 
        const txt = policiesText(); 
        const cont = el('div');
        cont.appendChild(document.createTextNode(txt));
        cont.appendChild(document.createElement('br'));
        cont.appendChild(document.createElement('br'));
        cont.appendChild(document.createTextNode('Mais em: '));
        cont.appendChild(makePageLink('Políticas', 'politicas'));
        addRow(cont, 'bot'); 
        return; 
      }
      if (/contato|fale conosco|suporte/.test(txtLower)) { 
        addRow(v, 'user'); 
        const cont = el('div');
        cont.appendChild(document.createTextNode('Você pode falar conosco em '));
        cont.appendChild(makePageLink('Contato', 'contato'));
        cont.appendChild(document.createTextNode('. Estou por aqui para dúvidas rápidas também!'));
        addRow(cont, 'bot'); 
        return; 
      }
      if (/login|entrar|minha conta/.test(txtLower)) { 
        addRow(v, 'user'); 
        const cont = el('div');
        cont.appendChild(document.createTextNode('Para acessar sua conta, use '));
        cont.appendChild(makePageLink('Login', 'login'));
        cont.appendChild(document.createTextNode('. Posso mostrar dados básicos se estiver autenticado.'));
        addRow(cont, 'bot'); 
        return; 
      }
      const modoDetectado = detectarModo(txtLower);
      const maxPrice = /até/.test(txtLower) ? extrairPrecoMax(txtLower) : null;
      const catSyn = mapSynonyms(txtLower);
      const cats = await carregarCategorias();
      const catDetectada = cats.find(c => txtLower.includes(String(c || '').toLowerCase())) || catSyn;

      addRow(v, 'user');
      if (modoDetectado || catDetectada || maxPrice) {
        addRow('Entendi! Um instante…', 'bot');
        await searchByCategory(catDetectada || v, modoDetectado || 'cheap', { maxPrice });
        lastChoice = null;
        return;
      }

      addRow('Hmm, não entendi bem. Você pode perguntar algo como "políticas", "contato" ou "minha conta". Se preferir, toque em um botão acima.', 'bot');
      addOptions();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

// Cria lista rica com links clicáveis para produtos
function formatProductsNode(items) {
  const mk = (tag, cls, children) => { const e = document.createElement(tag); if (cls) e.className = cls; (children||[]).forEach(c => e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)); return e; };
  if (!Array.isArray(items) || items.length === 0) {
    return mk('div', null, [document.createTextNode('Nenhum produto encontrado para este critério.')]);
  }
  const list = mk('ol', null, []);
  items.forEach((p) => {
    const li = mk('li', null, []);
    const linkInterno = mk('a', null, [document.createTextNode(p.titulo + ' • R$ ' + Number(p.preco).toFixed(2))]);
    linkInterno.href = `/pagina-produto?id=${encodeURIComponent(p.id)}`;
    linkInterno.target = '_self';
    li.appendChild(linkInterno);
    const extras = mk('span', null, [document.createTextNode(' ')]);
    if (p.linkAmazon) {
      const a = mk('a', null, [document.createTextNode('[Amazon]')]);
      a.href = p.linkAmazon; a.target = '_blank'; a.rel = 'noopener';
      extras.appendChild(a);
      extras.appendChild(document.createTextNode(' '));
    }
    if (p.linkMercadoLivre) {
      const ml = mk('a', null, [document.createTextNode('[Mercado Livre]')]);
      ml.href = p.linkMercadoLivre; ml.target = '_blank'; ml.rel = 'noopener';
      extras.appendChild(ml);
    }
    li.appendChild(extras);
    list.appendChild(li);
  });
  return list;
}

// Formata datas diversas para dd/mm/aaaa
function formatDate(d) {
  try {
    if (!d) return null;
    const date = (d instanceof Date) ? d : new Date(d);
    const time = date.getTime();
    if (isNaN(time)) return null;
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch (_) { return null; }
}

// Link estilizado para páginas fixas do site (Vercel)
function makePageLink(nome, slug) {
  const a = document.createElement('a');
  a.textContent = nome;
  // Usar caminho relativo dentro do site
  a.href = `/${slug}`;
  a.target = '_self';
  a.rel = 'noopener';
  a.className = 'chat-link';
  return a;
}
