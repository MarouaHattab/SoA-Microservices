const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation_id: { type: String, required: true },
  sender_id: { type: String, required: true },
  receiver_id: { type: String, required: true },
  content: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  is_ai: { type: Boolean, default: false },
  created_at: { type: String, required: true }
});

module.exports = mongoose.model('Message', messageSchema);