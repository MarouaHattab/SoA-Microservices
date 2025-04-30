const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  }
});

module.exports = mongoose.model('Movie', MovieSchema);