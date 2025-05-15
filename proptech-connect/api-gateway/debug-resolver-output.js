/**
 * Debug script to test the property resolvers and see what they return
 */

const propertyResolvers = require('./resolvers/property-resolvers');

async function testResolvers() {
  try {
    // Test the properties resolver
    console.log('Testing properties resolver...');
    const propertiesResult = await propertyResolvers.Query.properties(null, {});
    console.log('Properties resolver returned type:', typeof propertiesResult);
    console.log('Is array?', Array.isArray(propertiesResult));
    
    if (Array.isArray(propertiesResult) && propertiesResult.length > 0) {
      console.log(`Found ${propertiesResult.length} properties`);
      console.log('First property:', JSON.stringify(propertiesResult[0], null, 2));
      
      // Test the property resolver with the first property ID
      const firstPropertyId = propertiesResult[0].id;
      console.log(`\nTesting property resolver with ID: ${firstPropertyId}`);
      
      const propertyResult = await propertyResolvers.Query.property(null, { id: firstPropertyId });
      console.log('Property resolver returned type:', typeof propertyResult);
      console.log('Property result:', JSON.stringify(propertyResult, null, 2));
    } else {
      console.log('No properties found or invalid response structure');
      
      // Try with known ID
      const knownId = '68258a0c62aefa1882034678';
      console.log(`\nTesting property resolver with known ID: ${knownId}`);
      
      const propertyResult = await propertyResolvers.Query.property(null, { id: knownId });
      console.log('Property resolver returned type:', typeof propertyResult);
      console.log('Property result:', JSON.stringify(propertyResult, null, 2));
    }
  } catch (error) {
    console.error('Error testing resolvers:', error);
  }
}

// Run the tests
testResolvers(); 