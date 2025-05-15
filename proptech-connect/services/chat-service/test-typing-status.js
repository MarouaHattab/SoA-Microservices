// test-typing-status.js
require('dotenv').config();
const mongoose = require('mongoose');
const typingStatusManager = require('./typing-status-manager');
const conversationSchema = new mongoose.Schema({
  participants: [String],
  participant_roles: [String],
  is_group: { type: Boolean, default: false },
  group_name: { type: String },
  creator_id: { type: String },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
});

// Define conversation model if not already defined
let Conversation;
try {
  Conversation = mongoose.model('Conversation');
} catch (e) {
  Conversation = mongoose.model('Conversation', conversationSchema);
}

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-chat';

async function testTypingStatus() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a conversation to test with
    const conversation = await Conversation.findOne();
    if (!conversation) {
      console.log('No conversations found in the database.');
      return;
    }

    const conversationId = conversation._id.toString();
    const userId = conversation.participants[0]; // Use the first participant
    console.log(`Testing with conversation: ${conversationId}`);
    console.log(`Testing with user: ${userId}`);

    // Test 1: Update typing status to true
    console.log('\nTest 1: Update typing status to true');
    const updateResult = typingStatusManager.updateTypingStatus(conversationId, userId, true);
    console.log(`Update result: ${updateResult}`);

    // Get typing users immediately after setting to true
    let typingUsers = typingStatusManager.getTypingUsers(conversationId);
    console.log('Typing users immediately after setting to true:', typingUsers);
    console.log(`Is user in typing list? ${typingUsers.includes(userId)}`);
    
    // Test 2: Get typing users after a brief delay
    console.log('\nTest 2: Get typing users after a brief delay (1 second)');
    await new Promise(resolve => setTimeout(resolve, 1000));
    typingUsers = typingStatusManager.getTypingUsers(conversationId);
    console.log('Typing users after 1 second:', typingUsers);
    console.log(`Is user in typing list? ${typingUsers.includes(userId)}`);

    // Test 3: Wait for timeout to expire
    console.log('\nTest 3: Wait for timeout to expire (5+ seconds)');
    await new Promise(resolve => setTimeout(resolve, 5500));
    typingUsers = typingStatusManager.getTypingUsers(conversationId);
    console.log('Typing users after timeout (should be empty):', typingUsers);
    console.log(`Is user in typing list? ${typingUsers.includes(userId)}`);

    // Test 4: Update typing status again and then set to false
    console.log('\nTest 4: Update typing status again and then set to false');
    typingStatusManager.updateTypingStatus(conversationId, userId, true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    typingUsers = typingStatusManager.getTypingUsers(conversationId);
    console.log('Typing users after setting to true again:', typingUsers);
    
    // Set typing to false
    typingStatusManager.updateTypingStatus(conversationId, userId, false);
    typingUsers = typingStatusManager.getTypingUsers(conversationId);
    console.log('Typing users after setting to false:', typingUsers);
    console.log(`Is user in typing list? ${typingUsers.includes(userId)}`);

    // Test memory state of typing status manager
    console.log('\nTyping Status Manager state:');
    console.log('Typing users map size:', typingStatusManager.typingUsers.size);
    console.log('Typing timeouts map size:', typingStatusManager.typingTimeouts.size);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0); // Exit to prevent hanging due to any lingering timeouts
  }
}

testTypingStatus(); 