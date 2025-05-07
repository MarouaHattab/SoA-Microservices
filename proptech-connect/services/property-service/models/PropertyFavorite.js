// Nouveau fichier: models/PropertyFavorite.js
const mongoose = require('mongoose');

const propertyFavoriteSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  property_id: { type: String, required: true },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FavoriteCategory' }],
  notes: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Index pour accélérer les recherches
propertyFavoriteSchema.index({ user_id: 1, property_id: 1 }, { unique: true });
propertyFavoriteSchema.index({ user_id: 1 });
propertyFavoriteSchema.index({ property_id: 1 });

module.exports = mongoose.model('PropertyFavorite', propertyFavoriteSchema);