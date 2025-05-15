// check-ai-messages.js
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

async function checkDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB');

    // Replace with the conversation ID from your test
    const conversationId = '6825453e57ed264e894ff968';

    console.log(`\nChecking all messages in conversation: ${conversationId}`);
    
    // Find all messages for the conversation
    const allMessages = await Message.find({ conversation_id: conversationId });
    
    console.log(`Total messages in conversation: ${allMessages.length}`);
    
    if (allMessages.length === 0) {
      console.log('No messages found for this conversation ID.');
    } else {
      // Output each message with its details
      allMessages.forEach((message, index) => {
        console.log(`\nMessage #${index + 1}:`);
        console.log(`- ID: ${message._id}`);
        console.log(`- Sender ID: ${message.sender_id}`);
        console.log(`- Sender Role: ${message.sender_role}`);
        console.log(`- Sender Name: ${message.sender_name}`);
        console.log(`- Is AI: ${message.is_ai}`);
        console.log(`- Created At: ${message.created_at}`);
        console.log(`- Content: ${message.content ? message.content.substring(0, 50) + '...' : 'No content'}`);
      });
    }

    // Check all messages in the database
    console.log('\nChecking for ANY AI messages in the database:');
    const allAiMessages = await Message.find({ is_ai: true });
    
    console.log(`Total AI messages in database: ${allAiMessages.length}`);
    
    if (allAiMessages.length === 0) {
      console.log('No AI messages found in the entire database.');
      
      // As a sanity check, look for messages with 'AI' as sender_id
      const potentialAiMessages = await Message.find({ sender_id: 'AI' });
      console.log(`Messages with sender_id='AI': ${potentialAiMessages.length}`);
      
      if (potentialAiMessages.length > 0) {
        potentialAiMessages.forEach((message, index) => {
          console.log(`\nPotential AI Message #${index + 1}:`);
          console.log(`- ID: ${message._id}`);
          console.log(`- Sender ID: ${message.sender_id}`);
          console.log(`- Sender Role: ${message.sender_role}`);
          console.log(`- Sender Name: ${message.sender_name}`);
          console.log(`- Is AI: ${message.is_ai}`);
          console.log(`- Conversation ID: ${message.conversation_id}`);
          console.log(`- Created At: ${message.created_at}`);
        });
      }
    } else {
      allAiMessages.forEach((message, index) => {
        console.log(`\nAI Message #${index + 1}:`);
        console.log(`- ID: ${message._id}`);
        console.log(`- Sender ID: ${message.sender_id}`);
        console.log(`- Sender Role: ${message.sender_role}`);
        console.log(`- Is AI: ${message.is_ai}`);
        console.log(`- Conversation ID: ${message.conversation_id}`);
        console.log(`- Created At: ${message.created_at}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

checkDatabase(); 