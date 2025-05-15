/**
 * Simple test for just the property GraphQL query
 */

const axios = require('axios');

async function testPropertyQuery() {
  try {
    console.log('Testing property query...');
    
    const response = await axios.post('http://localhost:3000/graphql', {
      query: `
        query {
          property(id: "68192710c5b0f661a474f065") {
            id
            title
            propertyType
          }
        }
      `
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.errors) {
      console.log('Test failed with GraphQL errors');
    } else if (response.data.data && response.data.data.property) {
      console.log('Test succeeded! Property data:');
      console.log(response.data.data.property);
      return true;
    } else {
      console.log('Test failed - no property data returned');
    }
    
    return false;
  } catch (error) {
    console.error('Test error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

testPropertyQuery().then(success => {
  if (success) {
    console.log('Property query test passed!');
  } else {
    console.log('Property query test failed!');
  }
}); 