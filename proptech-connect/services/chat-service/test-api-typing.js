// test-api-typing.js
require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const CONVERSATION_ID = '6825453e57ed264e894ff968'; // Use the conversation ID from your API test

// Function to prompt for token
function promptForToken() {
  return new Promise((resolve) => {
    rl.question('Enter your JWT token: ', (token) => {
      resolve(token);
    });
  });
}

// Run the test
async function testApiTyping(token) {
  try {
    // Set up axios with authentication
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log(`\nTesting typing API for conversation: ${CONVERSATION_ID}`);
    
    // Get current user info by decoding token
    const [, payload] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    console.log(`\nAuthenticated as user: ${decoded.id}`);
    
    // 1. First get current typing users
    console.log('\nGetting current typing users...');
    const initialResponse = await axios.get(`${API_BASE_URL}/chat/typing/${CONVERSATION_ID}`);
    console.log('Current typing users:', initialResponse.data);
    
    // 2. Set our status to typing
    console.log('\nSetting typing status to TRUE...');
    const updateResponse = await axios.post(`${API_BASE_URL}/chat/typing`, {
      conversation_id: CONVERSATION_ID,
      is_typing: true
    });
    console.log('Update response:', updateResponse.data);
    
    // 3. Check typing users again immediately
    console.log('\nChecking typing users immediately after update...');
    const afterUpdateResponse = await axios.get(`${API_BASE_URL}/chat/typing/${CONVERSATION_ID}`);
    console.log('Typing users after update:', afterUpdateResponse.data);
    console.log(`Does list include our user ID (${decoded.id})? ${afterUpdateResponse.data.includes(decoded.id)}`);
    
    // 4. Wait 2 seconds and check again
    console.log('\nWaiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Checking typing users after 2 seconds...');
    const delayedResponse = await axios.get(`${API_BASE_URL}/chat/typing/${CONVERSATION_ID}`);
    console.log('Typing users after 2 seconds:', delayedResponse.data);
    console.log(`Does list include our user ID (${decoded.id})? ${delayedResponse.data.includes(decoded.id)}`);
    
    // 5. Set typing to false
    console.log('\nSetting typing status to FALSE...');
    const updateFalseResponse = await axios.post(`${API_BASE_URL}/chat/typing`, {
      conversation_id: CONVERSATION_ID,
      is_typing: false
    });
    console.log('Update response:', updateFalseResponse.data);
    
    // 6. Check final state
    console.log('\nChecking final typing state...');
    const finalResponse = await axios.get(`${API_BASE_URL}/chat/typing/${CONVERSATION_ID}`);
    console.log('Final typing users:', finalResponse.data);
    
  } catch (error) {
    console.error('Error during test:', error.response ? error.response.data : error.message);
  } finally {
    rl.close();
  }
}

// Main execution
async function main() {
  // Get JWT token
  const token = await promptForToken();
  if (!token) {
    console.error('Token is required');
    process.exit(1);
  }
  
  await testApiTyping(token);
}

main(); 