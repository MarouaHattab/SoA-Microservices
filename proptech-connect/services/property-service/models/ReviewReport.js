// Nouveau fichier: models/ReviewReport.js
const mongoose = require('mongoose');

const reviewReportSchema = new mongoose.Schema({
  review_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PropertyReview', 
    required: true 
  },
  reporter_id: { 
    type: String, 
    required: true 
  },
  reason: { 
    type: String, 
    enum: ['inappropriate', 'spam', 'offensive', 'misleading', 'fake', 'other'],
    required: true 
  },
  details: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'accepted', 'rejected'],
    default: 'pending'
  },
  admin_comment: { 
    type: String 
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Index pour accélérer les recherches
reviewReportSchema.index({ review_id: 1 });
reviewReportSchema.index({ reporter_id: 1 });
reviewReportSchema.index({ status: 1 });

module.exports = mongoose.model('ReviewReport', reviewReportSchema);