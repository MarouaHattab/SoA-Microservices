// debug-current-user.js
require('dotenv').config();
const axios = require('axios');

// Pass token as command-line argument
const TOKEN = process.argv[2];
const API_BASE_URL = 'http://localhost:3000/api';

// Set axios default headers with authorization
axios.defaults.headers.common['Authorization'] = `Bearer ${TOKEN}`;

async function debugCurrentUser() {
  try {
    if (!TOKEN) {
      console.error('Please provide a valid JWT token as command-line argument');
      process.exit(1);
    }

    // Try to get conversations (this requires authentication)
    console.log('Attempting to get conversations with provided token...');
    try {
      const { data: conversations } = await axios.get(`${API_BASE_URL}/chat/conversations`);
      console.log('Authentication successful!');
      console.log(`Found ${conversations.length} conversations`);
      
      // Decode the JWT token to get user information
      const [, payload] = TOKEN.split('.');
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      
      console.log('\nToken information:');
      console.log(decoded);
      console.log(`\nUser ID: ${decoded.id}`);
      console.log(`Role: ${decoded.role}`);
      
      if (conversations.length > 0) {
        console.log('\nFirst conversation details:');
        console.log(`ID: ${conversations[0].id}`);
        console.log(`Participants: ${conversations[0].participants.join(', ')}`);
        console.log(`Is group: ${conversations[0].is_group}`);
      }
    } catch (error) {
      console.error('Authentication failed:', error.response ? error.response.data : error.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugCurrentUser(); 