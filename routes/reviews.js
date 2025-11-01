const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Review = require('../models/Review');
const { saveBase64Image, removeLocalImage } = require('../utils/saveBase64');

// Util para mapear review do BD para formato do frontend atual
const mapReviewToFrontend = (r) => {
  const nome = r.usuario_nome || 'Usuário';
  const avatar = nome.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'US';
  return {
    id: r.id,
    usuarioNome: nome,
    usuarioAvatar: avatar,
    nota: r.nota,
    titulo: r.titulo || '',
    comentario: r.comentario || '',
    data: r.data_postagem,
    compraVerificada: true, // simplificação
    fotos: Array.isArray(r.fotos) ? r.fotos : [],
  };
};

// GET /api/reviews?produto_id=123
router.get('/', async (req, res) => {
  try {
    const produto_id = parseInt(req.query.produto_id, 10);
    if (!produto_id) return res.status(400).json({ success: false, message: 'produto_id é obrigatório' });

    const reviews = await Review.findAll({
      where: { produto_id },
      order: [['data_postagem', 'DESC']],
    });

    return res.json({ success: true, data: reviews.map(mapReviewToFrontend) });
  } catch (err) {
    console.error('Erro ao listar avaliações:', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar avaliações' });
  }
});

// POST /api/reviews
router.post('/', async (req, res) => {
  try {
    const { produto_id, usuario_id, usuario_nome, nota, titulo, comentario, fotos } = req.body || {};
    if (!produto_id) return res.status(400).json({ success: false, message: 'produto_id é obrigatório' });
    const notaInt = parseInt(nota, 10);
    if (!notaInt || notaInt < 1 || notaInt > 5) return res.status(400).json({ success: false, message: 'nota deve ser 1..5' });

    // Processar fotos: salvar base64 como arquivos locais e manter URLs existentes
    const fotosInput = Array.isArray(fotos) ? fotos : [];
    const fotosUrls = [];
    for (const f of fotosInput) {
      if (typeof f === 'string' && f.startsWith('data:image/')) {
        const saved = await saveBase64Image(
          f,
          'reviews',
          `prod-${produto_id}-user-${usuario_id || 'anon'}`
        );
        if (saved) fotosUrls.push(saved);
      } else if (typeof f === 'string' && f.trim()) {
        fotosUrls.push(f.trim());
      }
    }

    const created = await Review.create({
      produto_id,
      usuario_id: usuario_id || null,
      usuario_nome: usuario_nome || 'Anônimo',
      nota: notaInt,
      titulo: titulo || null,
      comentario: comentario || null,
      fotos: fotosUrls,
      data_postagem: new Date(),
    });

    return res.status(201).json({ success: true, data: mapReviewToFrontend(created) });
  } catch (err) {
    console.error('Erro ao criar avaliação:', err);
    return res.status(500).json({ success: false, message: 'Erro ao criar avaliação' });
  }
});





// DELETE /api/reviews/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Avaliação não encontrada' });
    }

    // Remover imagens locais associadas à avaliação (se houver)
    const fotosList = Array.isArray(review.fotos) ? review.fotos : [];
    for (const f of fotosList) {
      await removeLocalImage(f);
    }

    await Review.destroy({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir avaliação:', err);
    return res.status(500).json({ success: false, message: 'Erro ao excluir avaliação' });
  }
});

module.exports = router;
