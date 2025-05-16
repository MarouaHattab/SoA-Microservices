const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
  admin_id: { type: String, required: true },
  user_id: { type: String, required: true },
  content: { type: String, required: true },
  notification_type: { 
    type: String, 
    enum: ['INFO', 'WARNING', 'UPDATE', 'SYSTEM', 'MAINTENANCE'], 
    default: 'INFO' 
  },
  metadata: { type: Map, of: String },
  is_read: { type: Boolean, default: false },
  read_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);