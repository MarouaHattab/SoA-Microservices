const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  sender_id: { type: String, required: true },
  sender_name: { type: String, required: true },
  sender_role: { type: String, required: true },
  recipient_id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error'], 
    default: 'info' 
  },
  link: { type: String },
  priority: { 
    type: String, 
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], 
    default: 'NORMAL' 
  },
  is_read: { type: Boolean, default: false },
  requires_action: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  read_at: { type: Date }
});

// Index pour accélérer les requêtes
notificationSchema.index({ recipient_id: 1, is_read: 1 });
notificationSchema.index({ created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);