const mongoose = require('mongoose');

const propertyReviewSchema = new mongoose.Schema({
  // Champs existants
  property_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  category_ratings: {
    location: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 },
    quality: { type: Number, min: 1, max: 5 },
    amenities: { type: Number, min: 1, max: 5 },
    neighborhood: { type: Number, min: 1, max: 5 }
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
  },
  // Nouveaux champs
  is_hidden: {
    type: Boolean,
    default: false
  },
  hidden_reason: {
    type: String
  },
  owner_response: {
    type: String
  },
  owner_response_date: {
    type: Date
  },
  helpful_votes: {
    type: Number,
    default: 0
  },
  helpful_voters: [{
    type: String
  }],
  visit_verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Export the model
const PropertyReview = mongoose.model('PropertyReview', propertyReviewSchema);
module.exports = PropertyReview;