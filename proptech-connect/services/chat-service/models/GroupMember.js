// chat-service/models/GroupMember.js
const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema({
  conversation_id: { type: String, required: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  user_role: { type: String, enum: ['buyer', 'seller', 'agent', 'admin'], required: true },
  joined_at: { type: String, required: true }
});

// Index composé pour éviter les doublons
groupMemberSchema.index({ conversation_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('GroupMember', groupMemberSchema);