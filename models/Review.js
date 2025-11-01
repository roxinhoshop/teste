const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Review = sequelize.define('Review', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  produto_id: { type: DataTypes.INTEGER, allowNull: false },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  usuario_nome: { type: DataTypes.STRING, allowNull: true },
  nota: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  titulo: { type: DataTypes.STRING, allowNull: true },
  comentario: { type: DataTypes.TEXT, allowNull: true },
  fotos: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  data_postagem: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'produto_avaliacao',
  timestamps: false,
  freezeTableName: true,
});

module.exports = Review;