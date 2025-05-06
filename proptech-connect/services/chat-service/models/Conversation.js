// chat-service/models/Conversation.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: { type: [String], required: true },
  participant_roles: { type: [String], required: true },
  is_group: { type: Boolean, default: false },
  group_name: { type: String },
  creator_id: { type: String }, // Pour les conversations de groupe
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
});

module.exports = mongoose.model('Conversation', conversationSchema);