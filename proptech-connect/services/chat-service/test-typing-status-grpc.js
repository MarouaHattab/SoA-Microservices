// test-typing-status-grpc.js
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
  'localhost:50054', // Adjust this if your service is on a different port
  grpc.credentials.createInsecure()
);

// Promisify gRPC methods
const updateTypingStatus = promisify(client.UpdateTypingStatus.bind(client));
const getTypingUsers = promisify(client.GetTypingUsers.bind(client));
const getConversations = promisify(client.GetConversations.bind(client));

// Test function
async function testTypingStatusGRPC() {
  try {
    // Choose a test user ID - this should be a valid user ID in your system
    const userId = process.argv[2]; // Pass user ID as command-line argument
    
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
    
    // Test 1: Update typing status to true
    console.log('\nTest 1: Setting typing status to TRUE');
    const updateResponse = await updateTypingStatus({
      user_id: userId,
      conversation_id: conversationId,
      is_typing: true
    });
    
    console.log('Update typing status response:', updateResponse);
    
    // Test 2: Get typing users immediately
    console.log('\nTest 2: Getting typing users immediately');
    let typingResponse = await getTypingUsers({ conversation_id: conversationId });
    console.log('Typing users:', typingResponse.typing_user_ids);
    console.log(`Is user in typing list? ${typingResponse.typing_user_ids.includes(userId)}`);
    
    // Test 3: Wait a moment and check again
    console.log('\nTest 3: Getting typing users after 2 seconds');
    await new Promise(resolve => setTimeout(resolve, 2000));
    typingResponse = await getTypingUsers({ conversation_id: conversationId });
    console.log('Typing users after 2 seconds:', typingResponse.typing_user_ids);
    console.log(`Is user in typing list? ${typingResponse.typing_user_ids.includes(userId)}`);
    
    // Test 4: Update typing status to false
    console.log('\nTest 4: Setting typing status to FALSE');
    const updateFalseResponse = await updateTypingStatus({
      user_id: userId,
      conversation_id: conversationId,
      is_typing: false
    });
    
    console.log('Update typing status to false response:', updateFalseResponse);
    
    // Test 5: Get typing users after setting to false
    console.log('\nTest 5: Getting typing users after setting to false');
    typingResponse = await getTypingUsers({ conversation_id: conversationId });
    console.log('Typing users after setting to false:', typingResponse.typing_user_ids);
    console.log(`Is user in typing list? ${typingResponse.typing_user_ids.includes(userId)}`);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Close the gRPC client
    client.close();
  }
}

testTypingStatusGRPC(); 