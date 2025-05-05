const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: [
      'new_property', 
      'price_change', 
      'new_appointment', 
      'updated_appointment', 
      'cancelled_appointment',
      'new_message',
      'system'
    ]
  },
  message: { type: String, required: true },
  related_id: { type: String }, // property_id, appointment_id, etc.
  is_read: { type: Boolean, default: false },
}, {
  timestamps: true
});

// Indexation pour les recherches
notificationSchema.index({ user_id: 1 });
notificationSchema.index({ is_read: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);