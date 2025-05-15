const jwt = require('jsonwebtoken');
const axios = require('axios');
const grpcClients = require('./grpc-clients');

// Configuration
const API_URL = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Test user (property owner)
const testUser = {
  id: process.argv[2] || '1234567890',  // Pass user ID as first argument
  name: 'Test User',
  email: 'test@example.com',
  role: 'user'
};

// Generate JWT token
function generateToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

// Test API with authentication
async function testAPI(endpoint, method, data = null) {
  const token = generateToken(testUser);
  
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: data ? data : undefined
    };
    
    console.log(`Testing ${method} ${endpoint}...`);
    console.log('Request config:', config);
    
    const response = await axios(config);
    console.log('Response:', response.status, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error:', error.response ? error.response.status : error.message);
    console.error('Error data:', error.response ? error.response.data : 'No response');
    return { success: false, error: error.response ? error.response.data : error.message };
  }
}

// Create a test property
async function createTestProperty() {
  console.log('Creating test property...');
  
  const propertyData = {
    title: 'Test Property',
    description: 'A property for testing ownership',
    price: 250000,
    location: 'Test City',
    address: '123 Test St, Test City',
    bedrooms: 3,
    bathrooms: 2,
    area: 1500,
    property_type: 'house'
  };
  
  const result = await testAPI('/properties', 'post', propertyData);
  if (result.success) {
    console.log('Property created successfully!');
    console.log('Property ID:', result.data.property.id);
    console.log('Owner ID:', result.data.property.owner_id);
    return result.data.property;
  } else {
    console.error('Failed to create property');
    process.exit(1);
  }
}

// Test updating a property
async function testUpdateProperty(propertyId) {
  console.log('\nTesting property update...');
  const updateData = {
    price: 255000,
    description: 'Updated test property'
  };
  
  return await testAPI(`/properties/${propertyId}`, 'put', updateData);
}

// Test deleting a property
async function testDeleteProperty(propertyId) {
  console.log('\nTesting property deletion...');
  return await testAPI(`/properties/${propertyId}`, 'delete');
}

// Run tests
async function runTests() {
  try {
    // Data type debugging
    console.log('\nDebugging user ID data types:');
    console.log('Test user ID:', testUser.id);
    console.log('Test user ID type:', typeof testUser.id);
    
    // Create a test property
    const property = await createTestProperty();
    
    if (!property) {
      console.error('Could not create test property. Exiting...');
      return;
    }
    
    // Wait a bit to allow server-side processing
    console.log('\nWaiting 2 seconds before update test...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test update
    const updateResult = await testUpdateProperty(property.id);
    console.log('Update result:', updateResult.success ? 'Success' : 'Failed');
    
    // Wait a bit to allow server-side processing
    console.log('\nWaiting 2 seconds before delete test...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test delete 
    const deleteResult = await testDeleteProperty(property.id);
    console.log('Delete result:', deleteResult.success ? 'Success' : 'Failed');
    
    console.log('\nTests completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests(); 