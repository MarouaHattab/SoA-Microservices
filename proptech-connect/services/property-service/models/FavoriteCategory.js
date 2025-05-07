// Nouveau fichier: models/FavoriteCategory.js
const mongoose = require('mongoose');

const favoriteCategorySchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#4a90e2' },
  icon: { type: String, default: 'star' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Index pour accélérer les recherches
favoriteCategorySchema.index({ user_id: 1 });

module.exports = mongoose.model('FavoriteCategory', favoriteCategorySchema);