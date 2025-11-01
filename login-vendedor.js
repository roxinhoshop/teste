document.addEventListener('DOMContentLoaded', () => {
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      console.info(`[Perf] Login Vendedor DOMContentLoaded: ${Math.round(nav.domContentLoadedEventEnd)}ms`);
    }
  } catch {}
  const API_BASE = window.API_BASE || window.location.origin;

  // Partículas (mesma experiência visual)
  function gerarParticulas() {
    const container = document.createElement('div');
    container.classList.add('particles');
    document.body.appendChild(container);
    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      particle.style.left = `${Math.random() * 100}vw`;
      particle.style.animationDuration = `${3 + Math.random() * 5}s`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(particle);
    }
  }
  gerarParticulas();

  // Validação e envio (baseado no login.js)
  const formulario = document.getElementById('formularioLogin');
  const emailInput = document.getElementById('email');
  const senhaInput = document.getElementById('senha');
  const erroEmail = document.getElementById('erro-email');
  const erroSenha = document.getElementById('erro-senha');

  if (!formulario || !emailInput || !senhaInput || !erroEmail || !erroSenha) {
    console.info('Login vendedor: form não encontrado; script ignorado.');
    return;
  }

  const toggleBtn = document.getElementById('toggleSenhaLogin');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const mostrar = senhaInput.type === 'password';
      senhaInput.type = mostrar ? 'text' : 'password';
      toggleBtn.classList.toggle('active', mostrar);
      toggleBtn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  formulario.addEventListener('submit', function (e) {
    e.preventDefault();
    erroEmail.textContent = '';
    erroSenha.textContent = '';
    erroEmail.classList.remove('ativo');
    erroSenha.classList.remove('ativo');
    emailInput.classList.remove('error');
    senhaInput.classList.remove('error');

    let temErro = false;
    if (emailInput.value.trim() === '') {
      erroEmail.textContent = 'Insira seu e-mail.';
      erroEmail.classList.add('ativo');
      emailInput.classList.add('error');
      temErro = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
      erroEmail.textContent = 'Formato de email inválido. Por favor, insira um email válido.';
      erroEmail.classList.add('ativo');
      emailInput.classList.add('error');
      temErro = true;
    }

    if (senhaInput.value.trim() === '') {
      erroSenha.textContent = 'Insira sua senha.';
      erroSenha.classList.add('ativo');
      senhaInput.classList.add('error');
      temErro = true;
    }

    if (!temErro) {
      const btnLogin = document.querySelector('button[type="submit"]');
      const textoOriginal = btnLogin.textContent;
      btnLogin.textContent = 'Entrando...';
      btnLogin.disabled = true;

      const dados = { email: emailInput.value.trim(), senha: senhaInput.value.trim(), context: 'vendedor' };

      const tentarLogin = async () => {
        try {
          const resp = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Login-Role': 'vendedor' },
            body: JSON.stringify(dados)
          });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok && data && data.success) {
            try {
              if (data.token) {
                try { localStorage.setItem('auth:token', data.token); } catch {}
              }
              localStorage.setItem('auth:event', 'login:' + Date.now());
              localStorage.setItem('auth:last_login', String(Date.now()));
              // Persistência local mínima para diferenciar vendedor e exibir nome no header
              const perfilMinimo = {
                email: dados.email,
                nome: (dados.email || '').split('@')[0]
              };
              localStorage.setItem('auth:vendor', '1');
              localStorage.setItem('vendedor:perfil', JSON.stringify(perfilMinimo));
            } catch {}
            // Redirecionar para painel do vendedor (arquivo estático)
            window.location.href = '/painel-vendedor.html';
            return;
          }
          const code = (data && (data.error || data.code)) || '';
          const msg = (data && data.message) || '';
          if (code === 'INVALID_EMAIL_FORMAT' || /Formato de email inválido/i.test(msg)) {
            erroEmail.textContent = 'Formato de email inválido. Por favor, insira um email válido.';
            erroEmail.classList.add('ativo');
            emailInput.classList.add('error');
            return;
          } else if (code === 'EMAIL_NOT_REGISTERED' || /Email não cadastrado/i.test(msg)) {
            erroEmail.textContent = 'Email não cadastrado. Verifique o email ou cadastre-se.';
            erroEmail.classList.add('ativo');
            emailInput.classList.add('error');
            return;
          } else if (code === 'INCORRECT_PASSWORD' || /Senha incorreta/i.test(msg)) {
            erroSenha.textContent = 'Senha incorreta. Tente novamente ou recupere sua senha.';
            erroSenha.classList.add('ativo');
            senhaInput.classList.add('error');
            return;
          } else if (code === 'ROLE_NOT_ALLOWED') {
            erroSenha.textContent = 'Esta página é apenas para vendedores. Use o login de cliente se for o caso.';
            erroSenha.classList.add('ativo');
            senhaInput.classList.add('error');
            return;
          } else if (code === 'VENDOR_NOT_REGISTERED') {
            erroSenha.textContent = 'Seu usuário não está registrado como vendedor. Complete o cadastro de vendedor.';
            erroSenha.classList.add('ativo');
            senhaInput.classList.add('error');
            return;
          } else if (code === 'VENDOR_NOT_ACTIVE') {
            erroSenha.textContent = 'Seu cadastro de vendedor não está ativo. Aguarde aprovação ou contate o suporte.';
            erroSenha.classList.add('ativo');
            senhaInput.classList.add('error');
            return;
          } else if (resp.ok) {
            erroSenha.textContent = msg || 'Erro de autenticação. Verifique seus dados.';
            erroSenha.classList.add('ativo');
            senhaInput.classList.add('error');
            return;
          }
          throw new Error('Falha de rede');
        } catch (err) {
          erroSenha.textContent = 'Servidor de autenticação indisponível. Verifique se o backend está rodando.';
          erroSenha.classList.add('ativo');
          senhaInput.classList.add('error');
        }
      };

      tentarLogin()
        .catch(() => {
          erroSenha.textContent = 'Erro ao fazer login. Tente novamente.';
          erroSenha.classList.add('ativo');
          senhaInput.classList.add('error');
        })
        .finally(() => {
          btnLogin.textContent = textoOriginal;
          btnLogin.disabled = false;
        });
    }
  });
});

// Google Sign-In opcional (igual ao login.js)
function handleCredentialResponse(response) {
  console.log('Google JWT: ', response.credential);
}

window.addEventListener('load', function () {
  try {
    const btnContainer = document.getElementById('googleBtn');
    const GOOGLE_CLIENT_ID = (window.GOOGLE_CLIENT_ID || '').trim();

    if (window.google && GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
      google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredentialResponse });
      if (btnContainer) {
        google.accounts.id.renderButton(btnContainer, { theme: 'outline', size: 'large', shape: 'pill', logo_alignment: 'left' });
      }
    } else {
      if (btnContainer) btnContainer.style.display = 'none';
      console.info('Google Sign-In desativado (client_id ausente ou inválido).');
    }
  } catch (e) {
    console.info('Google Sign-In indisponível:', e.message);
    const btnContainer = document.getElementById('googleBtn');
    if (btnContainer) btnContainer.style.display = 'none';
  }
});

// Garante que ao sair do painel se necessário, a sessão local do vendedor seja limpa
window.addEventListener('storage', function(e) {
  if (e && e.key === 'auth:event' && /logout/i.test(String(e.newValue || ''))) {
    try {
      localStorage.removeItem('auth:vendor');
      localStorage.removeItem('vendedor:perfil');
    } catch {}
  }
});
