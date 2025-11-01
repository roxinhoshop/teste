const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/db');

// Modelo alinhado à tabela existente `usuario`
const User = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome: { type: DataTypes.STRING, allowNull: false },
  sobrenome: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  senha: { type: DataTypes.STRING, allowNull: false },
  foto_perfil: { type: DataTypes.TEXT('long'), allowNull: true },
  role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'cliente' },
}, {
  timestamps: false,
  tableName: 'usuario',
  freezeTableName: true,
});

// Hooks para criptografar senha antes de salvar
User.beforeCreate(async (user) => {
  const salt = await bcrypt.genSalt(10);
  user.senha = await bcrypt.hash(user.senha, salt);
});

User.beforeUpdate(async (user) => {
  const isHashed = typeof user.senha === 'string' && /^\$2[aby]\$/.test(user.senha);
  if (user.changed('senha') || !isHashed) {
    const salt = await bcrypt.genSalt(10);
    user.senha = await bcrypt.hash(user.senha, salt);
  }
});

// Métodos de instância
User.prototype.getSignedJwtToken = function() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não configurado');
  }
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ id: this.id, role: this.role }, secret, { expiresIn });
};

User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.senha);
};

module.exports = User;
