// test-group-message.js
require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-chat';
console.log('Using MongoDB URI:', MONGODB_URI);

// Define schemas
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

const conversationSchema = new mongoose.Schema({
  participants: [String],
  participant_roles: [String],
  is_group: { type: Boolean, default: false },
  group_name: { type: String },
  creator_id: { type: String },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
});

// Override the models only if they're not already defined
let Message, Conversation;
try {
  Message = mongoose.model('Message');
} catch (e) {
  Message = mongoose.model('Message', messageSchema);
}

try {
  Conversation = mongoose.model('Conversation');
} catch (e) {
  Conversation = mongoose.model('Conversation', conversationSchema);
}

// Simulate sending a message to a group
async function testGroupMessage() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all group conversations
    const groupConversations = await Conversation.find({ is_group: true });
    
    if (groupConversations.length === 0) {
      console.log('No group conversations found. Please create a group conversation first.');
      return;
    }
    
    // Use the first group conversation for testing
    const testGroup = groupConversations[0];
    console.log(`\nUsing group: ${testGroup.group_name || testGroup._id}`);
    console.log(`Group participants: ${testGroup.participants.join(', ')}`);
    
    // Check if there are participants in the group
    if (testGroup.participants.length < 2) {
      console.log('The group needs at least 2 participants for a meaningful test.');
      return;
    }
    
    // Choose the first participant as the sender
    const senderId = testGroup.participants[0];
    
    // Create a test message with the updated receiver_id logic
    const receiverIds = testGroup.participants.filter(p => p !== senderId).join(',');
    
    console.log(`\nCreating test message from ${senderId} to all other participants in group`);
    console.log(`Receivers: ${receiverIds}`);
    
    // Mock user info
    const senderInfo = {
      role: 'buyer',
      name: 'Test Sender'
    };
    
    // Create and save the test message
    const testMessage = new Message({
      sender_id: senderId,
      sender_role: senderInfo.role,
      sender_name: senderInfo.name,
      receiver_id: receiverIds, // This should include all other participants
      content: 'This is a test group message with multiple receivers',
      conversation_id: testGroup._id,
      is_read: false,
      is_ai: false,
      created_at: new Date().toISOString()
    });
    
    const savedMessage = await testMessage.save();
    console.log('\nTest message saved successfully!');
    console.log(`Message ID: ${savedMessage._id}`);
    console.log(`Receiver IDs: ${savedMessage.receiver_id}`);
    
    // Verify the message is saved correctly with all receivers
    const retrievedMessage = await Message.findById(savedMessage._id);
    console.log('\nVerifying saved message:');
    console.log(`- Sender ID: ${retrievedMessage.sender_id}`);
    console.log(`- Receiver IDs: ${retrievedMessage.receiver_id}`);
    console.log(`- Conversation ID: ${retrievedMessage.conversation_id}`);
    console.log(`- Content: ${retrievedMessage.content}`);
    
    // Check if all participants except sender are included in receiver_id
    const expectedReceivers = testGroup.participants.filter(p => p !== senderId).join(',');
    const receiverMatches = retrievedMessage.receiver_id === expectedReceivers;
    
    console.log(`\nReceiver IDs match expected format: ${receiverMatches}`);
    if (!receiverMatches) {
      console.log(`Expected: ${expectedReceivers}`);
      console.log(`Actual: ${retrievedMessage.receiver_id}`);
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testGroupMessage(); 