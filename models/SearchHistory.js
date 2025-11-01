const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SearchHistory = sequelize.define('search_history', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  term: { type: DataTypes.STRING(255), allowNull: true },
  predictedProductId: { type: DataTypes.INTEGER, allowNull: true },
  eventType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'search' },
  createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' }
}, {
  tableName: 'search_history',
  timestamps: false
});

module.exports = SearchHistory;
