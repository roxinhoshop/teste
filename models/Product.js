const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Modelo alinhado à tabela existente `produto`
const Product = sequelize.define('Produto', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  titulo: { type: DataTypes.STRING(255), allowNull: false },
  // Novos preços por plataforma
  precoMercadoLivre: { type: DataTypes.DECIMAL(10,2), allowNull: true },
  precoAmazon: { type: DataTypes.DECIMAL(10,2), allowNull: true },
  descricao: { type: DataTypes.TEXT },
  descricaoDetalhada: { type: DataTypes.TEXT },
  // Classificação manual/persistida
  categoria: { type: DataTypes.STRING(100), allowNull: true },
  subcategoria: { type: DataTypes.STRING(100), allowNull: true },
  marca: { type: DataTypes.STRING(100) },
  avaliacao: { type: DataTypes.FLOAT },
  // Novo array de imagens armazenado como JSON (string)
  imagens: { type: DataTypes.TEXT },
  link: { type: DataTypes.TEXT },
  // Novos links por plataforma
  linkMercadoLivre: { type: DataTypes.TEXT },
  linkAmazon: { type: DataTypes.TEXT },
  // Parcelamento por plataforma (armazenado como JSON string)
  parcelamentoMercadoLivre: { type: DataTypes.TEXT },
  parcelamentoAmazon: { type: DataTypes.TEXT },
  // IDs manuais por plataforma
  mercadoLivreId: { type: DataTypes.STRING(100) },
  amazonAsin: { type: DataTypes.STRING(50) },
  data_coleta: { type: DataTypes.DATE },
  ativo: { type: DataTypes.BOOLEAN, allowNull: true },
  destaque: { type: DataTypes.BOOLEAN, allowNull: true },
}, {
  tableName: 'produto',
  timestamps: false,
  freezeTableName: true,
});

module.exports = Product;
