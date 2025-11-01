document.addEventListener('DOMContentLoaded', () => {
  // Métrica rápida de desempenho: tempo até DOMContentLoaded
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      console.info(`[Perf] Login DOMContentLoaded: ${Math.round(nav.domContentLoadedEventEnd)}ms`);
    }
  } catch {}
  // Base única de API definida globalmente em js/config.js
  const API_BASE = window.API_BASE || window.location.origin;
  // ------------------------
  // 🎨 Partículas animadas
  // ------------------------
  function gerarParticulas() {
    const container = document.createElement("div");
    container.classList.add("particles");
    document.body.appendChild(container);

    for (let i = 0; i < 50; i++) {
      const particle = document.createElement("div");
      particle.classList.add("particle");
      particle.style.left = `${Math.random() * 100}vw`;
      particle.style.animationDuration = `${3 + Math.random() * 5}s`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(particle);
    }
  }
  gerarParticulas();

  // ------------------------
  // ✅ Validação de login
  // ------------------------
  const formulario = document.getElementById('formularioLogin');
  const emailInput = document.getElementById('email');
  const senhaInput = document.getElementById('senha');
  const erroEmail = document.getElementById('erro-email');
  const erroSenha = document.getElementById('erro-senha');

  if (!formulario || !emailInput || !senhaInput || !erroEmail || !erroSenha) {
    console.info('Login form não encontrado; script ignorado.');
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

    // 🔹 Limpa mensagens e estilos
    erroEmail.textContent = '';
    erroSenha.textContent = '';
    erroEmail.classList.remove('ativo');
    erroSenha.classList.remove('ativo');
    emailInput.classList.remove('error');
    senhaInput.classList.remove('error');

    let temErro = false;

    // 🔹 Validação de e-mail
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

    // 🔹 Validação de senha
    if (senhaInput.value.trim() === '') {
      erroSenha.textContent = 'Insira sua senha.';
      erroSenha.classList.add('ativo');
      senhaInput.classList.add('error');
      temErro = true;
    }

    // 🔹 Se não houver erros → envia para API
    if (!temErro) {
      // Mostrar indicador de carregamento (aplicar ao botão do formulário de login)
      const btnLogin = document.getElementById('botaoLogin') || (formulario && formulario.querySelector('button[type="submit"]'));
      const labelEl = btnLogin ? (btnLogin.querySelector('span') || btnLogin) : null;
      const textoOriginal = labelEl ? labelEl.textContent : '';
      if (labelEl) { labelEl.textContent = 'Entrando...'; }
      if (btnLogin) { btnLogin.disabled = true; }
      
      const dados = {
        email: emailInput.value.trim(),
        senha: senhaInput.value.trim()
      };
      
      const tentarLogin = async () => {
        try {
          const resp = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
          });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok && data && data.success) {
            try {
              if (data.token) {
                try { localStorage.setItem('auth:token', data.token); } catch {}
              }
              const user = (data && data.user) || {};
              const role = String(user.role || '').toLowerCase();
              if (role === 'cliente') {
                const perfilMinimo = {
                  nome: user.nome || user.name || '',
                  email: user.email || '',
                  role: 'cliente'
                };
                localStorage.setItem('auth:customer', '1');
                localStorage.setItem('cliente:perfil', JSON.stringify(perfilMinimo));
              }
              localStorage.setItem('auth:event', 'login:' + Date.now());
              localStorage.setItem('auth:last_login', String(Date.now()));
            } catch {}
            window.location.href = '/';
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
          } else if (resp.ok) {
            erroSenha.textContent = msg || 'Erro de autenticação. Verifique seus dados.';
            erroSenha.classList.add('ativo');
            senhaInput.classList.add('error');
            return;
          }
          // resp não ok
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
          if (labelEl) { labelEl.textContent = textoOriginal; }
          if (btnLogin) { btnLogin.disabled = false; }
        });
    }
  });
});

// ------------------------
// 🔹 Login com Google
// ------------------------
function handleCredentialResponse(response) {
  console.log("Google JWT: ", response.credential);
  // Aqui você pode enviar para o backend ou autenticar
}

   function toggleCheckbox() {
            const checkbox = document.getElementById('remember');
            checkbox.checked = !checkbox.checked;
            
            const wrapper = document.querySelector('.remember-me');
            wrapper.style.transform = 'scale(0.98)';
            setTimeout(() => {
                wrapper.style.transform = 'scale(1)';
            }, 100);
        }

window.addEventListener('load', function () {
  try {
    const btnContainer = document.getElementById('googleBtn');
    const GOOGLE_CLIENT_ID = (window.GOOGLE_CLIENT_ID || '').trim();

    if (window.google && GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
      });
      if (btnContainer) {
        google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          logo_alignment: 'left'
        });
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

  
