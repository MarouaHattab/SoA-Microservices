const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  address: { type: String, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  area: { type: Number, required: true },
  property_type: { type: String, required: true },
  owner_id: { type: String, required: true },
  features: [{ type: String }],
  images: [{ type: String }],
}, {
  timestamps: true
});

// Indexer pour la recherche
propertySchema.index({ location: 'text', description: 'text', title: 'text' });
propertySchema.index({ property_type: 1, price: 1, bedrooms: 1 });

module.exports = mongoose.model('Property', propertySchema);