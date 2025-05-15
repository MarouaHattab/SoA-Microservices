const grpcClients = require('./grpc-clients');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Replace these with your actual values
const propertyId = process.argv[2]; // Pass property ID as first argument
const userId = process.argv[3]; // Pass user ID as second argument 
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

if (!propertyId || !userId) {
  console.error('Usage: node debug-property-auth.js [propertyId] [userId]');
  process.exit(1);
}

// Generate JWT token with the specified user ID
function generateToken(userId) {
  return jwt.sign({ 
    id: userId,
    name: 'Debug User',
    email: 'debug@example.com',
    role: 'user'
  }, JWT_SECRET, { expiresIn: '1h' });
}

async function debugPropertyAuth() {
  try {
    console.log(`Debugging property ownership check for property ID: ${propertyId} and user ID: ${userId}`);
    
    // Step 1: Get the property via gRPC
    console.log('\nStep 1: Fetching property details via gRPC...');
    const propertyResponse = await grpcClients.propertyService.getPropertyAsync({ id: propertyId });
    
    console.log('Full property response:', JSON.stringify(propertyResponse, null, 2));
    
    if (!propertyResponse || !propertyResponse.property) {
      console.log('ERROR: Property not found or response structure is invalid');
      return;
    }
    
    // Step 2: Check the owner_id
    console.log('\nStep 2: Checking property ownership...');
    const property = propertyResponse.property;
    console.log('Property owner_id:', property.owner_id);
    console.log('Current user_id:', userId);
    console.log('Are they the same?', property.owner_id === userId);
    
    if (property.owner_id === userId) {
      console.log('SUCCESS: User is the property owner and should have access');
    } else {
      console.log('ATTENTION: User is NOT the property owner');
      
      // Check data types
      console.log('\nData type check:');
      console.log('typeof property.owner_id:', typeof property.owner_id);
      console.log('typeof userId:', typeof userId);
      
      // Try strict equality
      console.log('\nStrict equality check:');
      console.log('property.owner_id === userId:', property.owner_id === userId);
      
      // Try loose equality 
      console.log('property.owner_id == userId:', property.owner_id == userId);
      
      // Try trimming
      console.log('\nTrimmed comparison:');
      console.log('property.owner_id.trim() === userId.trim():', 
        property.owner_id?.trim() === userId?.trim());
      
      // Try string conversion
      console.log('\nString conversion comparison:');
      console.log('String(property.owner_id).trim() === String(userId).trim():',
        String(property.owner_id).trim() === String(userId).trim());
    }
    
    // Step 3: Test API routes directly
    console.log('\nStep 3: Testing API routes directly...');
    const token = generateToken(userId);
    console.log('Generated JWT with user ID:', userId);
    
    // Test the update route
    try {
      console.log('\nTesting PUT /properties/:id route...');
      const updateResponse = await axios({
        method: 'put',
        url: `http://localhost:3000/api/properties/${propertyId}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          description: 'Updated via debug script'
        }
      });
      
      console.log('Update response status:', updateResponse.status);
      console.log('Update successful!');
    } catch (error) {
      console.error('Update route error:', error.response ? error.response.status : error.message);
      console.error('Error data:', error.response ? error.response.data : 'No response data');
      
      if (error.response && error.response.status === 403) {
        console.log('\nIdentifying authorization issue:');
        // Log the request details that were sent
        console.log('Request JWT payload:', jwt.decode(token));
        console.log('Request property ID:', propertyId);
      }
    }
    
  } catch (error) {
    console.error('Error during debugging:', error);
  }
}

debugPropertyAuth(); 