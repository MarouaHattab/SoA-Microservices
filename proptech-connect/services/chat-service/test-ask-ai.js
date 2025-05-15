// test-ask-ai.js
require('dotenv').config();
const mongoose = require('mongoose');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

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

// Override the model only if it's not already defined
let Message;
try {
  Message = mongoose.model('Message');
} catch (e) {
  Message = mongoose.model('Message', messageSchema);
}

// Simulate the AskAI function call
async function testAskAI() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test data
    const userId = '68252f5297cdb61797053d44'; // Replace with your test user ID
    const conversationId = '6825453e57ed264e894ff968'; // Replace with your test conversation ID
    const query = 'What are the best neighborhoods in Tunisia for families?';

    console.log(`\nSimulating user ${userId} asking AI: "${query}" in conversation ${conversationId}`);

    // First, check how many messages are in the conversation before our test
    const messagesBefore = await Message.find({ conversation_id: conversationId }).sort({ created_at: 1 });
    console.log(`\nBefore test: ${messagesBefore.length} messages in conversation`);

    // Show all messages before the test
    console.log('\nCurrent messages in conversation:');
    messagesBefore.forEach((message, index) => {
      console.log(`\nMessage #${index + 1}:`);
      console.log(`- ID: ${message._id}`);
      console.log(`- Sender ID: ${message.sender_id}`);
      console.log(`- Sender Name: ${message.sender_name}`);
      console.log(`- Is AI: ${message.is_ai}`);
      console.log(`- Created At: ${message.created_at}`);
      console.log(`- Content: ${message.content.substring(0, 50)}...`);
    });

    // Manually execute both parts of the AskAI function
    console.log('\nSaving user query as a message...');
    
    // First save the user's query as a message
    const userQueryMessage = new Message({
      sender_id: userId,
      sender_role: 'buyer', // Assume role for test
      sender_name: 'Test User',
      receiver_id: 'AI',
      content: query,
      conversation_id: conversationId,
      is_read: true,
      is_ai: false, // Important: user query is NOT an AI message
      created_at: new Date().toISOString()
    });
    
    await userQueryMessage.save();
    console.log('User query saved to conversation');

    // Then save a mock AI response as a message
    console.log('\nSaving AI response as a message...');
    const mockAiResponse = "For families in Tunisia, the best neighborhoods are La Marsa, Carthage, and Les Berges du Lac in Tunis. These areas offer good schools, parks, and family-friendly amenities.";
    
    const aiResponseMessage = new Message({
      sender_id: 'AI',
      sender_role: 'admin',
      sender_name: 'Assistant IA',
      receiver_id: userId,
      content: mockAiResponse,
      conversation_id: conversationId,
      is_read: false,
      is_ai: true, // This IS an AI message
      created_at: new Date(Date.now() + 500).toISOString() // Add small delay to ensure correct ordering
    });
    
    await aiResponseMessage.save();
    console.log('AI response saved to conversation');

    // Check the conversation messages after our test
    const messagesAfter = await Message.find({ conversation_id: conversationId }).sort({ created_at: 1 });
    console.log(`\nAfter test: ${messagesAfter.length} messages in conversation`);
    
    // Show all messages after the test to verify proper ordering
    console.log('\nAll messages in conversation after test:');
    messagesAfter.forEach((message, index) => {
      console.log(`\nMessage #${index + 1}:`);
      console.log(`- ID: ${message._id}`);
      console.log(`- Sender ID: ${message.sender_id}`);
      console.log(`- Sender Name: ${message.sender_name}`);
      console.log(`- Is AI: ${message.is_ai}`);
      console.log(`- Created At: ${message.created_at}`);
      console.log(`- Content: ${message.content.substring(0, 50)}...`);
    });

    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testAskAI(); 