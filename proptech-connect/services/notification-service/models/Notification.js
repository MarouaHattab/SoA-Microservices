
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
    enum: [
      'info', 'success', 'warning', 'error',
      // Nouveaux types pour les rendez-vous
      'new_appointment', 'appointment_confirmed', 'appointment_rejected',
      'appointment_rescheduled', 'appointment_reminder', 'appointment_update',
      'reschedule_declined', 'appointment_completed', 'feedback_received',
      'feedback_request'
    ], 
    default: 'info' 
  },
  link: { type: String },
  reference_id: { type: String }, // ID de référence (par exemple, ID du rendez-vous)
  reference_type: { type: String }, // Type de référence (par exemple, "appointment")
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
notificationSchema.index({ reference_id: 1, reference_type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);