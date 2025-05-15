// debug-typing-implementation.js
require('dotenv').config();
const typingStatusManager = require('./typing-status-manager');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

// Test direct use of the typing status manager
function testDirectUsage() {
  console.log('\n=== Testing TypingStatusManager directly ===');
  
  const conversationId = '6825453e57ed264e894ff968';
  const userId = 'test-user-id';
  
  console.log(`Setting typing status to TRUE for user ${userId} in conversation ${conversationId}`);
  const result = typingStatusManager.updateTypingStatus(conversationId, userId, true);
  console.log(`Update result: ${result}`);
  
  // Get typing users immediately
  let typingUsers = typingStatusManager.getTypingUsers(conversationId);
  console.log('Typing users immediately after setting:', typingUsers);
  console.log(`Is user in list? ${typingUsers.includes(userId)}`);
  
  // Check internal state
  console.log('\nInternal state of typing status manager:');
  console.log('typingUsers map size:', typingStatusManager.typingUsers.size);
  console.log('typingTimeouts map size:', typingStatusManager.typingTimeouts.size);
  
  // Print contents of the maps for debugging
  console.log('\nContents of typingUsers map:');
  for (const [convId, usersSet] of typingStatusManager.typingUsers.entries()) {
    console.log(`- Conversation ${convId}: ${Array.from(usersSet).join(', ')}`);
  }
  
  console.log('\nContents of typingTimeouts map:');
  const timeoutKeys = Array.from(typingStatusManager.typingTimeouts.keys());
  console.log(`- Timeout keys: ${timeoutKeys.join(', ')}`);
  
  // Set typing to false
  console.log('\nSetting typing status to FALSE');
  typingStatusManager.updateTypingStatus(conversationId, userId, false);
  typingUsers = typingStatusManager.getTypingUsers(conversationId);
  console.log('Typing users after setting to false:', typingUsers);
}

// Test the gRPC implementation
async function testGrpcImplementation() {
  try {
    console.log('\n=== Testing gRPC implementation ===');
    
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
    
    const conversationId = '6825453e57ed264e894ff968';
    const userId = 'test-user-id';
    
    // Update typing status
    console.log(`Setting typing status via gRPC for user ${userId}`);
    const updateResponse = await updateTypingStatus({
      user_id: userId,
      conversation_id: conversationId,
      is_typing: true
    });
    console.log('Update response:', updateResponse);
    
    // Get typing users
    console.log('\nGetting typing users via gRPC');
    const typingResponse = await getTypingUsers({
      conversation_id: conversationId
    });
    console.log('Typing users from server:', typingResponse.typing_user_ids);
    console.log(`Is user in list? ${typingResponse.typing_user_ids.includes(userId)}`);
    
    // Check typing manager state again
    const managerUsers = typingStatusManager.getTypingUsers(conversationId);
    console.log('\nTyping users from manager directly:', managerUsers);
    console.log(`Is user in manager list? ${managerUsers.includes(userId)}`);
    
    // Cleanup
    await updateTypingStatus({
      user_id: userId,
      conversation_id: conversationId,
      is_typing: false
    });
    
    client.close();
  } catch (error) {
    console.error('Error in gRPC test:', error);
  }
}

async function runTests() {
  // Test direct usage of typing status manager
  testDirectUsage();
  
  // Test gRPC implementation
  await testGrpcImplementation();
  
  console.log('\nTests completed');
}

runTests(); 