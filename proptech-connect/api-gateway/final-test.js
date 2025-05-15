/**
 * Final test script for GraphQL property queries
 */

const axios = require('axios');

// GraphQL API endpoint
const GRAPHQL_URL = 'http://localhost:3000/graphql';

// Test queries
const queries = {
  getAllProperties: `
    query {
      properties {
        id
        title
        price
        location
        propertyType
        bedrooms
        bathrooms
        ownerId
      }
    }
  `,
  
  getProperty: `
    query {
      property(id: "68192710c5b0f661a474f065") {
        id
        title
        description
        price
        location
        address
        bedrooms
        bathrooms
        area
        propertyType
        ownerId
        createdAt
        updatedAt
      }
    }
  `,
  
  searchProperties: `
    query {
      searchProperties(input: { location: "New York", minPrice: 100000 }) {
        properties {
          id
          title
          price
          location
        }
        totalCount
        page
        limit
      }
    }
  `
};

// Function to execute a GraphQL query
async function executeQuery(name) {
  try {
    console.log(`\n-- TESTING: ${name} --`);
    
    const response = await axios.post(GRAPHQL_URL, {
      query: queries[name]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Raw Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.errors) {
      console.log('❌ ERROR:', JSON.stringify(response.data.errors, null, 2));
      return false;
    }
    
    console.log('✅ SUCCESS!');
    
    if (name === 'getAllProperties' && response.data.data && response.data.data.properties) {
      console.log(`Found ${response.data.data.properties.length} properties`);
      
      if (response.data.data.properties.length > 0) {
        console.log('First property: ');
        console.log(JSON.stringify(response.data.data.properties[0], null, 2));
      }
    }
    else if (name === 'getProperty' && response.data.data && response.data.data.property) {
      console.log('Property details:');
      console.log(JSON.stringify(response.data.data.property, null, 2));
    }
    else if (name === 'searchProperties' && response.data.data && response.data.data.searchProperties) {
      const result = response.data.data.searchProperties;
      console.log(`Found ${result.totalCount} matching properties, showing ${result.properties.length} results`);
      
      if (result.properties.length > 0) {
        console.log('First result:');
        console.log(JSON.stringify(result.properties[0], null, 2));
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ REQUEST FAILED:');
    
    if (error.response) {
      console.error('Response error data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received from server');
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    return false;
  }
}

// Run tests one by one to isolate any issues
async function runTests() {
  console.log('=== PROPTECH CONNECT GRAPHQL PROPERTY TESTS ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Get all properties
  console.log('\n--- TEST 1: getAllProperties ---');
  try {
    if (await executeQuery('getAllProperties')) {
      passed++;
      console.log('✅ getAllProperties test PASSED');
    } else {
      failed++;
      console.log('❌ getAllProperties test FAILED');
    }
  } catch (error) {
    console.error('Test error:', error);
    failed++;
  }
  
  // Test 2: Get specific property
  console.log('\n--- TEST 2: getProperty ---');
  try {
    if (await executeQuery('getProperty')) {
      passed++;
      console.log('✅ getProperty test PASSED');
    } else {
      failed++;
      console.log('❌ getProperty test FAILED');
    }
  } catch (error) {
    console.error('Test error:', error);
    failed++;
  }
  
  // Test 3: Search properties
  console.log('\n--- TEST 3: searchProperties ---');
  try {
    if (await executeQuery('searchProperties')) {
      passed++;
      console.log('✅ searchProperties test PASSED');
    } else {
      failed++;
      console.log('❌ searchProperties test FAILED');
    }
  } catch (error) {
    console.error('Test error:', error);
    failed++;
  }
  
  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Tests passed: ${passed}`);
  console.log(`Tests failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! The GraphQL property queries are working correctly.');
  } else {
    console.log('\n❌ SOME TESTS FAILED. Please check the error messages above.');
  }
}

// Run the tests
runTests(); 