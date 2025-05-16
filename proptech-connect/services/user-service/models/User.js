const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    trim: true,
    match: [/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/, 'Please provide a valid email address']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: { 
    type: String, 
    required: [true, 'Role is required'], 
    enum: {
      values: ['buyer', 'seller', 'agent', 'admin'],
      message: 'Role must be one of: buyer, seller, agent, admin'
    },
    default: 'buyer',
    trim: true
  },
  phone: { 
    type: String,
    trim: true
  },
}, {
  timestamps: true
});

// Pre-save hook pour hasher le mot de passe
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error('[USER-MODEL] Password hashing error:', error);
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('[USER-MODEL] Password comparison error:', error);
    return false;
  }
};

// Add explicit error handling for ID validation
userSchema.statics.validateId = function(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid user ID format');
  }
  return id;
};

module.exports = mongoose.model('User', userSchema);