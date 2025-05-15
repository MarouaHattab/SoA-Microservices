const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const API_URL = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const propertyId = '682566c1f915a71479c731b9';
const userId = '1234567890';

// Generate a token with EXACTLY the same format as the auth middleware expects
const token = jwt.sign({ 
  id: userId,
  role: 'user'
}, JWT_SECRET);

console.log('Generated token:', token);
console.log('Token payload:', jwt.decode(token));

// First get the property to verify it exists
async function getProperty() {
  try {
    console.log('Fetching property...');
    const response = await axios({
      method: 'get',
      url: `${API_URL}/properties/${propertyId}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Property fetch successful!');
    console.log('Status:', response.status);
    console.log('Property data:', response.data);
    
    // Verify ownership
    const property = response.data.property;
    if (property) {
      console.log('Property owner_id:', property.owner_id);
      console.log('Current user_id:', userId);
      console.log('Are they the same?', property.owner_id === userId);
      console.log('String comparison:', String(property.owner_id).trim() === String(userId).trim());
    }
    
    return true;
  } catch (error) {
    console.error('Error fetching property:', error.response ? error.response.status : error.message);
    console.error('Error data:', error.response ? error.response.data : 'No response');
    return false;
  }
}

// Make the update request
async function testUpdate() {
  try {
    console.log('\nAttempting to update property...');
    const response = await axios({
      method: 'put',
      url: `${API_URL}/properties/${propertyId}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        description: 'Updated via simple test'
      }
    });
    
    console.log('Update successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error updating property:', error.response ? error.response.status : error.message);
    console.error('Error data:', error.response ? error.response.data : 'No response');
  }
}

// Run the tests
async function runTests() {
  const propertyExists = await getProperty();
  if (propertyExists) {
    await testUpdate();
  }
}

runTests(); 