const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/db');

// Opções padrão de cookie para o token
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
};

// @desc    Registrar usuário
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    let { nome, sobrenome, email, senha, foto_perfil, role } = req.body || {};

    // Normalização básica
    nome = (typeof nome === 'string' ? nome.trim() : '');
    sobrenome = (typeof sobrenome === 'string' ? sobrenome.trim() : '');
    email = (typeof email === 'string' ? email.trim().toLowerCase() : '');
    senha = (typeof senha === 'string' ? senha : '');

    // Campos obrigatórios
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Nome, email e senha são obrigatórios.'
      });
    }

    // Validação de nome
    if (nome.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_NAME',
        message: 'Nome deve ter pelo menos 2 caracteres.'
      });
    }

    // Validação de formato de email
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
    if (!emailValido) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL_FORMAT',
        message: 'Formato de email inválido. Por favor, insira um email válido.'
      });
    }

    // Validação de senha
    if (senha.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'Senha deve ter pelo menos 8 caracteres.'
      });
    }

    // Verificar se o usuário já existe
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email já cadastrado.'
      });
    }

    // Normaliza role básica; só aceita valores conhecidos
    const ROLE_PADRAO = 'cliente';
    const roleNormalizado = (typeof role === 'string' && /^(cliente|vendedor|admin)$/i.test(role))
      ? role.toLowerCase()
      : ROLE_PADRAO;

    // Criar usuário (hash de senha no model)
    const user = await User.create({
      nome,
      sobrenome,
      email,
      senha,
      foto_perfil,
      role: roleNormalizado
    });

    // Importante: não autentica automaticamente após cadastro (fluxo exige login)
    res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso. Faça login para continuar.',
      user: {
        id: user.id,
        nome: user.nome,
        sobrenome: user.sobrenome,
        email: user.email,
        foto_perfil: user.foto_perfil,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao registrar usuário' });
  }
});

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body || {};
    // Determinar contexto de login (cliente ou vendedor) sem alterar o frontend
    // Ordem de precedência: body.context, query.context, header X-Login-Role, Referer
    const resolveLoginContext = () => {
      const rawBody = (typeof req.body?.context === 'string' ? req.body.context.trim().toLowerCase() : null);
      const rawQuery = (typeof req.query?.context === 'string' ? req.query.context.trim().toLowerCase() : null);
      const rawHeader = (typeof req.headers['x-login-role'] === 'string' ? String(req.headers['x-login-role']).trim().toLowerCase() : null);
      const ref = String(req.get('referer') || req.headers.referer || '').toLowerCase();
      const candidates = [rawBody, rawQuery, rawHeader].filter(Boolean);
      for (const c of candidates) {
        if (c === 'cliente' || c === 'vendedor') return c;
      }
      // Inferir por referer quando possível
      if (ref.includes('/login-vendedor')) return 'vendedor';
      if (ref.includes('/login')) return 'cliente';
      // Fallback padrão: cliente
      return 'cliente';
    };
    const loginContext = resolveLoginContext();

    // Campos obrigatórios
    if (!email || !senha) {
      return res.status(400).json({ success: false, message: 'Por favor, informe email e senha' });
    }

    // Validação de formato de email (frontend + backend)
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
    if (!emailValido) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL_FORMAT',
        message: 'Formato de email inválido. Por favor, insira um email válido.'
      });
    }

    // Verificar existência do usuário
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'EMAIL_NOT_REGISTERED',
        message: 'Email não cadastrado. Verifique o email ou cadastre-se.'
      });
    }

    // Verificar senha
    const isMatch = await user.matchPassword(senha);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'INCORRECT_PASSWORD',
        message: 'Senha incorreta. Tente novamente ou recupere sua senha.'
      });
    }

    // Restringir por role conforme contexto, com exceção para qualquer usuário com role admin
    const userRole = String(user.role || '').toLowerCase();
    const isAdminSpecial = userRole === 'admin';
    if (!isAdminSpecial) {
      if (loginContext === 'cliente' && userRole !== 'cliente') {
        // Responder 200 com sucesso=false para permitir exibição de mensagem no frontend atual
        return res.status(200).json({
          success: false,
          error: 'ROLE_NOT_ALLOWED',
          message: 'Esta página é apenas para clientes. Use o login de vendedor se for o caso.'
        });
      }
      if (loginContext === 'vendedor' && userRole !== 'vendedor') {
        return res.status(200).json({
          success: false,
          error: 'ROLE_NOT_ALLOWED',
          message: 'Esta página é apenas para vendedores. Use o login de cliente se for o caso.'
        });
      }
    }

    // Requisito: somente vendedores presentes na tabela "vendedor" podem logar no fluxo de vendedor
    // Exceção: qualquer usuário com role admin pode logar como vendedor mesmo sem registro em tabela vendedor
    if (loginContext === 'vendedor' && !isAdminSpecial) {
      const [vendRows] = await sequelize.query(
        `SELECT * FROM vendedor WHERE userId = :uid LIMIT 1`,
        { replacements: { uid: user.id } }
      );
      const vend = Array.isArray(vendRows) ? vendRows[0] : vendRows;
      if (!vend) {
        return res.status(200).json({
          success: false,
          error: 'VENDOR_NOT_REGISTERED',
          message: 'Seu usuário não está registrado como vendedor. Complete o cadastro de vendedor.'
        });
      }
      const status = String(vend.status || '').toLowerCase();
      if (status && status !== 'ativo') {
        return res.status(200).json({
          success: false,
          error: 'VENDOR_NOT_ACTIVE',
          message: 'Seu cadastro de vendedor não está ativo. Aguarde aprovação ou contate o suporte.'
        });
      }
    }

    const token = user.getSignedJwtToken();

    // Define cookie httpOnly
    res.cookie('token', token, cookieOptions);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        nome: user.nome,
        sobrenome: user.sobrenome,
        email: user.email,
        foto_perfil: user.foto_perfil,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao fazer login' });
  }
});

// @desc    Logout de usuário
// @route   POST /api/auth/logout
// @access  Public (limpa cookie)
router.post('/logout', (req, res) => {
  try {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.status(200).json({ success: true, message: 'Logout realizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao fazer logout' });
  }
});

// @desc    Obter usuário atual
// @route   GET /api/auth/me
// @access  Private
router.get('/me', async (req, res) => {
  try {
    // Verificar token via Bearer ou Cookie
    const bearer = req.headers.authorization?.split(' ')[1];
    const token = bearer || req.parsedCookies?.token;
    if (!token) {
      return res.status(200).json({ success: false, message: 'Não autenticado', user: null });
    }

    // Verifica somente com segredo principal configurado
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(200).json({ success: false, message: 'Não autenticado', user: null });
    }
    let decoded = null;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      return res.status(200).json({ success: false, message: 'Não autenticado', user: null });
    }
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        sobrenome: user.sobrenome,
        email: user.email,
        foto_perfil: user.foto_perfil,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(200).json({ success: false, message: 'Não autenticado', user: null });
  }
});

module.exports = router;
