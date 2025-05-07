// Mise à jour du modèle Appointment.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  property_id: { type: String, required: true },
  user_id: { type: String, required: true },
  agent_id: { type: String, required: true },
  date_time: { type: Date, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'rescheduled'],
    default: 'pending'
  },
  notes: { type: String },
  owner_response: { type: String },
  reschedule_proposed: { type: Date },
  reschedule_reason: { type: String },
  reminder_sent: { type: Boolean, default: false },
  reminder_scheduled_at: { type: Date },
  rejection_reason: { type: String },
  feedback: { type: String },
  feedback_rating: { type: Number, min: 1, max: 5 },
  // Historique des modifications
  history: [{
    status: { type: String },
    date_time: { type: Date },
    changed_by: { type: String },
    changed_at: { type: Date, default: Date.now },
    notes: { type: String }
  }]
}, {
  timestamps: true
});

// Indexation pour les recherches
appointmentSchema.index({ property_id: 1 });
appointmentSchema.index({ user_id: 1 });
appointmentSchema.index({ agent_id: 1 });
appointmentSchema.index({ date_time: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);