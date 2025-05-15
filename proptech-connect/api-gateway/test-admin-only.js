const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const API_URL = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const propertyId = '682566c1f915a71479c731b9'; // Replace with your property ID

// Test users
const regularUser = {
  id: '1234567890',
  name: 'Regular User',
  email: 'user@example.com',
  role: 'user'
};

const adminUser = {
  id: '0987654321',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin'
};

// Generate JWT token
function generateToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

// Make API request
async function makeRequest(user, method, endpoint, data = null) {
  const token = generateToken(user);
  
  try {
    const response = await axios({
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data
    });
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response ? error.response.status : null,
      error: error.response ? error.response.data : error.message
    };
  }
}

// Test update property
async function testUpdateProperty() {
  console.log('=== TESTING UPDATE PROPERTY ===');
  
  // Test with regular user
  console.log('\n1. Testing with regular user:');
  const regularUserResult = await makeRequest(
    regularUser,
    'put',
    `/properties/${propertyId}`,
    { description: 'Updated by regular user' }
  );
  
  console.log('Status:', regularUserResult.status);
  console.log('Result:', regularUserResult.success ? 'Success' : 'Failed');
  console.log('Response:', regularUserResult.success ? regularUserResult.data : regularUserResult.error);
  
  // Test with admin user
  console.log('\n2. Testing with admin user:');
  const adminUserResult = await makeRequest(
    adminUser,
    'put',
    `/properties/${propertyId}`,
    { description: 'Updated by admin user' }
  );
  
  console.log('Status:', adminUserResult.status);
  console.log('Result:', adminUserResult.success ? 'Success' : 'Failed');
  console.log('Response:', adminUserResult.success ? adminUserResult.data : adminUserResult.error);
}

// Test delete property
async function testDeleteProperty() {
  console.log('\n=== TESTING DELETE PROPERTY ===');
  
  // Test with regular user
  console.log('\n1. Testing with regular user:');
  const regularUserResult = await makeRequest(
    regularUser,
    'delete',
    `/properties/${propertyId}`
  );
  
  console.log('Status:', regularUserResult.status);
  console.log('Result:', regularUserResult.success ? 'Success' : 'Failed');
  console.log('Response:', regularUserResult.success ? regularUserResult.data : regularUserResult.error);
  
  // Test with admin user (commented out to prevent actual deletion)
  console.log('\n2. Testing with admin user (SIMULATED - not actually deleting):');
  console.log('Status: Would be 200 OK');
  console.log('Result: Would be Success');
  console.log('Response: Would contain success message');
  
  // Uncomment to actually test admin deletion
  /*
  const adminUserResult = await makeRequest(
    adminUser,
    'delete',
    `/properties/${propertyId}`
  );
  
  console.log('Status:', adminUserResult.status);
  console.log('Result:', adminUserResult.success ? 'Success' : 'Failed');
  console.log('Response:', adminUserResult.success ? adminUserResult.data : adminUserResult.error);
  */
}

// Run tests
async function runTests() {
  await testUpdateProperty();
  await testDeleteProperty();
  console.log('\n=== TESTS COMPLETED ===');
}

runTests(); 