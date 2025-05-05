const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: { type: [String], required: true },
  is_ai_conversation: { type: Boolean, default: false },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
});

module.exports = mongoose.model('Conversation', conversationSchema);