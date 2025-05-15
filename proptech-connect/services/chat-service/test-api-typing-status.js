// test-api-typing-status.js
require('dotenv').config();
const axios = require('axios');

// You need to get a valid JWT token for the test user
// Replace this with a valid token from your system
const TOKEN = process.argv[2]; // Pass token as command-line argument
const API_BASE_URL = 'http://localhost:3000/api';

// Set axios default headers with authorization
axios.defaults.headers.common['Authorization'] = `Bearer ${TOKEN}`;

async function testApiTypingStatus() {
  try {
    if (!TOKEN) {
      console.error('Please provide a valid JWT token as command-line argument');
      process.exit(1);
    }

    // Step 1: Get user's conversations
    console.log('Fetching conversations...');
    const { data: conversations } = await axios.get(`${API_BASE_URL}/chat/conversations`);
    
    if (!conversations || conversations.length === 0) {
      console.error('No conversations found for this user');
      process.exit(1);
    }
    
    // Use the first conversation
    const conversationId = conversations[0].id;
    console.log(`Using conversation ID: ${conversationId}`);
    
    // Step 2: Update typing status to TRUE
    console.log('\nSetting typing status to TRUE...');
    const updateResponse = await axios.post(`${API_BASE_URL}/chat/typing`, {
      conversation_id: conversationId,
      is_typing: true
    });
    
    console.log('Update response:', updateResponse.data);
    
    // Step 3: Get typing users immediately
    console.log('\nGetting typing users immediately...');
    const typingResponse1 = await axios.get(`${API_BASE_URL}/chat/typing/${conversationId}`);
    console.log('Typing users:', typingResponse1.data);
    
    // Step 4: Wait a moment and check again
    console.log('\nWaiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Getting typing users after 2 seconds...');
    const typingResponse2 = await axios.get(`${API_BASE_URL}/chat/typing/${conversationId}`);
    console.log('Typing users after 2 seconds:', typingResponse2.data);
    
    // Step 5: Update typing status to FALSE
    console.log('\nSetting typing status to FALSE...');
    const updateFalseResponse = await axios.post(`${API_BASE_URL}/chat/typing`, {
      conversation_id: conversationId,
      is_typing: false
    });
    
    console.log('Update response:', updateFalseResponse.data);
    
    // Step 6: Get typing users after setting to false
    console.log('\nGetting typing users after setting to FALSE...');
    const typingResponse3 = await axios.get(`${API_BASE_URL}/chat/typing/${conversationId}`);
    console.log('Typing users after setting to false:', typingResponse3.data);
    
  } catch (error) {
    console.error('Error during test:', error.response ? error.response.data : error.message);
  }
}

testApiTypingStatus(); 