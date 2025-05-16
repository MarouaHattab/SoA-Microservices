const mongoose = require('mongoose');

const userStatusSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['online', 'offline', 'away', 'busy'], 
    default: 'offline' 
  },
  last_active: { type: Date, default: Date.now },
  device_info: { type: String },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserStatus', userStatusSchema);