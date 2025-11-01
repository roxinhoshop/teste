const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
// saveBase64 utilities não são necessários para avatar em base64 no banco
// SearchHistory removido: funcionalidades de histórico de busca foram descontinuadas

// Middleware para verificar autenticação (Cookie httpOnly ou Bearer)
const auth = async (req, res, next) => {
  try {
    const bearer = req.headers.authorization?.split(' ')[1];
    const token = bearer || req.parsedCookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Não autorizado' });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(401).json({ success: false, message: 'Não autorizado' });
    }
    let decoded = null;
    try { decoded = jwt.verify(token, secret); } catch (e) {}
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Não autorizado' });
    }
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Não autorizado' });
  }
};

// Middleware para restringir a administradores
const requireAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acesso restrito a administradores' });
  }
  next();
};

// @desc    Listar todos os usuários (admin)
// @route   GET /api/users/
// @access  Private/Admin
router.get('/', auth, requireAdmin, async (_req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'nome', 'sobrenome', 'email', 'role']
    });
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return res.status(500).json({ success: false, message: 'Erro ao listar usuários' });
  }
});

// @desc    Editar usuário (admin) - exceto senha
// @route   PUT /api/users/:id
// @access  Private/Admin
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });
    const usuario = await User.findByPk(id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

    const { nome, sobrenome, email, role } = req.body || {};
    if (typeof nome === 'string') usuario.nome = nome;
    if (typeof sobrenome === 'string') usuario.sobrenome = sobrenome;
    if (typeof email === 'string') usuario.email = email;
    if (typeof role === 'string') {
      const r = role.trim().toLowerCase();
      const permitidos = new Set(['cliente','admin','vendedor']);
      if (!permitidos.has(r)) {
        return res.status(400).json({ success: false, message: 'Role inválida' });
      }
      usuario.role = r;
    }

    await usuario.save();
    return res.status(200).json({ success: true, data: {
      id: usuario.id,
      nome: usuario.nome,
      sobrenome: usuario.sobrenome,
      email: usuario.email,
      role: usuario.role,
    }});
  } catch (error) {
    console.error('Erro ao editar usuário:', error);
    return res.status(500).json({ success: false, message: 'Erro ao editar usuário' });
  }
});

// @desc    Excluir usuário (admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });

    const usuario = await User.findByPk(id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

    await usuario.destroy();
    return res.status(200).json({ success: true, message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return res.status(500).json({ success: false, message: 'Erro ao excluir usuário' });
  }
});

// @desc    Atualizar perfil do usuário (nome, sobrenome, email opcional)
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { nome, sobrenome, email } = req.body;
    const user = req.user;

    if (typeof nome === 'string') user.nome = nome;
    if (typeof sobrenome === 'string') user.sobrenome = sobrenome;
    if (typeof email === 'string') user.email = email;

    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        sobrenome: user.sobrenome,
        email: user.email,
        foto_perfil: user.foto_perfil
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
  }
});

// @desc    Alterar senha
// @route   PUT /api/users/password
// @access  Private
router.put('/password', auth, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    const user = req.user;

    const isMatch = await user.matchPassword(senhaAtual);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Senha atual incorreta' });
    }

    user.senha = novaSenha;
    await user.save();

    res.status(200).json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao alterar senha' });
  }
});

// @desc    Atualizar avatar do usuário via Base64
// @route   POST /api/users/avatar
// @access  Private
router.post('/avatar', auth, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'Imagem inválida' });
    }

    // Armazenar imagem diretamente em foto_perfil (base64)
    req.user.foto_perfil = imageBase64;
    await req.user.save();

    res.status(200).json({
      success: true,
      foto_perfil: req.user.foto_perfil,
      user: {
        id: req.user.id,
        nome: req.user.nome,
        sobrenome: req.user.sobrenome,
        email: req.user.email,
        foto_perfil: req.user.foto_perfil
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar avatar' });
  }
});

// @desc    Remover avatar do usuário e voltar ao padrão
// @route   DELETE /api/users/avatar
// @access  Private
router.delete('/avatar', auth, async (req, res) => {
  try {
    // Limpar referência no banco
    req.user.foto_perfil = null;
    await req.user.save();

    return res.status(200).json({ success: true, foto_perfil: null });
  } catch (error) {
    console.error('Erro ao remover avatar:', error);
    return res.status(500).json({ success: false, message: 'Erro ao remover avatar' });
  }
});

module.exports = router;

// === Histórico de Buscas do Usuário ===
// @desc    Registrar evento de busca/previsão
// @route   POST /api/users/search-history
// @access  Private
router.post('/search-history', auth, async (_req, res) => {
  return res.status(410).json({ success: false, message: 'Funcionalidade removida' })
})

// @desc    Obter histórico de buscas do usuário logado
// @route   GET /api/users/search-history
// @access  Private
router.get('/search-history', auth, async (_req, res) => {
  return res.status(410).json({ success: false, message: 'Funcionalidade removida' })
})
