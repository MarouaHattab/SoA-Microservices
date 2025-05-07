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
  average_rating: { type: Number, default: 0 },
  total_ratings: { type: Number, default: 0 },
  favorited_by: [{ type: String }], // Liste des IDs des utilisateurs qui ont mis en favoris
  price_history: [{ 
    price: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  }],
}, {
  timestamps: true
});

// Indexer pour la recherche
propertySchema.index({ location: 'text', description: 'text', title: 'text' });
propertySchema.index({ property_type: 1, price: 1, bedrooms: 1 });
propertySchema.index({ favorited_by: 1 });

// Middleware pre-save pour suivre les changements de prix
propertySchema.pre('save', async function(next) {
  // Si c'est une nouvelle propriété ou si le prix a changé
  if (this.isNew || this.isModified('price')) {
    // Ajouter le prix courant à l'historique
    this.price_history = this.price_history || [];
    this.price_history.push({
      price: this.price,
      date: new Date()
    });
    
    // Si ce n'est pas une nouvelle propriété et que le prix a été modifié
    if (!this.isNew && this.isModified('price')) {
      // Obtenir les utilisateurs qui ont cette propriété en favoris
      const userIds = this.favorited_by || [];
      
      // Publier un événement pour notifier les utilisateurs
      if (userIds.length > 0) {
        try {
          const kafka = require('../kafka-producer');
          await kafka.sendEvent('property-events', 'price-change', {
            property_id: this._id.toString(),
            old_price: this._original.price,
            new_price: this.price,
            favorited_by: userIds,
            title: this.title,
            location: this.location,
            image: this.images && this.images.length > 0 ? this.images[0] : null
          });
        } catch (error) {
          console.error('Error sending price change notification:', error);
        }
      }
    }
  }
  
  next();
});

// Enregistrer le prix original avant modification
propertySchema.pre('init', function(doc) {
  doc._original = {
    price: doc.price
  };
});

module.exports = mongoose.model('Property', propertySchema);