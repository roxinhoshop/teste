class FormularioCadastroVendedor {
  constructor() {
    this.formulario = document.getElementById('formularioCadastroVendedor');
    this.campoNome = document.getElementById('nome');
    this.campoSobrenome = document.getElementById('sobrenome');
    this.campoEmail = document.getElementById('email');
    this.campoNomeLoja = document.getElementById('nomeLoja');
    this.campoDocumento = document.getElementById('documento');
    this.campoSenha = document.getElementById('senha');
    this.campoConfirmarSenha = document.getElementById('confirmarSenha');
    this.campoArquivo = document.getElementById('arquivoDocumento');
    this.botaoCadastro = document.getElementById('botaoCadastro');

    this.indicadorContainer = document.getElementById('indicador-senha-container');
    this.progressoSenha = document.getElementById('progresso-senha');
    this.nivelSenha = document.getElementById('nivel-senha');
    this.pontuacaoSenha = document.getElementById('pontuacao-senha');
    this.avisoSenhaCurta = document.getElementById('aviso-senha-curta');

    this.previewImagem = document.getElementById('previewImagem');
    this.arquivoSelecionado = document.getElementById('arquivoSelecionado');
    this.arquivoNome = document.getElementById('arquivoNome');

    this.inicializar();
  }

  inicializar() {
    if (!this.formulario) return;
    this.formulario.addEventListener('submit', (e) => this.lidarEnvio(e));

    const toggleSenha = document.getElementById('toggleSenhaCadastro');
    if (toggleSenha) {
      toggleSenha.addEventListener('click', () => {
        const mostrar = this.campoSenha.type === 'password';
        this.campoSenha.type = mostrar ? 'text' : 'password';
        toggleSenha.classList.toggle('active', mostrar);
        toggleSenha.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
      });
    }

    const toggleConfirmar = document.getElementById('toggleConfirmarSenha');
    if (toggleConfirmar) {
      toggleConfirmar.addEventListener('click', () => {
        const mostrar = this.campoConfirmarSenha.type === 'password';
        this.campoConfirmarSenha.type = mostrar ? 'text' : 'password';
        toggleConfirmar.classList.toggle('active', mostrar);
        toggleConfirmar.setAttribute('aria-label', mostrar ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha');
      });
    }

    this.campoSenha.addEventListener('input', () => {
      this.verificarForcaSenha();
      this.limparErro('senha');
      this.validarConfirmacaoSenha();
    });
    this.campoConfirmarSenha.addEventListener('input', () => this.validarConfirmacaoSenha());

    // Upload
    if (this.campoArquivo) {
      this.campoArquivo.addEventListener('change', () => this.atualizarArquivo());
    }

    // Máscara e validação de CPF
    if (this.campoDocumento) {
      this.campoDocumento.addEventListener('input', () => {
        const atual = this.campoDocumento.value || '';
        const limpo = (atual.match(/\d+/g) || []).join('').slice(0, 11);
        this.campoDocumento.value = this.mascaraCPF(limpo);
        this.limparErro('documento');
      });
      this.campoDocumento.addEventListener('blur', () => this.validarCPF());
    }
  }

  // Utilidades
  mostrarErro(idBase, mensagem) {
    const campoId = idBase === 'confirmar-senha' ? 'confirmarSenha' : idBase;
    const entrada = document.getElementById(campoId);
    const erro = document.getElementById(`erro-${idBase}`);
    if (!entrada || !erro) return false;
    entrada.classList.remove('valido');
    entrada.classList.add('invalido');
    erro.textContent = mensagem || '';
    erro.classList.remove('apenas-leitura-tela');
    erro.classList.add('mensagem-erro', 'visivel');
    return false;
  }

  mostrarSucesso(idBase) {
    const campoId = idBase === 'confirmar-senha' ? 'confirmarSenha' : idBase;
    const entrada = document.getElementById(campoId);
    const erro = document.getElementById(`erro-${idBase}`);
    if (!entrada || !erro) return;
    entrada.classList.remove('invalido');
    entrada.classList.add('valido');
    erro.textContent = '';
    erro.className = 'apenas-leitura-tela';
  }

  limparErro(idBase) {
    const campoId = idBase === 'confirmar-senha' ? 'confirmarSenha' : idBase;
    const entrada = document.getElementById(campoId);
    const erro = document.getElementById(`erro-${idBase}`);
    if (!entrada || !erro) return;
    entrada.classList.remove('invalido', 'valido');
    erro.textContent = '';
    erro.className = 'apenas-leitura-tela';
  }

  validarNome() {
    const v = (this.campoNome.value || '').trim();
    if (!v) return this.mostrarErro('nome', 'Nome é obrigatório');
    if (v.length < 2) return this.mostrarErro('nome', 'Nome deve ter pelo menos 2 caracteres');
    if (!/^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(v)) return this.mostrarErro('nome', 'Nome deve conter apenas letras');
    this.mostrarSucesso('nome');
    return true;
  }

  validarSobrenome() {
    const v = (this.campoSobrenome.value || '').trim();
    if (!v) return this.mostrarErro('sobrenome', 'Sobrenome é obrigatório');
    if (v.length < 2) return this.mostrarErro('sobrenome', 'Sobrenome deve ter pelo menos 2 caracteres');
    if (!/^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(v)) return this.mostrarErro('sobrenome', 'Sobrenome deve conter apenas letras');
    this.mostrarSucesso('sobrenome');
    return true;
  }

  validarEmail() {
    const v = (this.campoEmail.value || '').trim();
    if (!v) return this.mostrarErro('email', 'E-mail é obrigatório');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return this.mostrarErro('email', 'E-mail inválido');
    this.mostrarSucesso('email');
    return true;
  }

  validarNomeLoja() {
    const v = (this.campoNomeLoja.value || '').trim();
    if (!v) return this.mostrarErro('nomeLoja', 'Nome da loja é obrigatório');
    if (v.length < 2) return this.mostrarErro('nomeLoja', 'Nome da loja muito curto');
    this.mostrarSucesso('nomeLoja');
    return true;
  }

  mascaraCPF(digitos) {
    const p1 = digitos.slice(0, 3);
    const p2 = digitos.slice(3, 6);
    const p3 = digitos.slice(6, 9);
    const p4 = digitos.slice(9, 11);
    let out = p1;
    if (p2) out += '.' + p2;
    if (p3) out += '.' + p3;
    if (p4) out += '-' + p4;
    return out;
  }

  validarCPF() {
    const v = (this.campoDocumento.value || '').replace(/\D+/g, '');
    if (!v) {
      // CPF opcional neste MVP
      this.limparErro('documento');
      return true;
    }
    if (v.length !== 11) {
      return this.mostrarErro('documento', 'Informe um CPF com 11 dígitos');
    }
    // Permitir qualquer CPF com 11 dígitos, sem validação de dígitos verificadores
    this.mostrarSucesso('documento');
    return true;
  }

  verificarForcaSenha() {
    const senha = this.campoSenha.value || '';
    if (!senha.length) {
      this.indicadorContainer.classList.remove('visivel');
      this.avisoSenhaCurta.classList.remove('visivel');
      return 0;
    }
    if (senha.length < 8) {
      this.indicadorContainer.classList.remove('visivel');
      this.avisoSenhaCurta.classList.add('visivel');
      return 0;
    }
    this.avisoSenhaCurta.classList.remove('visivel');
    let score = 0;
    if (senha.length < 8) score = 10;
    else if (senha.length < 12) score = 20; else if (senha.length < 16) score = 40; else score = 90;
    if (/[a-z]/.test(senha)) score += 1;
    if (/[A-Z]/.test(senha)) score += 10;
    if (/[0-9]/.test(senha)) score += 10;
    if (/[^A-Za-z0-9]/.test(senha)) score += 10;
    score = Math.min(score, 100);
    const nivel = score < 40 ? 'Fraca' : (score < 80 ? 'Moderada' : 'Forte');
    const classe = score < 40 ? 'forca-fraca' : (score < 80 ? 'forca-moderada' : 'forca-forte');
    this.indicadorContainer.className = 'indicador-senha-container visivel ' + classe;
    this.progressoSenha.style.width = `${Math.min(score, 100)}%`;
    this.nivelSenha.textContent = nivel;
    return score;
  }

  validarSenha() {
    const v = this.campoSenha.value || '';
    if (!v) return this.mostrarErro('senha', 'Senha é obrigatória');
    if (v.length < 8) return this.mostrarErro('senha', 'Senha deve ter pelo menos 8 caracteres');
    this.verificarForcaSenha();
    this.mostrarSucesso('senha');
    return true;
  }

  validarConfirmacaoSenha() {
    const s1 = this.campoSenha.value || '';
    const s2 = this.campoConfirmarSenha.value || '';
    if (!s2) return this.mostrarErro('confirmar-senha', 'Confirmação de senha é obrigatória');
    if (s1 !== s2) return this.mostrarErro('confirmar-senha', 'As senhas não coincidem');
    this.mostrarSucesso('confirmar-senha');
    return true;
  }

  atualizarArquivo() {
    const file = this.campoArquivo.files && this.campoArquivo.files[0];
    const erro = document.getElementById('erro-arquivoDocumento');
    if (erro) { erro.textContent = ''; erro.className = 'apenas-leitura-tela'; }
    this.previewImagem.style.display = 'none';
    this.previewImagem.innerHTML = '';
    if (!file) {
      this.arquivoSelecionado.style.display = 'none';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.mostrarErro('arquivoDocumento', 'Arquivo muito grande (máx. 5MB)');
      this.campoArquivo.value = '';
      return;
    }
    const okTipo = /pdf|jpeg|jpg|png$/i.test(file.type || '') || /\.(pdf|jpe?g|png)$/i.test(file.name || '');
    if (!okTipo) {
      this.mostrarErro('arquivoDocumento', 'Formato inválido. Use PDF, JPG ou PNG.');
      this.campoArquivo.value = '';
      return;
    }
    this.arquivoNome.textContent = file.name;
    this.arquivoSelecionado.style.display = 'inline-flex';
    if (/^image\//.test(file.type)) {
      const img = document.createElement('img');
      img.alt = 'Pré-visualização do documento';
      img.style.maxWidth = '180px'; img.style.maxHeight = '120px'; img.style.borderRadius = '8px'; img.style.border = '1px solid #eee';
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result; };
      reader.readAsDataURL(file);
      this.previewImagem.innerHTML = '';
      this.previewImagem.appendChild(img);
      this.previewImagem.style.display = 'block';
    }
  }

  // Lê arquivo como DataURL base64
  lerArquivoComoBase64(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  setLoading(on) {
    if (!this.botaoCadastro) return;
    if (on) {
      this.botaoCadastro.classList.add('carregando');
      this.botaoCadastro.disabled = true;
      this.botaoCadastro.querySelector('span').style.opacity = '0';
    } else {
      this.botaoCadastro.classList.remove('carregando');
      this.botaoCadastro.disabled = false;
      this.botaoCadastro.querySelector('span').style.opacity = '1';
    }
  }

  async lidarEnvio(e) {
    e.preventDefault();
    const ok = [
      this.validarNome(),
      this.validarSobrenome(),
      this.validarEmail(),
      this.validarNomeLoja(),
      this.validarCPF(),
      this.validarSenha(),
      this.validarConfirmacaoSenha(),
    ].every(Boolean);
    if (!ok) return;

    this.setLoading(true);
    const API_BASE = window.API_BASE || window.location.origin;

    try {
      // Monta payload para /api/vendors/register
      let arquivoBase64 = null;
      const file = this.campoArquivo && this.campoArquivo.files && this.campoArquivo.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          this.mostrarErro('arquivoDocumento', 'Arquivo muito grande (máx. 5MB)');
          throw new Error('Arquivo muito grande');
        }
        // Aceita imagens e PDF; envia base64
        try {
          arquivoBase64 = await this.lerArquivoComoBase64(file);
        } catch (_) {
          arquivoBase64 = null;
        }
      }

      const payloadVendor = {
        nome: this.campoNome.value.trim(),
        sobrenome: this.campoSobrenome.value.trim(),
        email: this.campoEmail.value.trim(),
        senha: this.campoSenha.value,
        nomeLoja: this.campoNomeLoja.value.trim(),
        documento: (this.campoDocumento.value || '').replace(/\D+/g, ''),
        arquivoBase64
      };

      const r = await fetch(`${API_BASE}/api/vendors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payloadVendor)
      });
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      const data = ct.includes('application/json') ? await r.json().catch(() => ({})) : {};

      if (!(r.ok && data && data.success)) {
        const msg = (data && data.message) || 'Erro ao registrar vendedor';
        if (/email.+cadastrado/i.test(String(msg))) this.mostrarErro('email', 'E-mail já cadastrado');
        if (/obrigatóri|obrigatóri/i.test(String(msg))) {
          // Realça campos obrigatórios conhecidos
          if (!payloadVendor.nome) this.mostrarErro('nome', 'Obrigatório');
          if (!payloadVendor.email) this.mostrarErro('email', 'Obrigatório');
          if (!payloadVendor.senha) this.mostrarErro('senha', 'Obrigatório');
          if (!payloadVendor.nomeLoja) this.mostrarErro('nomeLoja', 'Obrigatório');
        }
        throw new Error(msg);
      }

      // Salvar também no localStorage para aparecer no painel-admin (fallback local)
      try {
        const emailKey = (payloadVendor.email || '').toLowerCase();
        const extras = {
          email: emailKey,
          nome: payloadVendor.nome || '',
          sobrenome: payloadVendor.sobrenome || '',
          nomeLoja: payloadVendor.nomeLoja || '',
          documento: payloadVendor.documento || '',
          arquivoDocumento: arquivoBase64 || null,
          status: 'pendente',
          criadoEm: Date.now()
        };
        localStorage.setItem('vendor:pending:' + emailKey, JSON.stringify(extras));
      } catch (_) {}

      this.notificar('Cadastro enviado! Aguarde aprovação da Loja.', 'sucesso');
      setTimeout(() => { window.location.href = '/login-vendedor'; }, 1200);
    } catch (err) {
      console.error('Cadastro vendedor falhou:', err);
      const msg = String(err && err.message) || 'Erro ao criar conta de vendedor';
      this.notificar(msg, 'erro');
    } finally {
      this.setLoading(false);
    }
  }

  notificar(msg, tipo) {
    const antigo = document.querySelector('.notificacao-sistema');
    if (antigo) antigo.remove();
    const n = document.createElement('div');
    n.className = `notificacao-sistema notificacao-${tipo}`;
    n.textContent = msg;
    n.style.cssText = 'position:fixed;top:20px;right:20px;padding:1rem 1.5rem;border-radius:8px;color:#fff;z-index:9999;background:' + (tipo === 'sucesso' ? '#28a745' : '#cc0000');
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FormularioCadastroVendedor();
});
