// test-self-typing.js
require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

// Load proto file
const PROTO_PATH = path.join(__dirname, '../../proto/chat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;

// Create gRPC client
const client = new chatProto.ChatService(
  'localhost:50054',
  grpc.credentials.createInsecure()
);

// Promisify gRPC methods
const updateTypingStatus = promisify(client.UpdateTypingStatus.bind(client));
const getTypingUsers = promisify(client.GetTypingUsers.bind(client));
const getConversations = promisify(client.GetConversations.bind(client));

async function testSelfTyping() {
  try {
    // Get user ID from command line
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('Please provide a user ID as command-line argument');
      process.exit(1);
    }
    
    console.log(`Testing with user ID: ${userId}`);
    
    // Get user's conversations
    console.log('\nFetching user conversations...');
    const conversationsResponse = await getConversations({ user_id: userId });
    
    if (!conversationsResponse.conversations || conversationsResponse.conversations.length === 0) {
      console.error('No conversations found for this user');
      process.exit(1);
    }
    
    // Use the first conversation
    const conversationId = conversationsResponse.conversations[0].id;
    console.log(`Using conversation ID: ${conversationId}`);
    
    // Set typing status to true
    console.log('\nSetting typing status to TRUE');
    await updateTypingStatus({
      user_id: userId,
      conversation_id: conversationId,
      is_typing: true
    });
    
    console.log('Typing status updated to TRUE');
    
    // Get typing users from the same user's perspective
    console.log('\nGetting typing users (should not include self)');
    const typingResponse = await getTypingUsers({ 
      conversation_id: conversationId
    });
    
    console.log('Typing users from server:', typingResponse.typing_user_ids);
    console.log(`Is user (${userId}) in typing list? ${typingResponse.typing_user_ids.includes(userId)}`);
    
    // Compare with typing status manager's raw data
    console.log('\nDirect check if typing status is set in manager:');
    const typingStatusManager = require('./typing-status-manager');
    console.log('Users in typing manager:', typingStatusManager.getTypingUsers(conversationId));
    
    // Clean up
    console.log('\nSetting typing status back to FALSE');
    await updateTypingStatus({
      user_id: userId,
      conversation_id: conversationId,
      is_typing: false
    });
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Close the gRPC client
    client.close();
  }
}

testSelfTyping(); 