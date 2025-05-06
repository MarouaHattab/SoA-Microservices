const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  email_enabled: { type: Boolean, default: true },
  push_enabled: { type: Boolean, default: true },
  in_app_enabled: { type: Boolean, default: true },
  muted_types: [{ type: String }],
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema);