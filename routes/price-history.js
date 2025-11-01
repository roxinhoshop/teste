const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PriceHistory = require('../models/PriceHistory');
const { scrapeMercadoLivre, scrapeAmazon, upsertProduct } = require('../scripts/import-from-links');

// Middleware de autenticação e admin (copiado de users.js)
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

const requireAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acesso restrito a administradores' });
  }
  next();
};

// GET /api/price-history?produto_id=123&range=30&plataforma=Amazon
router.get('/', async (req, res) => {
  try {
    const produto_id = parseInt(req.query.produto_id, 10);
    if (!produto_id) {
      return res.status(400).json({ success: false, message: 'produto_id é obrigatório' });
    }
    const rangeDias = Math.max(1, Math.min(365, parseInt(req.query.range || '90', 10)));
    const plataforma = (req.query.plataforma || '').trim();

    const dataMin = new Date(Date.now() - rangeDias * 24 * 60 * 60 * 1000);

    const where = {
      produto_id,
      data_coleta: { [Op.gte]: dataMin }
    };
    if (plataforma) where.plataforma = plataforma;

    const registros = await PriceHistory.findAll({
      where,
      order: [['data_coleta', 'ASC']]
    });

    const data = registros.map(r => ({
      id: r.id,
      produto_id: r.produto_id,
      plataforma: r.plataforma,
      preco: Number(r.preco),
      data_coleta: r.data_coleta
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Erro ao listar histórico de preços:', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar histórico de preços' });
  }
});

module.exports = router;

// POST /api/price-history/scrape
// Body: { amazon?: string, ml?: string, titulo?: string }
router.post('/scrape', auth, requireAdmin, async (req, res) => {
  try {
    const amazonUrl = typeof req.body.amazon === 'string' ? req.body.amazon.trim() : '';
    const mlUrl = typeof req.body.ml === 'string' ? req.body.ml.trim() : '';
    const tituloPadrao = typeof req.body.titulo === 'string' ? req.body.titulo.trim() : '';
    if (!amazonUrl && !mlUrl) {
      return res.status(400).json({ success: false, message: 'Informe pelo menos um link: amazon ou ml' });
    }

    const ml = mlUrl ? await scrapeMercadoLivre(mlUrl) : { price: null, images: [], installments: [], mlbId: null, url: null };
    const amz = amazonUrl ? await scrapeAmazon(amazonUrl) : { price: null, images: [], installments: [], asin: null, url: null };
    const produto = await upsertProduct({ tituloPadrao, ml, amz });
    const p = produto.get({ plain: true });
    return res.status(200).json({ success: true, product: {
      id: p.id,
      titulo: p.titulo,
      precoMercadoLivre: p.precoMercadoLivre,
      precoAmazon: p.precoAmazon,
      linkMercadoLivre: p.linkMercadoLivre,
      linkAmazon: p.linkAmazon,
      mercadoLivreId: p.mercadoLivreId,
      amazonAsin: p.amazonAsin,
    }});
  } catch (err) {
    console.error('Erro no scrape de histórico de preços:', err);
    return res.status(500).json({ success: false, message: 'Erro ao coletar dados e atualizar histórico' });
  }
});
