const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:3000';
const OUTPUT_FILE = path.join(__dirname, 'postman_environment.json');

// Test data
const TEST_USERS = [
  {
    name: 'Test Buyer',
    email: 'buyer@example.com',
    password: 'Password123',
    role: 'buyer',
    phone: '+1234567890'
  },
  {
    name: 'Test Seller',
    email: 'seller@example.com',
    password: 'Password123',
    role: 'seller',
    phone: '+1987654321'
  },
  {
    name: 'Test Agent',
    email: 'agent@example.com',
    password: 'Password123',
    role: 'agent',
    phone: '+1122334455'
  }
];

const TEST_PROPERTIES = [
  {
    title: 'Spacious Family Home',
    description: 'Beautiful family home in a quiet neighborhood with excellent schools',
    price: 450000,
    location: 'New York',
    address: '123 Main St, New York, NY 10001',
    bedrooms: 4,
    bathrooms: 3,
    area: 2200,
    property_type: 'house',
    features: ['garden', 'garage', 'fireplace', 'central air'],
    images: ['https://example.com/house1.jpg', 'https://example.com/house2.jpg']
  },
  {
    title: 'Modern Downtown Apartment',
    description: 'Sleek apartment in the heart of downtown with stunning city views',
    price: 325000,
    location: 'New York',
    address: '456 Park Ave, New York, NY 10022',
    bedrooms: 2,
    bathrooms: 2,
    area: 1100,
    property_type: 'apartment',
    features: ['balcony', 'doorman', 'gym', 'pool'],
    images: ['https://example.com/apt1.jpg', 'https://example.com/apt2.jpg']
  }
];

// Postman environment template
const environmentTemplate = {
  "id": "postman-env-" + Date.now(),
  "name": "PropTech Connect Test Environment",
  "values": [
    {
      "key": "base_url",
      "value": API_URL,
      "type": "default",
      "enabled": true
    }
  ],
  "_postman_variable_scope": "environment"
};

// Helper function to add a variable to the environment
function addToEnvironment(key, value) {
  environmentTemplate.values.push({
    key,
    value,
    type: "default",
    enabled: true
  });
  console.log(`Added to environment: ${key} = ${value}`);
}

// Register a user and get authentication token
async function registerUser(userData) {
  try {
    const response = await axios.post(`${API_URL}/api/auth/register`, userData);
    return response.data;
  } catch (error) {
    console.error(`Error registering user ${userData.email}:`, error.response?.data || error.message);
    
    // Try login if registration fails (user might already exist)
    try {
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: userData.email,
        password: userData.password
      });
      return loginResponse.data;
    } catch (loginError) {
      console.error(`Error logging in as ${userData.email}:`, loginError.response?.data || loginError.message);
      return null;
    }
  }
}

// Create a property with authentication
async function createProperty(propertyData, token) {
  try {
    const response = await axios.post(`${API_URL}/api/properties`, propertyData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating property:', error.response?.data || error.message);
    return null;
  }
}

// Main function to set up test data
async function setupTestData() {
  console.log('🔍 Setting up test data for PropTech Connect...\n');
  
  try {
    // 1. Register test users
    console.log('--- Registering Test Users ---');
    const users = [];
    
    for (const userData of TEST_USERS) {
      const user = await registerUser(userData);
      if (user) {
        users.push(user);
        console.log(`✅ User registered: ${userData.email} (${userData.role})`);
      }
    }
    
    if (users.length === 0) {
      console.error('❌ Failed to register any users. Aborting setup.');
      return false;
    }
    
    // Set seller user for token
    const sellerUser = users.find(u => u.user.role === 'seller') || users[0];
    const sellerToken = sellerUser.token;
    const sellerId = sellerUser.user.id;
    
    // Set buyer user
    const buyerUser = users.find(u => u.user.role === 'buyer') || (users[1] || users[0]);
    const buyerId = buyerUser.user.id;
    
    // Add user data to environment
    addToEnvironment('existing_user_email', sellerUser.user.email);
    addToEnvironment('existing_user_password', 'Password123');
    addToEnvironment('auth_token', sellerToken);
    addToEnvironment('user_id', sellerId);
    addToEnvironment('recipient_user_id', buyerId);
    
    // 2. Create test properties
    console.log('\n--- Creating Test Properties ---');
    const properties = [];
    
    for (const propertyData of TEST_PROPERTIES) {
      // Assign the seller as the owner
      const propertyWithOwner = { ...propertyData, owner_id: sellerId };
      const property = await createProperty(propertyWithOwner, sellerToken);
      
      if (property) {
        properties.push(property);
        console.log(`✅ Property created: ${propertyData.title}`);
      }
    }
    
    if (properties.length === 0) {
      console.error('❌ Failed to create any properties.');
    } else {
      // Add property data to environment
      addToEnvironment('existing_property_id', properties[0].property.id);
    }
    
    // 3. Save environment to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(environmentTemplate, null, 2));
    console.log(`\n✅ Postman environment saved to ${OUTPUT_FILE}`);
    console.log('   Import this file into Postman to start testing.');
    
    return true;
  } catch (error) {
    console.error('Error setting up test data:', error);
    return false;
  }
}

// Check if API gateway is reachable
async function checkApiGateway() {
  try {
    await axios.get(`${API_URL}/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error(`❌ API Gateway not reachable at ${API_URL}`);
    console.error('   Make sure all services are running before setup.');
    return false;
  }
}

// Run the setup
async function run() {
  const apiGatewayRunning = await checkApiGateway();
  
  if (apiGatewayRunning) {
    const success = await setupTestData();
    process.exit(success ? 0 : 1);
  } else {
    process.exit(1);
  }
}

run(); 