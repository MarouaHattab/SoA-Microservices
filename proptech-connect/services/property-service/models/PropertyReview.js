const mongoose = require('mongoose');

const propertyReviewSchema = new mongoose.Schema({
  property_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property', 
    required: true 
  },
  user_id: { 
    type: String, 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  comment: { 
    type: String, 
    required: true 
  },
  user_name: { 
    type: String, 
    required: true 
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
propertyReviewSchema.index({ property_id: 1, user_id: 1 }, { unique: true });
propertyReviewSchema.index({ property_id: 1, created_at: -1 });

module.exports = mongoose.model('PropertyReview', propertyReviewSchema); 