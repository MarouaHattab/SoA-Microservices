const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  property_id: { 
    type: String, 
    required: true 
  },
  user_id: { 
    type: String, 
    required: true, 
    default: ''  // This allows Mongoose to set it if not present
  },
  agent_id: { 
    type: String, 
    required: true,
    default: ''  // This allows Mongoose to set it if not present 
  },
  date_time: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'rescheduled'],
    default: 'pending'  // Default status value
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

// Indexation for searches
appointmentSchema.index({ property_id: 1 });
appointmentSchema.index({ user_id: 1 });
appointmentSchema.index({ agent_id: 1 });
appointmentSchema.index({ date_time: 1 });
appointmentSchema.index({ status: 1 });

// Pre-save middleware to ensure default values are set
appointmentSchema.pre('save', function(next) {
  // Make sure status has a default value
  if (!this.status) {
    this.status = 'pending';
  }
  
  // Make sure we have an initial history entry
  if (!this.history || this.history.length === 0) {
    this.history = [{
      status: this.status,
      date_time: this.date_time,
      changed_by: this.user_id,
      notes: 'Appointment created'
    }];
  }
  
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);