// add-test-ai-message.js
require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-chat';
console.log('Using MongoDB URI:', MONGODB_URI);

// Define the Message schema
const messageSchema = new mongoose.Schema({
  sender_id: { type: String, required: true },
  sender_role: { type: String, enum: ['buyer', 'seller', 'agent', 'admin', 'system'], required: true },
  sender_name: { type: String, required: true },
  receiver_id: { type: String, default: '' },
  content: { type: String },
  conversation_id: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  is_ai: { type: Boolean, default: false },
  created_at: { type: String, required: true },
  updated_at: { type: String }
});

// Override the model only if it's not already defined
let Message;
try {
  Message = mongoose.model('Message');
} catch (e) {
  Message = mongoose.model('Message', messageSchema);
}

async function addTestAiMessage() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Replace with the conversation ID from your test
    const conversationId = '6825453e57ed264e894ff968';
    // Replace with the user ID from your test
    const userId = '68252f5297cdb61797053d44';

    // Create a test AI message
    const newAiMessage = new Message({
      sender_id: 'AI',
      sender_role: 'admin',  // Use admin role as it's in the allowed enum values
      sender_name: 'Assistant IA',
      receiver_id: userId,
      content: "This is a test AI response message. I'm here to help with your real estate questions!",
      conversation_id: conversationId,
      is_read: false,
      is_ai: true,  // This is what makes it an AI message
      created_at: new Date().toISOString()
    });

    // Save the message
    const savedMessage = await newAiMessage.save();
    console.log('AI test message successfully saved!');
    console.log('Message ID:', savedMessage._id);
    console.log('Message Content:', savedMessage.content);

    // Now verify it exists
    const aiMessages = await Message.find({ 
      conversation_id: conversationId,
      is_ai: true
    });
    
    console.log(`Found ${aiMessages.length} AI messages in the conversation`);

  } catch (error) {
    console.error('Error adding test AI message:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addTestAiMessage(); 