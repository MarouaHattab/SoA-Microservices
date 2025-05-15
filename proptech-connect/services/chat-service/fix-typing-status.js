// fix-typing-status.js
require('dotenv').config();
const mongoose = require('mongoose');
const typingStatusManager = require('./typing-status-manager');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-chat';

// Define schemas for MongoDB models
const conversationSchema = new mongoose.Schema({
  participants: [String],
  participant_roles: [String],
  is_group: { type: Boolean, default: false },
  group_name: { type: String },
  creator_id: { type: String },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
});

// Register models
let Conversation;
try {
  Conversation = mongoose.model('Conversation');
} catch (e) {
  Conversation = mongoose.model('Conversation', conversationSchema);
}

async function fixTypingStatus() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Reset the typing status manager
    console.log('\nResetting typing status manager...');
    console.log('Before reset:');
    typingStatusManager.dumpState();
    
    // Clear any existing typing status data
    typingStatusManager.typingUsers.clear();
    
    // Clear all timeouts
    for (const timeout of typingStatusManager.typingTimeouts.values()) {
      clearTimeout(timeout);
    }
    typingStatusManager.typingTimeouts.clear();
    
    console.log('\nAfter reset:');
    typingStatusManager.dumpState();

    console.log('\nVerifying active conversations...');
    const conversations = await Conversation.find({}).limit(5);
    console.log(`Found ${conversations.length} conversations`);
    
    if (conversations.length > 0) {
      for (const conversation of conversations) {
        console.log(`\nConversation ID: ${conversation._id}`);
        console.log(`Participants: ${conversation.participants.join(', ')}`);
        
        if (conversation.participants.length > 0) {
          const testUserId = conversation.participants[0];
          
          console.log(`\nTesting typing status for user ${testUserId} in conversation ${conversation._id}`);
          
          // Set typing status to true
          typingStatusManager.updateTypingStatus(conversation._id.toString(), testUserId, true);
          
          // Get typing users
          const typingUsers = typingStatusManager.getTypingUsers(conversation._id.toString());
          console.log(`Typing users for conversation: ${typingUsers.join(', ')}`);
          console.log(`Is test user in typing list? ${typingUsers.includes(testUserId)}`);
          
          // Set typing status back to false
          typingStatusManager.updateTypingStatus(conversation._id.toString(), testUserId, false);
          
          console.log('\nAfter setting back to false:');
          const updatedTypingUsers = typingStatusManager.getTypingUsers(conversation._id.toString());
          console.log(`Typing users: ${updatedTypingUsers.length > 0 ? updatedTypingUsers.join(', ') : 'None'}`);
        }
      }
    }
    
    console.log('\nFinal status of typing manager:');
    typingStatusManager.dumpState();
    
    console.log('\nTyping status system reset and verified successfully!');
    console.log('The service should now correctly handle typing status events.');
    
  } catch (error) {
    console.error('Error fixing typing status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixTypingStatus(); 