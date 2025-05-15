const axios = require('axios');

/**
 * Debug script for testing GraphQL property queries in the API gateway
 */

const API_URL = 'http://localhost:3000/graphql';

// GraphQL queries to test
const queries = {
  // Get all properties
  getAllProperties: `
    query {
      properties {
        id
        title
        price
        location
      }
    }
  `,
  
  // Get a specific property
  getProperty: `
    query {
      property(id: "68258a0c62aefa1882034678") {
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
      }
    }
  `
};

// Function to execute a GraphQL query
async function executeQuery(queryName) {
  try {
    console.log(`Executing query: ${queryName}`);
    
    const response = await axios.post(API_URL, {
      query: queries[queryName]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Query failed:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
}

// Execute all queries in sequence
async function runTests() {
  console.log('Starting GraphQL property queries test...\n');
  
  // Test getting all properties
  await executeQuery('getAllProperties');
  console.log('\n-----------------------------------\n');
  
  // Test getting a specific property
  await executeQuery('getProperty');
  console.log('\n-----------------------------------\n');
  
  console.log('Tests completed.');
}

// Run the tests
runTests(); 