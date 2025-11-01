const express = require('express')
const router = express.Router()
const { sequelize } = require('../config/db')

// Ping para validar registro da rota
router.get('/ping', (req, res) => {
  return res.json({ ok: true, route: 'contact' })
})

// Cria registro de contato do cliente
router.post('/', async (req, res) => {
  try {
    let { nome, email, mensagem, telefone } = req.body || {}
    nome = typeof nome === 'string' ? nome.trim() : ''
    email = typeof email === 'string' ? email.trim() : ''
    mensagem = typeof mensagem === 'string' ? mensagem.trim() : ''
    telefone = typeof telefone === 'string' ? telefone.trim() : null

    if (!nome || !email || !mensagem) {
      return res.status(400).json({ ok: false, message: 'Campos obrigatórios: nome, email, mensagem.' })
    }

    const sql = `
      INSERT INTO contato_cliente (nome, email, mensagem, telefone, created_at)
      VALUES (:nome, :email, :mensagem, :telefone, CURRENT_TIMESTAMP)
    `
    await sequelize.query(sql, { replacements: { nome, email, mensagem, telefone } })

    return res.status(201).json({ ok: true, message: 'Contato registrado com sucesso.' })
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Erro interno ao registrar contato.', error: String(e && e.message || e) })
  }
})

module.exports = router
