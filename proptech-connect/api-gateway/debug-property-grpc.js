const grpcClients = require('./grpc-clients');

/**
 * Debug script to test direct gRPC calls to the property service
 */

async function testPropertyService() {
  console.log('Testing direct gRPC calls to property service...\n');

  try {
    // Test 1: Get all properties
    console.log('Test 1: Getting all properties via gRPC...');
    const propertiesResult = await grpcClients.propertyService.searchPropertiesAsync({});
    console.log('Properties result type:', typeof propertiesResult);
    console.log('Properties result:', JSON.stringify(propertiesResult, null, 2));
    
    if (propertiesResult && propertiesResult.properties) {
      console.log(`Found ${propertiesResult.properties.length} properties`);
      
      if (propertiesResult.properties.length > 0) {
        const firstPropertyId = propertiesResult.properties[0].id;
        console.log(`First property ID: ${firstPropertyId}`);
        
        // Test 2: Get a specific property
        console.log('\nTest 2: Getting property by ID via gRPC...');
        console.log(`Requesting property with ID: ${firstPropertyId}`);
        
        const propertyResult = await grpcClients.propertyService.getPropertyAsync({ id: firstPropertyId });
        console.log('Property result type:', typeof propertyResult);
        console.log('Property result:', JSON.stringify(propertyResult, null, 2));
      }
    } else {
      console.log('No properties found or invalid response structure');
      
      // Try with the ID we know exists from our earlier test
      const knownPropertyId = '68258a0c62aefa1882034678';
      console.log(`\nTrying with known property ID: ${knownPropertyId}`);
      
      const propertyResult = await grpcClients.propertyService.getPropertyAsync({ id: knownPropertyId });
      console.log('Property result type:', typeof propertyResult);
      console.log('Property result:', JSON.stringify(propertyResult, null, 2));
    }
  } catch (error) {
    console.error('Error testing property service:', error);
  }
}

// Run the tests
testPropertyService(); 