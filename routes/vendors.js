const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const { sequelize } = require('../config/db')
const User = require('../models/User')
const Product = require('../models/Product')
const PriceHistory = require('../models/PriceHistory')

// Middleware de autenticação (reaproveita lógica de users.js)
const auth = async (req, res, next) => {
  try {
    const bearer = req.headers.authorization?.split(' ')[1]
    const token = bearer || req.parsedCookies?.token
    if (!token) {
      return res.status(401).json({ success: false, message: 'Não autorizado' })
    }
    const secret = process.env.JWT_SECRET
    if (!secret) {
      return res.status(401).json({ success: false, message: 'Não autorizado' })
    }
    let decoded = null
    try { decoded = jwt.verify(token, secret) } catch (e) {}
    if (!decoded) return res.status(401).json({ success: false, message: 'Não autorizado' })
    const user = await User.findByPk(decoded.id)
    if (!user) return res.status(401).json({ success: false, message: 'Usuário não encontrado' })
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Não autorizado' })
  }
}

const requireAdmin = (req, res, next) => {
  // Permitir qualquer usuário com role 'admin'
  const isAdminRole = req.user && String(req.user.role).toLowerCase() === 'admin'
  if (!req.user || !isAdminRole) {
    return res.status(403).json({ success: false, message: 'Acesso restrito a administradores' })
  }
  next()
}

// Helper: obter registro de vendedor por userId
async function getVendorByUserId(uid) {
  const [vendRows] = await sequelize.query(`SELECT * FROM vendedor WHERE userId = :uid LIMIT 1`, { replacements: { uid } })
  const vend = Array.isArray(vendRows) ? vendRows[0] : vendRows
  return vend || null
}

// Helper: garantir que Admin ID 1 tenha registro de vendedor (auto-provisionamento)
async function ensureVendorForUser(user) {
  const uid = Number(user?.id)
  if (!uid) return null
  let vend = await getVendorByUserId(uid)
  if (vend) return vend
  const isAdminSpecial = String(user.role || '').toLowerCase() === 'admin'
  if (!isAdminSpecial) return null
  const nomeLoja = String(user.nome || 'Admin Roxinho Shop').slice(0, 60)
  await sequelize.query(
    `INSERT INTO vendedor (userId, nomeLoja, documento, arquivoDocumento, status, criadoEm)
     VALUES (:userId, :nomeLoja, :documento, :arquivoDocumento, :status, :criadoEm)`,
    { replacements: { userId: uid, nomeLoja, documento: null, arquivoDocumento: null, status: 'ativo', criadoEm: new Date() } }
  )
  vend = await getVendorByUserId(uid)
  return vend || null
}

// Util: salva arquivo base64 em /imagens/vendors e retorna caminho relativo
async function salvarArquivoBase64(base64Str, prefix = 'doc') {
  try {
    if (!base64Str || typeof base64Str !== 'string') return null
    const match = base64Str.match(/^data:(.+);base64,(.*)$/)
    const data = match ? match[2] : base64Str
    const ext = match ? (match[1].split('/')[1] || 'bin') : 'bin'
    const buffer = Buffer.from(data, 'base64')
    const dir = path.join(__dirname, '../../imagens/vendors')
    fs.mkdirSync(dir, { recursive: true })
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const fullPath = path.join(dir, filename)
    fs.writeFileSync(fullPath, buffer)
    return `/imagens/vendors/${filename}`
  } catch (_) {
    return null
  }
}

// POST /api/vendors/register - cria usuário com role vendedor e registro de vendedor
router.post('/register', async (req, res) => {
  try {
    let { nome, sobrenome, email, senha, foto_perfil, nomeLoja, documento, arquivoBase64 } = req.body || {}

    nome = (typeof nome === 'string' ? nome.trim() : '')
    sobrenome = (typeof sobrenome === 'string' ? sobrenome.trim() : '')
    email = (typeof email === 'string' ? email.trim().toLowerCase() : '')
    senha = (typeof senha === 'string' ? senha : '')
    nomeLoja = (typeof nomeLoja === 'string' ? nomeLoja.trim() : '')
    documento = (typeof documento === 'string' ? documento.trim() : '')

    if (!nome || !email || !senha || !nomeLoja) {
      return res.status(400).json({ success: false, message: 'Nome, email, senha e nome da loja são obrigatórios.' })
    }

    const jaExiste = await User.findOne({ where: { email } })
    if (jaExiste) {
      return res.status(400).json({ success: false, message: 'Email já cadastrado.' })
    }

  const user = await User.create({ nome, sobrenome, email, senha, foto_perfil: foto_perfil || null, role: 'vendedor' })

    let arquivoDocumento = null
    if (arquivoBase64) {
      arquivoDocumento = await salvarArquivoBase64(arquivoBase64, 'vendedor')
    }

    // Insere registro na tabela vendedor (nomeVendedor separado de nomeLoja)
    const nomeVendedor = `${nome}${sobrenome ? ' ' + sobrenome : ''}`.trim().slice(0, 255)
  await sequelize.query(
      `INSERT INTO vendedor (userId, nomeVendedor, nomeLoja, documento, arquivoDocumento, status, criadoEm)
       VALUES (:userId, :nomeVendedor, :nomeLoja, :documento, :arquivoDocumento, :status, :criadoEm)`,
      {
        replacements: {
          userId: user.id,
          nomeVendedor: nomeVendedor || null,
          nomeLoja,
          documento: documento || null,
          arquivoDocumento: arquivoDocumento || null,
          status: 'pendente',
          criadoEm: new Date()
        }
      }
    )

    const [rows] = await sequelize.query(
      `SELECT * FROM vendedor WHERE userId = :uid LIMIT 1`,
      { replacements: { uid: user.id } }
    )
    const vend = Array.isArray(rows) ? rows[0] : rows

    // Também registra o cadastro como pendente na tabela cadastros_pendentes
    try {
      const agora = new Date()
      await sequelize.query(
        `INSERT INTO cadastros_pendentes (vendedorId, nomeLoja, telefone, sobre, criadoEm, atualizadoEm)
         VALUES (:vendedorId, :nomeLoja, :telefone, :sobre, :criadoEm, :atualizadoEm)`,
        { replacements: { vendedorId: vend.id, nomeLoja, telefone: null, sobre: null, criadoEm: agora, atualizadoEm: agora } }
      )
    } catch (e) {
      console.warn('Falha ao inserir em cadastros_pendentes:', e?.message || e)
    }

    return res.status(201).json({
      success: true,
      user: { id: user.id, nome: user.nome, sobrenome: user.sobrenome, email: user.email, foto_perfil: user.foto_perfil, role: user.role },
      vendor: vend || null
    })
  } catch (err) {
    console.error('Erro ao registrar vendedor:', err)
    return res.status(500).json({ success: false, message: 'Erro ao registrar vendedor' })
  }
})

// GET /api/vendors - lista vendedores (admin)
router.get('/', auth, requireAdmin, async (_req, res) => {
  try {
    // Garantir que o admin ID 1 também apareça como vendedor
    try {
      const [uRows] = await sequelize.query(`SELECT * FROM usuario WHERE id = 1 LIMIT 1`)
      const adm1 = Array.isArray(uRows) ? uRows[0] : uRows
      if (adm1 && String(adm1.role || '').toLowerCase() === 'admin') {
        await ensureVendorForUser(adm1)
      }
    } catch (e) {
      console.warn('Falha ao provisionar vendedor para admin ID 1:', e?.message || e)
    }

    const [rows] = await sequelize.query(`
      SELECT v.*, u.nome, u.sobrenome, u.email, u.foto_perfil, u.role
      FROM vendedor v
      INNER JOIN usuario u ON u.id = v.userId
      ORDER BY v.id DESC
    `)
    return res.json({ success: true, data: rows })
  } catch (err) {
    console.error('Erro ao listar vendedores:', err)
    return res.status(500).json({ success: false, message: 'Erro ao listar vendedores' })
  }
})

// GET /api/vendors/pending - lista cadastros pendentes (admin)
router.get('/pending', auth, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT cp.*, 
             v.id AS vendedorId, v.userId AS userId, v.nomeVendedor, v.nomeLoja, v.documento, v.arquivoDocumento, v.status AS statusVendor, v.criadoEm AS criadoEmVendor,
             u.nome, u.sobrenome, u.email, u.foto_perfil, u.role
      FROM cadastros_pendentes cp
      INNER JOIN vendedor v ON v.id = cp.vendedorId
      INNER JOIN usuario u ON u.id = v.userId
      ORDER BY cp.criadoEm DESC
    `)
    return res.json({ success: true, data: rows })
  } catch (err) {
    console.error('Erro ao listar cadastros pendentes:', err)
    return res.status(500).json({ success: false, message: 'Erro ao listar cadastros pendentes' })
  }
})

// PUT /api/vendors/:id - editar vendedor (admin)
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' })
    }

    // Busca o registro atual
    const [vendRows] = await sequelize.query(`SELECT * FROM vendedor WHERE id = :id LIMIT 1`, { replacements: { id } })
    const vend = Array.isArray(vendRows) ? vendRows[0] : vendRows
    if (!vend) return res.status(404).json({ success: false, message: 'Vendedor não encontrado' })

    let { status, documento, nomeLoja, arquivoBase64, nome, sobrenome, removeArquivoDocumento } = req.body || {}

    status = typeof status === 'string' ? status.trim() : undefined
    documento = typeof documento === 'string' ? documento.trim() : undefined
    nomeLoja = typeof nomeLoja === 'string' ? nomeLoja.trim() : undefined
    removeArquivoDocumento = Boolean(removeArquivoDocumento)

    let arquivoDocumento = null
    if (arquivoBase64) {
      arquivoDocumento = await salvarArquivoBase64(arquivoBase64, 'vendedor')
    }

    // Se um novo arquivo foi enviado ou se foi sinalizado para remover, apaga o arquivo anterior do vendedor
    try {
      const prev = typeof vend.arquivoDocumento === 'string' ? vend.arquivoDocumento.trim() : null
      const shouldDeletePrev = removeArquivoDocumento || Boolean(arquivoDocumento)
      if (shouldDeletePrev && prev && /^\/?imagens\/vendors\//.test(prev)) {
        const normalized = prev.replace(/^\//, '')
        const oldPath = path.join(__dirname, '../../', normalized)
        await fs.promises.unlink(oldPath).catch(() => {})
      }
    } catch (_) {}

    // Calcula novos valores preservando os existentes quando não enviados
    const novo = {
      status: status || vend.status,
      documento: documento !== undefined ? documento || null : vend.documento,
      nomeLoja: nomeLoja || vend.nomeLoja,
      arquivoDocumento: removeArquivoDocumento ? null : (arquivoDocumento || vend.arquivoDocumento)
    }

    // Atualiza dados do vendedor, incluindo nomeVendedor se nome/sobrenome forem enviados
    await sequelize.query(`
      UPDATE vendedor
      SET status = :status,
          documento = :documento,
          nomeLoja = :nomeLoja,
          arquivoDocumento = :arquivoDocumento
      WHERE id = :id
    `, { replacements: { ...novo, id } })

    // Se foi aprovado, remover pendência correspondente
    try {
      const novoStatus = String(novo.status || '').toLowerCase()
      const statusAnterior = String(vend.status || '').toLowerCase()
      // Ao aprovar (ativo) ou rejeitar (inativo) um cadastro que estava pendente,
      // remover a entrada correspondente em cadastros_pendentes
      if (statusAnterior === 'pendente' && (novoStatus === 'ativo' || novoStatus === 'inativo')) {
        await sequelize.query(`DELETE FROM cadastros_pendentes WHERE vendedorId = :vid`, { replacements: { vid: id } })
      }
    } catch (e) {
      console.warn('Falha ao limpar pendência em cadastros_pendentes:', e?.message || e)
    }

    // Atualiza dados do usuário se enviados
    if (typeof nome === 'string' || typeof sobrenome === 'string') {
      const nomeVal = typeof nome === 'string' ? nome.trim() : undefined
      const sobrenomeVal = typeof sobrenome === 'string' ? sobrenome.trim() : undefined
      const [userRows] = await sequelize.query(`SELECT * FROM usuario WHERE id = :uid LIMIT 1`, { replacements: { uid: vend.userId } })
      const u = Array.isArray(userRows) ? userRows[0] : userRows
      if (u) {
        const novoNome = nomeVal !== undefined ? nomeVal : u.nome
        const novoSobrenome = sobrenomeVal !== undefined ? sobrenomeVal : u.sobrenome
        await sequelize.query(`
          UPDATE usuario
          SET nome = :nome, sobrenome = :sobrenome
          WHERE id = :uid
        `, { replacements: { nome: novoNome, sobrenome: novoSobrenome, uid: vend.userId } })
        const nomeVendedorAtualizado = `${(novoNome || '').trim()}${(novoSobrenome || '').trim() ? ' ' + (novoSobrenome || '').trim() : ''}`.trim().slice(0, 255)
        await sequelize.query(`
          UPDATE vendedor
          SET nomeVendedor = :nomeVendedor
          WHERE id = :id
        `, { replacements: { nomeVendedor: nomeVendedorAtualizado || null, id } })
      }
    }

    const [rows] = await sequelize.query(`
      SELECT v.*, u.nome, u.sobrenome, u.email, u.foto_perfil, u.role
      FROM vendedor v
      INNER JOIN usuario u ON u.id = v.userId
      WHERE v.id = :id
      LIMIT 1
    `, { replacements: { id } })
    const updated = Array.isArray(rows) ? rows[0] : rows
    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('Erro ao editar vendedor:', err)
    return res.status(500).json({ success: false, message: 'Erro ao editar vendedor' })
  }
})

// ===== Loja do Vendedor (perfil da loja) =====
// GET /api/vendors/store/me - obtém dados da loja do vendedor autenticado
router.get('/store/me', auth, async (req, res) => {
  try {
    const uid = Number(req.user?.id)
    if (!uid) return res.status(401).json({ success: false, message: 'Não autorizado' })

    const vend = await ensureVendorForUser(req.user)
    if (!vend) return res.status(404).json({ success: false, message: 'Usuário não é vendedor' })

    const [storeRows] = await sequelize.query(`SELECT * FROM cadastros_pendentes WHERE vendedorId = :vid LIMIT 1`, { replacements: { vid: vend.id } })
    const store = Array.isArray(storeRows) ? storeRows[0] : storeRows

    return res.json({ success: true, data: store || null, vendor: vend })
  } catch (err) {
    console.error('Erro ao obter loja do vendedor:', err)
    return res.status(500).json({ success: false, message: 'Erro ao obter dados da loja' })
  }
})

// PUT /api/vendors/store/me - cria/atualiza dados da loja do vendedor autenticado
router.put('/store/me', auth, async (req, res) => {
  try {
    const uid = Number(req.user?.id)
    if (!uid) return res.status(401).json({ success: false, message: 'Não autorizado' })

    let { nomeLoja, telefone, sobre } = req.body || {}
    nomeLoja = typeof nomeLoja === 'string' ? nomeLoja.trim() : ''
    telefone = typeof telefone === 'string' ? telefone.trim() : null
    sobre = typeof sobre === 'string' ? sobre.trim() : null

    if (!nomeLoja) return res.status(400).json({ success: false, message: 'Nome da loja é obrigatório.' })
    if (telefone && telefone.length > 30) telefone = telefone.slice(0, 30)
    if (sobre && sobre.length > 5000) sobre = sobre.slice(0, 5000)

    const vend = await ensureVendorForUser(req.user)
    if (!vend) return res.status(404).json({ success: false, message: 'Usuário não é vendedor' })

    // Atualiza nomeLoja também na tabela vendedor para manter consistência
    await sequelize.query(`UPDATE vendedor SET nomeLoja = :nomeLoja WHERE id = :id`, { replacements: { nomeLoja, id: vend.id } })

    const [existingRows] = await sequelize.query(`SELECT * FROM cadastros_pendentes WHERE vendedorId = :vid LIMIT 1`, { replacements: { vid: vend.id } })
    const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows
    const agora = new Date()

    if (!existing) {
      await sequelize.query(
        `INSERT INTO cadastros_pendentes (vendedorId, nomeLoja, telefone, sobre, criadoEm, atualizadoEm)
         VALUES (:vendedorId, :nomeLoja, :telefone, :sobre, :criadoEm, :atualizadoEm)`,
        { replacements: { vendedorId: vend.id, nomeLoja, telefone: telefone || null, sobre: sobre || null, criadoEm: agora, atualizadoEm: agora } }
      )
    } else {
      await sequelize.query(
        `UPDATE cadastros_pendentes
         SET nomeLoja = :nomeLoja, telefone = :telefone, sobre = :sobre, atualizadoEm = :atualizadoEm
         WHERE vendedorId = :vendedorId`,
        { replacements: { vendedorId: vend.id, nomeLoja, telefone: telefone || null, sobre: sobre || null, atualizadoEm: agora } }
      )
    }

    const [storeRows] = await sequelize.query(`SELECT * FROM cadastros_pendentes WHERE vendedorId = :vid LIMIT 1`, { replacements: { vid: vend.id } })
    const store = Array.isArray(storeRows) ? storeRows[0] : storeRows
    return res.json({ success: true, data: store })
  } catch (err) {
    console.error('Erro ao salvar loja do vendedor:', err)
    return res.status(500).json({ success: false, message: 'Erro ao salvar dados da loja' })
  }
})

// ===== Produtos do Vendedor =====
// GET /api/vendors/products/me - lista produtos importados pelo vendedor autenticado
router.get('/products/me', auth, async (req, res) => {
  try {
    const uid = Number(req.user?.id)
    if (!uid) return res.status(401).json({ success: false, message: 'Não autorizado' })
    const vend = await ensureVendorForUser(req.user)
    if (!vend) return res.status(404).json({ success: false, message: 'Usuário não é vendedor' })

    const [rows] = await sequelize.query(`
      SELECT p.*, 
             CASE WHEN p.ativo IS NULL OR p.ativo = 1 THEN 'ativo' ELSE 'inativo' END AS status
      FROM produto p
      WHERE p.vendedorId = :vid
      ORDER BY p.id DESC
    `, { replacements: { vid: vend.id } })

    return res.json({ success: true, data: rows })
  } catch (err) {
    console.error('Erro ao listar produtos do vendedor:', err)
    return res.status(500).json({ success: false, message: 'Erro ao listar produtos do vendedor' })
  }
})

// POST /api/vendors/products/import - importa produto manual/mercado livre para o vendedor
router.post('/products/import', auth, async (req, res) => {
  try {
    const uid = Number(req.user?.id)
    if (!uid) return res.status(401).json({ success: false, message: 'Não autorizado' })
    const vend = await ensureVendorForUser(req.user)
    if (!vend) return res.status(404).json({ success: false, message: 'Usuário não é vendedor' })

    let { nome, descricao, fotoUrl, preco, linkMercadoLivre, linkAmazon, categoria, subcategoria, precoMercadoLivre, precoAmazon } = req.body || {}
    nome = typeof nome === 'string' ? nome.trim() : ''
    descricao = typeof descricao === 'string' ? descricao.trim() : ''
    fotoUrl = typeof fotoUrl === 'string' ? fotoUrl.trim() : ''
    preco = preco !== undefined ? Number(preco) : undefined
    precoMercadoLivre = precoMercadoLivre !== undefined ? Number(precoMercadoLivre) : undefined
    precoAmazon = precoAmazon !== undefined ? Number(precoAmazon) : undefined
    linkMercadoLivre = typeof linkMercadoLivre === 'string' ? linkMercadoLivre.trim() : ''
    linkAmazon = typeof linkAmazon === 'string' ? linkAmazon.trim() : ''
    categoria = typeof categoria === 'string' ? categoria.trim() : ''
    subcategoria = typeof subcategoria === 'string' ? subcategoria.trim() : ''

    if (!nome) return res.status(400).json({ success: false, message: 'Nome do produto é obrigatório.' })
    if (precoMercadoLivre !== undefined && (isNaN(precoMercadoLivre) || precoMercadoLivre < 0)) return res.status(400).json({ success: false, message: 'Preço Mercado Livre inválido.' })
    if (precoAmazon !== undefined && (isNaN(precoAmazon) || precoAmazon < 0)) return res.status(400).json({ success: false, message: 'Preço Amazon inválido.' })
    if (preco === undefined && precoMercadoLivre === undefined && precoAmazon === undefined) {
      // Mantém compatibilidade: permitir sem preço explícito se não foi enviado
      // mas se houver link ML/Amazon e nenhum preço fornecido, usa 0
      preco = 0
    }

    const agora = new Date()
    let mercadoLivreId = null
    let amazonAsin = null
    let origem = 'manual'
    let link = null
    if (linkMercadoLivre) {
      origem = 'mercadolivre'
      link = linkMercadoLivre
      try {
        const m = linkMercadoLivre.match(/ML[B|A]-?(\d+)|\/item\/([A-Z0-9\-]+)/i)
        mercadoLivreId = (m && (m[1] || m[2])) ? String(m[1] || m[2]) : null
      } catch (_) {}
    }
    if (!linkMercadoLivre && linkAmazon) {
      origem = 'amazon'
      link = linkAmazon
      try {
        // Extrai ASIN de URLs da Amazon (10 chars alfanuméricos)
        const asinMatch = linkAmazon.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)
        amazonAsin = asinMatch ? String(asinMatch[1]).toUpperCase() : null
      } catch (_) {}
    }

    const imagensJson = JSON.stringify(fotoUrl ? [fotoUrl] : [])

    let produto = null
    if (mercadoLivreId) {
      const [pRows] = await sequelize.query(`SELECT * FROM produto WHERE vendedorId = :vid AND mercadoLivreId = :ml LIMIT 1`, { replacements: { vid: vend.id, ml: mercadoLivreId } })
      produto = Array.isArray(pRows) ? pRows[0] : pRows
    }
    if (!produto && linkMercadoLivre) {
      const [pRows2] = await sequelize.query(`SELECT * FROM produto WHERE vendedorId = :vid AND linkMercadoLivre = :lm LIMIT 1`, { replacements: { vid: vend.id, lm: linkMercadoLivre } })
      produto = Array.isArray(pRows2) ? pRows2[0] : pRows2
    }
    if (!produto && amazonAsin) {
      const [pRows3] = await sequelize.query(`SELECT * FROM produto WHERE vendedorId = :vid AND amazonAsin = :asin LIMIT 1`, { replacements: { vid: vend.id, asin: amazonAsin } })
      produto = Array.isArray(pRows3) ? pRows3[0] : pRows3
    }
    if (!produto && linkAmazon) {
      const [pRows4] = await sequelize.query(`SELECT * FROM produto WHERE vendedorId = :vid AND linkAmazon = :la LIMIT 1`, { replacements: { vid: vend.id, la: linkAmazon } })
      produto = Array.isArray(pRows4) ? pRows4[0] : pRows4
    }

    if (!produto) {
      const created = await Product.create({
        titulo: nome,
        descricao,
        descricaoDetalhada: descricao,
        imagens: imagensJson,
        precoMercadoLivre: precoMercadoLivre !== undefined ? precoMercadoLivre : (linkMercadoLivre ? (preco ?? null) : null),
        precoAmazon: precoAmazon !== undefined ? precoAmazon : (linkAmazon ? (preco ?? null) : null),
        linkMercadoLivre: linkMercadoLivre || null,
        linkAmazon: linkAmazon || null,
        mercadoLivreId: mercadoLivreId || null,
        amazonAsin: amazonAsin || null,
        categoria: categoria || null,
        subcategoria: subcategoria || null,
        data_coleta: agora,
        ativo: true,
        destaque: false
      })
      await sequelize.query(`UPDATE produto SET vendedorId = :vid WHERE id = :id`, { replacements: { vid: vend.id, id: created.id } })
      const [pRowsNew] = await sequelize.query(`SELECT * FROM produto WHERE id = :id LIMIT 1`, { replacements: { id: created.id } })
      produto = Array.isArray(pRowsNew) ? pRowsNew[0] : pRowsNew
    } else {
      await sequelize.query(`
        UPDATE produto
        SET titulo = :titulo,
            descricao = :descricao,
            descricaoDetalhada = :descricaoDetalhada,
            imagens = :imagens,
            precoMercadoLivre = :precoML,
            linkMercadoLivre = :linkML,
            mercadoLivreId = :mlId,
            precoAmazon = :precoAZ,
            linkAmazon = :linkAZ,
            amazonAsin = :asinAZ,
            categoria = :categoria,
            subcategoria = :subcategoria,
            ativo = :ativo,
            vendedorId = :vid
        WHERE id = :id
      `, {
        replacements: {
          id: produto.id,
          titulo: nome,
          descricao,
          descricaoDetalhada: descricao,
          imagens: imagensJson,
          precoML: precoMercadoLivre !== undefined ? precoMercadoLivre : (linkMercadoLivre ? (preco ?? produto.precoMercadoLivre ?? null) : (produto.precoMercadoLivre ?? null)),
          linkML: linkMercadoLivre || produto.linkMercadoLivre || null,
          mlId: mercadoLivreId || produto.mercadoLivreId || null,
          precoAZ: precoAmazon !== undefined ? precoAmazon : (linkAmazon ? (preco ?? produto.precoAmazon ?? null) : (produto.precoAmazon ?? null)),
          linkAZ: linkAmazon || produto.linkAmazon || null,
          asinAZ: amazonAsin || produto.amazonAsin || null,
          categoria: categoria || produto.categoria || null,
          subcategoria: subcategoria || produto.subcategoria || null,
          ativo: true,
          vid: vend.id
        }
      })
    }
    // Inserir pontos iniciais de histórico automaticamente a partir dos preços atuais
    try {
      const agoraHist = new Date()
      const precoMLAtual = produto.precoMercadoLivre !== undefined && produto.precoMercadoLivre !== null ? Number(produto.precoMercadoLivre) : undefined
      const precoAZAtual = produto.precoAmazon !== undefined && produto.precoAmazon !== null ? Number(produto.precoAmazon) : undefined
      if (precoMLAtual !== undefined && !isNaN(precoMLAtual) && precoMLAtual >= 0) {
        await PriceHistory.create({ produto_id: produto.id, plataforma: 'Mercado Livre', preco: precoMLAtual, data_coleta: agoraHist })
      }
      if (precoAZAtual !== undefined && !isNaN(precoAZAtual) && precoAZAtual >= 0) {
        await PriceHistory.create({ produto_id: produto.id, plataforma: 'Amazon', preco: precoAZAtual, data_coleta: agoraHist })
      }
    } catch (e) {
      console.warn('Falha ao inserir histórico automático do produto:', e?.message || e)
    }
    const [rowsOut] = await sequelize.query(`
      SELECT p.*, CASE WHEN p.ativo IS NULL OR p.ativo = 1 THEN 'ativo' ELSE 'inativo' END AS status
      FROM produto p
      WHERE p.id = :pid AND p.vendedorId = :vid
      LIMIT 1
    `, { replacements: { vid: vend.id, pid: produto.id } })
    const out = Array.isArray(rowsOut) ? rowsOut[0] : rowsOut
    return res.status(201).json({ success: true, data: out })
  } catch (err) {
    console.error('Erro ao importar produto:', err)
    return res.status(500).json({ success: false, message: 'Erro ao importar produto' })
  }
})

// PUT /api/vendors/products/:id - atualiza inventário/status do produto do vendedor
router.put('/products/:id', auth, async (req, res) => {
  try {
    const uid = Number(req.user?.id)
    if (!uid) return res.status(401).json({ success: false, message: 'Não autorizado' })
    const id = Number(req.params.id)
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'ID inválido' })

    const vend = await ensureVendorForUser(req.user)
    if (!vend) return res.status(404).json({ success: false, message: 'Usuário não é vendedor' })

    const [pRows] = await sequelize.query(`SELECT * FROM produto WHERE id = :id AND vendedorId = :vid LIMIT 1`, { replacements: { id, vid: vend.id } })
    const p = Array.isArray(pRows) ? pRows[0] : pRows
    if (!p) {
      return res.status(404).json({ success: false, message: 'Produto do vendedor não encontrado' })
    }

    let { status, preco, nome, descricao, fotoUrl, categoria, subcategoria, linkMercadoLivre, linkAmazon, precoMercadoLivre, precoAmazon } = req.body || {}
    status = typeof status === 'string' ? status.trim() : undefined
    preco = preco !== undefined ? Number(preco) : undefined
    precoMercadoLivre = precoMercadoLivre !== undefined ? Number(precoMercadoLivre) : undefined
    precoAmazon = precoAmazon !== undefined ? Number(precoAmazon) : undefined
    nome = typeof nome === 'string' ? nome.trim() : undefined
    descricao = typeof descricao === 'string' ? descricao.trim() : undefined
    fotoUrl = typeof fotoUrl === 'string' ? fotoUrl.trim() : undefined
    categoria = typeof categoria === 'string' ? categoria.trim() : undefined
    subcategoria = typeof subcategoria === 'string' ? subcategoria.trim() : undefined
    linkMercadoLivre = typeof linkMercadoLivre === 'string' ? linkMercadoLivre.trim() : undefined
    linkAmazon = typeof linkAmazon === 'string' ? linkAmazon.trim() : undefined

    if (preco !== undefined && (isNaN(preco) || preco < 0)) {
      return res.status(400).json({ success: false, message: 'Preço inválido.' })
    }
    if (precoMercadoLivre !== undefined && (isNaN(precoMercadoLivre) || precoMercadoLivre < 0)) {
      return res.status(400).json({ success: false, message: 'Preço Mercado Livre inválido.' })
    }
    if (precoAmazon !== undefined && (isNaN(precoAmazon) || precoAmazon < 0)) {
      return res.status(400).json({ success: false, message: 'Preço Amazon inválido.' })
    }

    const ativoUpdate = typeof status === 'string' ? (status.toLowerCase() === 'ativo') : undefined
    const imagensUpdate = (typeof fotoUrl === 'string' && fotoUrl.trim()) ? JSON.stringify([fotoUrl.trim()]) : undefined
    await sequelize.query(`
      UPDATE produto
      SET ativo = COALESCE(:ativo, ativo),
          titulo = COALESCE(:titulo, titulo),
          descricao = COALESCE(:descricao, descricao),
          imagens = COALESCE(:imagens, imagens),
          categoria = COALESCE(:categoria, categoria),
          subcategoria = COALESCE(:subcategoria, subcategoria),
          linkMercadoLivre = COALESCE(:linkML, linkMercadoLivre),
          linkAmazon = COALESCE(:linkAZ, linkAmazon),
          precoMercadoLivre = COALESCE(:precoML, precoMercadoLivre),
          precoAmazon = COALESCE(:precoAZ, precoAmazon)
      WHERE id = :id AND vendedorId = :vid
    `, {
      replacements: {
        id,
        vid: vend.id,
        ativo: ativoUpdate,
        titulo: nome,
        descricao,
        imagens: imagensUpdate,
        categoria,
        subcategoria,
        linkML: linkMercadoLivre,
        linkAZ: linkAmazon,
        precoML: precoMercadoLivre !== undefined ? precoMercadoLivre : (preco !== undefined ? preco : undefined),
        precoAZ: precoAmazon !== undefined ? precoAmazon : (preco !== undefined ? preco : undefined)
      }
    })

    const [rowsOut] = await sequelize.query(`
      SELECT p.*, CASE WHEN p.ativo IS NULL OR p.ativo = 1 THEN 'ativo' ELSE 'inativo' END AS status
      FROM produto p
      WHERE p.id = :id AND p.vendedorId = :vid
      LIMIT 1
    `, { replacements: { id, vid: vend.id } })
    const out = Array.isArray(rowsOut) ? rowsOut[0] : rowsOut
    return res.json({ success: true, data: out })
  } catch (err) {
    console.error('Erro ao atualizar produto do vendedor:', err)
    return res.status(500).json({ success: false, message: 'Erro ao atualizar produto do vendedor' })
  }
})

// DELETE /api/vendors/products/:id - excluir produto do vendedor
router.delete('/products/:id', auth, async (req, res) => {
  try {
    const uid = Number(req.user?.id)
    if (!uid) return res.status(401).json({ success: false, message: 'Não autorizado' })
    const id = Number(req.params.id)
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'ID inválido' })

    const vend = await ensureVendorForUser(req.user)
    if (!vend) return res.status(404).json({ success: false, message: 'Usuário não é vendedor' })

    const [pRows] = await sequelize.query(`SELECT * FROM produto WHERE id = :id AND vendedorId = :vid LIMIT 1`, { replacements: { id, vid: vend.id } })
    const p = Array.isArray(pRows) ? pRows[0] : pRows
    if (!p) {
      return res.status(404).json({ success: false, message: 'Produto do vendedor não encontrado' })
    }

    await sequelize.query(`DELETE FROM produto WHERE id = :id AND vendedorId = :vid`, { replacements: { id, vid: vend.id } })

    return res.json({ success: true })
  } catch (err) {
    console.error('Erro ao excluir produto do vendedor:', err)
    return res.status(500).json({ success: false, message: 'Erro ao excluir produto do vendedor' })
  }
})

// DELETE /api/vendors/:id - excluir vendedor (admin)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' })
    }
    const hard = String(req.query.hard || '').toLowerCase() === 'true'

    const [vendRows] = await sequelize.query(`SELECT * FROM vendedor WHERE id = :id LIMIT 1`, { replacements: { id } })
    const vend = Array.isArray(vendRows) ? vendRows[0] : vendRows
    if (!vend) return res.status(404).json({ success: false, message: 'Vendedor não encontrado' })

    // Remove o registro de vendedor
    await sequelize.query(`DELETE FROM vendedor WHERE id = :id`, { replacements: { id } })

    if (hard) {
      // Deleta o usuário vinculado
      await sequelize.query(`DELETE FROM usuario WHERE id = :uid`, { replacements: { uid: vend.userId } })
    } else {
      // Mantém usuário e rebaixa a role para 'cliente'
      await sequelize.query(`UPDATE usuario SET role = 'cliente' WHERE id = :uid`, { replacements: { uid: vend.userId } })
    }

    return res.json({ success: true })
  } catch (err) {
    console.error('Erro ao excluir vendedor:', err)
    return res.status(500).json({ success: false, message: 'Erro ao excluir vendedor' })
  }
})

module.exports = router
