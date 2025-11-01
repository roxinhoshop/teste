// Classe para manuseio do formulário de cadastro
class FormularioCadastro {
    constructor() {
        this.formulario = document.getElementById('formularioCadastro');
        this.entradaNome = document.getElementById('nome');
        this.entradaSobrenome = document.getElementById('sobrenome');
        this.entradaEmail = document.getElementById('email');
        this.entradaSenha = document.getElementById('senha');
        this.entradaConfirmarSenha = document.getElementById('confirmarSenha');
        this.botaoCadastro = document.getElementById('botaoCadastro');
        this.indicadorContainer = document.getElementById('indicador-senha-container');
        this.progressoSenha = document.getElementById('progresso-senha');
        this.nivelSenha = document.getElementById('nivel-senha');
        this.pontuacaoSenha = document.getElementById('pontuacao-senha');
        this.avisoSenhaCurta = document.getElementById('aviso-senha-curta');
        
        this.inicializar();
    }

    inicializar() {
        this.formulario.addEventListener('submit', this.lidarComEnvio.bind(this));
        
        // Validações em tempo real
        this.entradaNome.addEventListener('blur', () => this.validarNome());
        this.entradaNome.addEventListener('input', () => this.limparErro('nome'));
        
        this.entradaSobrenome.addEventListener('blur', () => this.validarSobrenome());
        this.entradaSobrenome.addEventListener('input', () => this.limparErro('sobrenome'));
        
        this.entradaEmail.addEventListener('blur', () => this.validarEmail());
        this.entradaEmail.addEventListener('input', () => this.limparErro('email'));
        
        this.entradaSenha.addEventListener('input', () => {
            this.verificarForcaSenha();
            this.limparErro('senha');

            // ✅ Revalida confirmação em tempo real
            this.validarConfirmacaoSenha();
        });
        
        this.entradaConfirmarSenha.addEventListener('input', () => {
            this.validarConfirmacaoSenha();
        });

        const toggleSenha = document.getElementById('toggleSenhaCadastro');
        if (toggleSenha) {
            toggleSenha.addEventListener('click', () => {
                const mostrar = this.entradaSenha && this.entradaSenha.type === 'password';
                if (this.entradaSenha) this.entradaSenha.type = mostrar ? 'text' : 'password';
                toggleSenha.classList.toggle('active', mostrar);
                toggleSenha.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
            });
        }

        const toggleConfirmar = document.getElementById('toggleConfirmarSenha');
        if (toggleConfirmar) {
            toggleConfirmar.addEventListener('click', () => {
                const mostrar = this.entradaConfirmarSenha && this.entradaConfirmarSenha.type === 'password';
                if (this.entradaConfirmarSenha) this.entradaConfirmarSenha.type = mostrar ? 'text' : 'password';
                toggleConfirmar.classList.toggle('active', mostrar);
                toggleConfirmar.setAttribute('aria-label', mostrar ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha');
            });
        }
    }

    validarNome() {
        const nome = this.entradaNome.value.trim();
        if (!nome) return this.mostrarErro('nome', 'Nome é obrigatório');
        if (nome.length < 2) return this.mostrarErro('nome', 'Nome deve ter pelo menos 2 caracteres');
        if (!/^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(nome)) return this.mostrarErro('nome', 'Nome deve conter apenas letras');
        this.mostrarSucesso('nome'); return true;
    }

    validarSobrenome() {
        const sobrenome = this.entradaSobrenome.value.trim();
        if (!sobrenome) return this.mostrarErro('sobrenome', 'Sobrenome é obrigatório');
        if (sobrenome.length < 2) return this.mostrarErro('sobrenome', 'Sobrenome deve ter pelo menos 2 caracteres');
        if (!/^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(sobrenome)) return this.mostrarErro('sobrenome', 'Sobrenome deve conter apenas letras');
        this.mostrarSucesso('sobrenome'); return true;
    }

    validarEmail() {
        const email = this.entradaEmail.value.trim();
        const padraoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return this.mostrarErro('email', 'E-mail é obrigatório');
        if (!padraoEmail.test(email)) return this.mostrarErro('email', 'E-mail inválido');
        this.mostrarSucesso('email'); return true;
    }

    verificarForcaSenha() {
        const senha = this.entradaSenha.value;
        
        if (senha.length === 0) {
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
        else if (senha.length < 12) score = 20;
        else if (senha.length < 16) score = 40;
        else score = 90;

        if (/[a-z]/.test(senha)) score += 1;
        if (/[A-Z]/.test(senha)) score += 10;
        if (/[0-9]/.test(senha)) score += 10;
        if (/[^A-Za-z0-9]/.test(senha)) score += 10;

        score = Math.min(score, 100);

        let nivel, classe;
        if (score < 40) { nivel = 'Fraca'; classe = 'forca-fraca'; }
        else if (score < 80) { nivel = 'Moderada'; classe = 'forca-moderada'; }
        else { nivel = 'Forte'; classe = 'forca-forte'; }

        this.indicadorContainer.className = 'indicador-senha-container visivel';
        this.indicadorContainer.classList.add(classe);

        this.progressoSenha.style.width = `${Math.min(score, 100)}%`;
        this.nivelSenha.textContent = nivel;

        return score;
    }

    validarSenha() {
        const senha = this.entradaSenha.value;
        if (!senha) return this.mostrarErro('senha', 'Senha é obrigatória');
        if (senha.length < 8) return this.mostrarErro('senha', 'Senha deve ter pelo menos 8 caracteres');
        this.verificarForcaSenha();
        this.mostrarSucesso('senha'); return true;
    }

    validarConfirmacaoSenha() {
        const senha = this.entradaSenha.value;
        const confirmarSenha = this.entradaConfirmarSenha.value;

        if (!confirmarSenha) {
            return this.mostrarErro('confirmar-senha', 'Confirmação de senha é obrigatória');
        }
        if (senha !== confirmarSenha) {
            return this.mostrarErro('confirmar-senha', 'As senhas não coincidem');
        }

        this.mostrarSucesso('confirmar-senha');
        return true;
    }

    mostrarErro(campo, mensagem) {
        const entrada = document.getElementById(campo === 'confirmar-senha' ? 'confirmarSenha' : campo);
        const divErro = document.getElementById(`erro-${campo}`);

        entrada.classList.remove('valido');
        entrada.classList.add('invalido');

        divErro.textContent = mensagem;
        divErro.classList.remove('apenas-leitura-tela');
        divErro.classList.add('mensagem-erro', 'visivel');
        return false;
    }

    mostrarSucesso(campo) {
        const entrada = document.getElementById(campo === 'confirmar-senha' ? 'confirmarSenha' : campo);
        const divErro = document.getElementById(`erro-${campo}`);

        entrada.classList.remove('invalido');
        entrada.classList.add('valido');

        divErro.textContent = '';
        divErro.className = 'apenas-leitura-tela';
    }

    limparErro(campo) {
        const entrada = document.getElementById(campo === 'confirmar-senha' ? 'confirmarSenha' : campo);
        const divErro = document.getElementById(`erro-${campo}`);

        entrada.classList.remove('invalido', 'valido');
        divErro.textContent = '';
        divErro.className = 'apenas-leitura-tela';
    }

    definirCarregamento(carregando) {
        if (carregando) {
            this.botaoCadastro.classList.add('carregando');
            this.botaoCadastro.disabled = true;
            this.botaoCadastro.querySelector('span').style.opacity = '0';
        } else {
            this.botaoCadastro.classList.remove('carregando');
            this.botaoCadastro.disabled = false;
            this.botaoCadastro.querySelector('span').style.opacity = '1';
        }
    }

    async lidarComEnvio(evento) {
        evento.preventDefault();

        const nomeValido = this.validarNome();
        const sobrenomeValido = this.validarSobrenome();
        const emailValido = this.validarEmail();
        const senhaValida = this.validarSenha();
        const confirmacaoValida = this.validarConfirmacaoSenha();

        if (!nomeValido || !sobrenomeValido || !emailValido || !senhaValida || !confirmacaoValida) {
            return;
        }

        this.definirCarregamento(true);

        try {
            const API_BASE = window.API_BASE || window.location.origin;
            const dadosUsuario = {
                nome: this.entradaNome.value.trim(),
                sobrenome: this.entradaSobrenome.value.trim(),
                email: this.entradaEmail.value.trim(),
                senha: this.entradaSenha.value
            };

            const resposta = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosUsuario),
                credentials: 'include'
            });
            const ct = (resposta.headers.get('content-type') || '').toLowerCase();
            const dados = ct.includes('application/json')
                ? await resposta.json().catch(() => ({}))
                : {};

            if (!(resposta.ok && dados && dados.success)) {
                const code = (dados && (dados.error || dados.code)) || '';
                const msg = (dados && dados.message) || 'Erro ao criar conta';
                if (code === 'INVALID_EMAIL_FORMAT' || /email inválido/i.test(msg)) {
                    this.mostrarErro('email', 'E-mail inválido');
                } else if (code === 'EMAIL_ALREADY_REGISTERED' || /já cadastrado/i.test(msg)) {
                    this.mostrarErro('email', 'E-mail já cadastrado');
                } else if (code === 'WEAK_PASSWORD' || /Senha.*8/i.test(msg)) {
                    this.mostrarErro('senha', 'Senha deve ter pelo menos 8 caracteres');
                } else if (code === 'MISSING_FIELDS') {
                    this.mostrarNotificacao('Preencha todos os campos obrigatórios.', 'erro');
                } else if (code === 'INVALID_NAME') {
                    this.mostrarErro('nome', 'Nome deve ter pelo menos 2 caracteres');
                } else {
                    this.mostrarNotificacao(msg, 'erro');
                }
                throw new Error(msg);
            }

            // Sucesso: backend não autentica no cadastro; usuário deve logar
            this.mostrarNotificacao('Conta criada com sucesso! Redirecionando para login...', 'sucesso');
            
            // Redirecionar para página de login
            setTimeout(() => {
                window.location.href = '/login';
            }, 1200);
            
        } catch (erro) {
            console.error('Erro no cadastro:', erro);
            if (!String(erro && erro.message)) {
                this.mostrarNotificacao('Erro ao criar conta. Tente novamente.', 'erro');
            } else if (!/Redirecionando/.test(erro.message)) {
                this.mostrarNotificacao(erro.message, 'erro');
            }
        } finally {
            this.definirCarregamento(false);
        }
    }

    mostrarNotificacao(mensagem, tipo = 'info') {
        const notificacaoAnterior = document.querySelector('.notificacao-sistema');
        if (notificacaoAnterior) { notificacaoAnterior.remove(); }

        const notificacao = document.createElement('div');
        notificacao.className = `notificacao-sistema notificacao-${tipo}`;
        notificacao.textContent = mensagem;

        notificacao.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
        `;

        document.body.appendChild(notificacao);
        setTimeout(() => notificacao.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FormularioCadastro();
});
