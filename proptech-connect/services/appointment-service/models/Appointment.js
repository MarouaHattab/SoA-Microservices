const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  property_id: { type: String, required: true },
  user_id: { type: String, required: true },
  agent_id: { type: String, required: true },
  date_time: { type: Date, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: { type: String },
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