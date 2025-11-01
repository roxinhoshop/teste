const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PriceHistory = sequelize.define('ProdutoPrecoHistorico', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  produto_id: { type: DataTypes.INTEGER, allowNull: false },
  plataforma: { type: DataTypes.STRING(50), allowNull: false },
  preco: { type: DataTypes.DECIMAL(10,2), allowNull: true },
  data_coleta: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'price_history',
  timestamps: false,
  freezeTableName: true,
});

module.exports = PriceHistory;
