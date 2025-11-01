document.addEventListener('DOMContentLoaded', () => {
  let API_BASE = window.API_BASE || window.location.origin;
  const touched = new Set();

  const avatarAtual = document.getElementById('avatar-atual');
  const avatarInput = document.getElementById('avatar-input');
  const btnAlterarFoto = document.getElementById('btn-alterar-foto');
  const btnRemoverFoto = document.getElementById('btn-remover-foto');
  const statusAvatar = document.getElementById('status-avatar');

  const formPerfil = document.getElementById('form-configuracoes');
  const campoNome = document.getElementById('nome');
  const campoSobrenome = document.getElementById('sobrenome');
  const campoEmail = document.getElementById('email');
  const btnCancelarPerfil = document.getElementById('btn-cancelar-perfil');
  const btnSalvarPerfil = document.getElementById('btn-salvar-perfil');
  const btnRedefinirPerfil = document.getElementById('btn-redefinir-perfil');
  const statusPerfil = document.getElementById('status-perfil');

  const formSenha = document.getElementById('form-senha');
  const campoSenhaAtual = document.getElementById('senha-atual');
  const campoNovaSenha = document.getElementById('nova-senha');
  const campoConfirmarSenha = document.getElementById('confirmar-senha');
  const statusSenha = document.getElementById('status-senha');

  const menuConfig = document.getElementById('menu-config');
  const breadcrumbAtual = document.getElementById('breadcrumb-atual');
  const tituloSecao = document.getElementById('titulo-secao');
  const areaPrincipal = document.querySelector('.area-produtos');
  const sections = {
    perfil: document.getElementById('perfil'),
    seguranca: document.getElementById('seguranca')
  };

  let perfilOriginal = { nome: '', sobrenome: '', email: '' };
  let avatarAnteriorSrc = null;

  function setStatus(el, msg, tipo = 'info') {
    if (!el) return;
    el.textContent = msg || '';
    el.classList.remove('sucesso', 'erro');
    if (tipo === 'sucesso') el.classList.add('sucesso');
    if (tipo === 'erro') el.classList.add('erro');
  }

  function getErroElemento(input) {
    if (!input) return null;
    return document.getElementById(`erro-${input.id}`) || input.parentElement.querySelector('.mensagem-erro') || null;
  }

  function ensureErroElemento(input) {
    if (!input) return null;
    let msg = getErroElemento(input);
    if (!msg) {
      msg = document.createElement('small');
      msg.className = 'mensagem-erro';
      msg.id = `erro-${input.id}`;
      input.parentElement.appendChild(msg);
      try { input.setAttribute('aria-describedby', msg.id); } catch {}
    }
    return msg;
  }

  function atualizarErro(input, valido, mensagem, mostrar) {
    if (!input) return;
    if (mostrar) {
      input.classList.toggle('invalido', !valido);
      input.classList.toggle('valido', !!valido);
      input.setAttribute('aria-invalid', String(!valido));
      if (!valido) {
        const el = ensureErroElemento(input);
        if (el) {
          el.textContent = mensagem || '';
          el.classList.add('mensagem-erro', 'visivel');
          el.classList.remove('apenas-leitura-tela');
        }
      } else {
        const el = getErroElemento(input);
        if (el) {
          el.textContent = '';
          el.classList.remove('visivel');
        }
      }
    } else {
      input.classList.remove('invalido', 'valido');
      input.setAttribute('aria-invalid', 'false');
      const el = getErroElemento(input);
      if (el) {
        el.textContent = '';
        el.classList.remove('visivel');
      }
    }
  }

  function validarNome(valor) {
    return typeof valor === 'string' && valor.trim().length >= 2 && valor.trim().length <= 80;
  }
  function validarSobrenome(valor) {
    return typeof valor === 'string' && valor.trim().length >= 2 && valor.trim().length <= 80;
  }
  function validarEmail(valor) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(valor).toLowerCase());
  }

  function validarPerfilCampos(exibirErros = false) {
    let ok = true;
    if (campoNome) {
      const v = campoNome.value || '';
      const valido = validarNome(v);
      const hasValue = v.trim().length > 0;
      const mostrar = exibirErros ? !valido : (touched.has('nome') && hasValue && !valido);
      atualizarErro(campoNome, valido, 'Informe seu nome (mín. 2 caracteres).', mostrar);
      ok = ok && valido;
    }
    if (campoSobrenome) {
      const v = campoSobrenome.value || '';
      const valido = validarSobrenome(v);
      const hasValue = v.trim().length > 0;
      const mostrar = exibirErros ? !valido : (touched.has('sobrenome') && hasValue && !valido);
      atualizarErro(campoSobrenome, valido, 'Informe seu sobrenome (mín. 2 caracteres).', mostrar);
      ok = ok && valido;
    }
    if (campoEmail) {
      const v = campoEmail.value || '';
      const valido = validarEmail(v);
      const hasValue = v.trim().length > 0;
      const mostrar = exibirErros ? !valido : (touched.has('email') && hasValue && !valido);
      atualizarErro(campoEmail, valido, 'Digite um e-mail válido.', mostrar);
      ok = ok && valido;
    }
    if (btnSalvarPerfil) btnSalvarPerfil.disabled = !ok;
    return ok;
  }

  // API_BASE é resolvida globalmente em js/config.js. Aqui usamos diretamente.

  // Carregar dados do usuário
  async function carregarUsuario() {
    try {
      // Estado de carregamento e acessibilidade
      areaPrincipal && areaPrincipal.setAttribute('data-loading', 'true');
      areaPrincipal && areaPrincipal.setAttribute('aria-busy', 'true');
      [campoNome, campoSobrenome, campoEmail].forEach(el => { if (el) el.disabled = true; });
      setStatus(statusPerfil, 'Carregando dados do usuário...', 'info');

      // Busca direta pela base configurada
      const resp = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Falha ao obter usuário atual');
      const data = await resp.json();
      if (!data.success || !data.user) throw new Error('Usuário não autenticado');
      const u = data.user;

      // Separar nome e sobrenome quando necessário
      let nome = typeof u.nome === 'string' ? u.nome : '';
      let sobrenome = typeof u.sobrenome === 'string' ? u.sobrenome : '';
      if ((!sobrenome || !sobrenome.trim()) && nome && /\s/.test(nome.trim())) {
        const partes = nome.trim().split(/\s+/);
        nome = partes.shift() || '';
        sobrenome = partes.join(' ');
      }

      if (campoNome) campoNome.value = nome || '';
      if (campoSobrenome) campoSobrenome.value = sobrenome || '';
      campoEmail && (campoEmail.value = u.email || '');
      perfilOriginal = { nome: campoNome ? campoNome.value : '', sobrenome: campoSobrenome ? campoSobrenome.value : '', email: campoEmail ? campoEmail.value : '' };

      if (avatarAtual) {
        let src = '/imagens/logos/avatar-roxo.svg';
        if (typeof u.foto_perfil === 'string' && u.foto_perfil.startsWith('data:image/')) {
          src = u.foto_perfil;
        } else if (typeof u.foto_perfil === 'string' && u.foto_perfil.trim()) {
          src = u.foto_perfil;
        }
        avatarAtual.src = src;
        avatarAnteriorSrc = avatarAtual.src;
      }

      // Atualizar avatar no cabeçalho
      const headerAvatar = document.getElementById('avatar-usuario');
      if (headerAvatar) {
        let src = '/imagens/logos/avatar-roxo.svg';
        if (typeof u.foto_perfil === 'string' && u.foto_perfil.startsWith('data:image/')) {
          src = u.foto_perfil;
        } else if (typeof u.foto_perfil === 'string' && u.foto_perfil.trim()) {
          src = u.foto_perfil;
        }
        headerAvatar.src = src;
      }

      // Finalizar estado de carregamento (sem mensagem persistente)
      setStatus(statusPerfil, '', 'info');
      [campoNome, campoSobrenome, campoEmail].forEach(el => { if (el) el.disabled = false; });
      areaPrincipal && areaPrincipal.removeAttribute('data-loading');
      areaPrincipal && areaPrincipal.setAttribute('aria-busy', 'false');
    } catch (e) {
      console.warn('Não foi possível carregar usuário:', e.message);
      setStatus(statusPerfil, 'Erro ao carregar dados do usuário.', 'erro');
      [campoNome, campoSobrenome, campoEmail].forEach(el => { if (el) el.disabled = false; });
      areaPrincipal && areaPrincipal.removeAttribute('data-loading');
      areaPrincipal && areaPrincipal.setAttribute('aria-busy', 'false');
    }
  }

  // Upload de avatar
  async function enviarAvatar(base64) {
    try {
      const resp = await fetch(`${API_BASE}/api/users/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageBase64: base64 })
      });
      let data = null;
      try {
        data = await resp.json();
      } catch (e) {
        const txt = await resp.text().catch(() => '');
        throw new Error(resp.ok ? 'Resposta inválida do servidor.' : `Erro ${resp.status}: ${txt.slice(0,120)}`);
      }
      if (!resp.ok || !data?.success) throw new Error((data && data.message) || 'Falha ao enviar avatar');
      const fallback = '/imagens/logos/avatar-roxo.svg';
      const url = data.foto_perfil || fallback;
      if (avatarAtual) avatarAtual.src = url;
      const headerAvatar = document.getElementById('avatar-usuario');
      if (headerAvatar) headerAvatar.src = url;
    } catch (e) {
        window.sitePopup && window.sitePopup.alert('Erro ao atualizar avatar: ' + e.message, 'Erro');
    }
  }

  // Conversão de arquivo para Base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (btnAlterarFoto && avatarInput) {
    btnAlterarFoto.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const tipoOk = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      const tamanhoOk = file.size <= 5 * 1024 * 1024; // 5MB
      if (!tipoOk || !tamanhoOk) {
        setStatus(statusAvatar, !tipoOk ? 'Formato inválido. Use JPG ou PNG.' : 'Arquivo muito grande (max 5MB).', 'erro');
        avatarInput.value = '';
        return;
      }
      try {
        // Prévia rápida
        const previewURL = URL.createObjectURL(file);
        if (avatarAtual) avatarAtual.src = previewURL;
        setStatus(statusAvatar, `Prévia carregada: ${file.name} (${Math.round(file.size/1024)}KB)`, 'info');
        const confirmarEnvio = await window.sitePopup.confirm('Deseja usar esta foto como seu avatar?');
        if (!confirmarEnvio) {
          if (avatarAtual && avatarAnteriorSrc) avatarAtual.src = avatarAnteriorSrc;
          setStatus(statusAvatar, 'Alteração cancelada.', 'erro');
        } else {
          const base64 = await fileToBase64(file);
          await enviarAvatar(base64);
          setStatus(statusAvatar, 'Avatar atualizado com sucesso!', 'sucesso');
          avatarAnteriorSrc = avatarAtual ? avatarAtual.src : avatarAnteriorSrc;
        }
      } catch (err) {
        window.sitePopup && window.sitePopup.alert('Não foi possível processar a imagem.', 'Erro');
      } finally {
        avatarInput.value = '';
      }
    });
  }

  // Submeter perfil
  if (formPerfil) {
    formPerfil.addEventListener('submit', async (e) => {
      e.preventDefault();
      const valido = validarPerfilCampos(true);
      if (!valido) {
        setStatus(statusPerfil, 'Corrija os campos destacados antes de salvar.', 'erro');
        return;
      }
      const payload = {
        nome: campoNome ? campoNome.value.trim() : undefined,
        sobrenome: campoSobrenome ? campoSobrenome.value.trim() : undefined,
        email: campoEmail ? campoEmail.value.trim() : undefined,
      };
      try {
        const resp = await fetch(`${API_BASE}/api/users/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.message || 'Falha ao salvar perfil');
        window.sitePopup && window.sitePopup.alert('Perfil salvo com sucesso!', 'Sucesso');
        perfilOriginal = { nome: payload.nome || '', sobrenome: payload.sobrenome || '', email: payload.email || '' };
        setStatus(statusPerfil, '', 'info');
      } catch (err) {
        window.sitePopup && window.sitePopup.alert('Erro ao salvar perfil: ' + err.message, 'Erro');
        setStatus(statusPerfil, 'Erro ao salvar perfil: ' + err.message, 'erro');
      }
    });
  }

  // Cancelar alterações de perfil
  if (btnCancelarPerfil) {
    btnCancelarPerfil.addEventListener('click', (e) => {
      e.preventDefault();
      if (campoNome) campoNome.value = perfilOriginal.nome;
      if (campoSobrenome) campoSobrenome.value = perfilOriginal.sobrenome;
      if (campoEmail) campoEmail.value = perfilOriginal.email;
      validarPerfilCampos(false);
      setStatus(statusPerfil, '', 'info');
    });
  }

  // Redefinir perfil para valores padrão (estado carregado)
  if (btnRedefinirPerfil) {
    btnRedefinirPerfil.addEventListener('click', async (e) => {
      e.preventDefault();
      const confirmar = await window.sitePopup.confirm('Redefinir para os valores carregados?');
      if (!confirmar) return;
      if (campoNome) campoNome.value = perfilOriginal.nome;
      if (campoSobrenome) campoSobrenome.value = perfilOriginal.sobrenome;
      if (campoEmail) campoEmail.value = perfilOriginal.email;
      validarPerfilCampos(false);
      setStatus(statusPerfil, '', 'info');
    });
  }

  // Alterar senha
  if (formSenha) {
    formSenha.addEventListener('submit', async (e) => {
      e.preventDefault();
      const atual = campoSenhaAtual ? campoSenhaAtual.value : '';
      const nova = campoNovaSenha ? campoNovaSenha.value : '';
      const confirmar = campoConfirmarSenha ? campoConfirmarSenha.value : '';
      // Forçar exibição de erros ao enviar
      if (campoSenhaAtual) touched.add('senha-atual');
      if (campoNovaSenha) touched.add('nova-senha');
      if (campoConfirmarSenha) touched.add('confirmar-senha');
      atualizarErroSenha(true);
      if (!nova || nova !== confirmar) {
        window.sitePopup && window.sitePopup.alert('As senhas não conferem.', 'Aviso');
        setStatus(statusSenha, 'As senhas não conferem.', 'erro');
        return;
      }
      try {
        const resp = await fetch(`${API_BASE}/api/users/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ senhaAtual: atual, novaSenha: nova }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.message || 'Falha ao alterar senha');
        window.sitePopup && window.sitePopup.alert('Senha alterada com sucesso!', 'Sucesso');
        setStatus(statusSenha, '', 'info');
        campoSenhaAtual && (campoSenhaAtual.value = '');
        campoNovaSenha && (campoNovaSenha.value = '');
        campoConfirmarSenha && (campoConfirmarSenha.value = '');
      } catch (err) {
        window.sitePopup && window.sitePopup.alert('Erro ao alterar senha: ' + err.message, 'Erro');
        setStatus(statusSenha, 'Erro ao alterar senha: ' + err.message, 'erro');
      }
    });

    // Validação em tempo real de senha
    const atualizarErroSenha = (forcar = false) => {
      const nova = campoNovaSenha ? campoNovaSenha.value : '';
      const confirmar = campoConfirmarSenha ? campoConfirmarSenha.value : '';
      const confere = nova && confirmar && nova === confirmar;
      const novaValida = !!nova && nova.length >= 8;
      if (campoNovaSenha) {
        const hasValue = nova.trim().length > 0;
        const mostrar = forcar ? !novaValida : (touched.has('nova-senha') && hasValue && !novaValida);
        atualizarErro(campoNovaSenha, novaValida, 'Nova senha deve ter pelo menos 8 caracteres.', mostrar);
      }
      if (campoConfirmarSenha) {
        const hasValue = confirmar.trim().length > 0;
        const mostrar = forcar ? !confere : (touched.has('confirmar-senha') && hasValue && !confere);
        atualizarErro(campoConfirmarSenha, confere, 'A confirmação precisa ser igual à nova senha.', mostrar);
      }
      if (!confere) {
        setStatus(statusSenha, 'As senhas não conferem.', 'erro');
      } else {
        setStatus(statusSenha, '', 'info');
      }
    };
    // Validação em tempo real para senha atual e novas senhas
    campoSenhaAtual && campoSenhaAtual.addEventListener('input', () => {
      touched.add('senha-atual');
      const v = campoSenhaAtual.value || '';
      const ok = v.trim().length >= 6;
      const hasValue = v.trim().length > 0;
      const mostrar = hasValue && !ok; // só mostra após digitar algo e estiver inválido
      atualizarErro(campoSenhaAtual, ok, v.length === 0 ? 'Informe sua senha atual.' : 'Senha atual muito curta (mín. 6 caracteres).', mostrar);
    });
    campoNovaSenha && campoNovaSenha.addEventListener('input', () => { touched.add('nova-senha'); atualizarErroSenha(false); });
    campoConfirmarSenha && campoConfirmarSenha.addEventListener('input', () => { touched.add('confirmar-senha'); atualizarErroSenha(false); });
  }

  // Validação em tempo real de perfil
  [campoNome, campoSobrenome, campoEmail].forEach(el => {
    el && el.addEventListener('input', () => { touched.add(el.id); validarPerfilCampos(false); });
  });

  // Navegação da sidebar com atualização de destaque e breadcrumb
  function setActiveSection(sec, updateHash = false) {
    // Atualiza navegação (estado ativo)
    document.querySelectorAll('.menu-navegacao .link-navegacao').forEach(a => {
      const isActive = a.dataset.section === sec;
      a.classList.toggle('active', isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    // Alterna conteúdo das abas
    Object.keys(sections).forEach(key => {
      const el = sections[key];
      if (!el) return;
      const ativo = key === sec;
      el.style.display = ativo ? 'block' : 'none';
      el.setAttribute('aria-hidden', String(!ativo));
    });

    // Atualiza breadcrumb e título
    const titulo = sec === 'perfil' ? 'Perfil' : 'Segurança';
    if (breadcrumbAtual) breadcrumbAtual.textContent = titulo;
    if (tituloSecao) tituloSecao.textContent = titulo;

    // Atualiza URL sem acionar scroll automático
    if (updateHash) {
      try { history.replaceState(null, '', `#${sec}`); } catch {}
    }
  }

  function gotoSection(sec) {
    if (!sections[sec]) return;
    setActiveSection(sec, false);
  }
  if (menuConfig) {
    menuConfig.addEventListener('click', (e) => {
      const link = e.target.closest('a.link-navegacao');
      if (!link) return;
      e.preventDefault();
      const sec = link.dataset.section;
      if (sec) gotoSection(sec);
    });
  }

  // Ativa seção inicial com base no hash da URL
  const initial = (window.location.hash || '').replace('#','') || 'perfil';
  if (sections[initial]) setActiveSection(initial, false); else setActiveSection('perfil', false);

  // Responde a mudanças de hash (ex.: navegação do histórico)
  window.addEventListener('hashchange', () => {
    const h = (window.location.hash || '').replace('#','');
    if (sections[h]) setActiveSection(h);
  });

  carregarUsuario();
  validarPerfilCampos(false);

  // Remover avatar: volta ao padrão do site
  async function removerAvatar() {
const defaultUrl = '/imagens/logos/avatar-roxo.svg';
    try {
      const confirmar = await window.sitePopup.confirm('Remover sua foto e voltar ao avatar padrão?', 'Confirmar');
      if (!confirmar) return;
      const resp = await fetch(`${API_BASE}/api/users/avatar`, { method: 'DELETE', credentials: 'include' });
      let data = null;
      try { data = await resp.json(); } catch (_) { data = null; }
      if (!resp.ok || !data || !data.success) {
        throw new Error((data && data.message) || `Erro ${resp.status} ao remover avatar`);
      }
      if (avatarAtual) avatarAtual.src = defaultUrl;
      const headerAvatar = document.getElementById('avatar-usuario');
      if (headerAvatar) headerAvatar.src = defaultUrl;
      avatarAnteriorSrc = defaultUrl;
      setStatus(statusAvatar, 'Avatar removido. Voltou ao padrão.', 'sucesso');
    } catch (e) {
      window.sitePopup && window.sitePopup.alert('Erro ao remover avatar: ' + e.message, 'Erro');
      setStatus(statusAvatar, 'Erro ao remover avatar: ' + e.message, 'erro');
    }
  }
  if (btnRemoverFoto) {
    btnRemoverFoto.addEventListener('click', removerAvatar);
  }
});
// Fallback robusto para avatar em caso de erro de carregamento
document.addEventListener('DOMContentLoaded', () => {
  const avatarPreview = document.getElementById('avatarPreview');
  if (avatarPreview) {
    avatarPreview.onerror = () => {
      avatarPreview.onerror = null;
avatarPreview.src = '/imagens/logos/avatar-roxo.svg';
    };
  }
});
