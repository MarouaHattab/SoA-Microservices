// chat-service/models/Message.js (mise à jour)
const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  file_name: { type: String, required: true },
  file_type: { type: String, required: true }, // mime type
  file_size: { type: Number, required: true }, // en octets
  file_url: { type: String, required: true },
  thumbnail_url: { type: String }, // pour les images
  width: { type: Number }, // pour les images
  height: { type: Number }, // pour les images
  duration: { type: Number }, // pour les audios/vidéos
  uploaded_at: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  sender_id: { type: String, required: true },
  sender_role: { type: String, enum: ['buyer', 'seller', 'agent', 'admin'], required: true },
  sender_name: { type: String, required: true },
  receiver_id: { type: String },
  content: { type: String },
  attachments: [attachmentSchema],
  conversation_id: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  is_ai: { type: Boolean, default: false },
  created_at: { type: String, required: true },
  updated_at: { type: String }
});

module.exports = mongoose.model('Message', messageSchema);