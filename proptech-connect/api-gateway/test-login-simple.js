const axios = require('axios');

// Login mutation
const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        role
      }
    }
  }
`;

// GraphQL endpoint
const GRAPHQL_ENDPOINT = 'http://localhost:3000/graphql';

// Test function
async function testLogin(email, password) {
  console.log(`Testing login with ${email}...`);
  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, {
      query: LOGIN_MUTATION,
      variables: { email, password }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.errors) {
      console.log('GraphQL errors:', response.data.errors.map(e => e.message));
      return { success: false, errors: response.data.errors };
    }
    
    console.log('Login successful!');
    console.log('Response data:', JSON.stringify(response.data.data, null, 2));
    return { success: true, data: response.data.data };
  } catch (error) {
    console.log('Login request failed:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log('Server responded with error:', error.response.status);
      console.log('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.log('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error setting up request:', error.message);
    }
    
    return { success: false, error };
  }
}

// Run tests
async function runTests() {
  console.log('=== TESTING LOGIN WITH AXIOS ===');
  
  // Try with demo credentials - modify these with real credentials
  await testLogin('admin@example.com', 'admin123');
  await testLogin('user@example.com', 'user123');
  
  console.log('\n=== TESTS COMPLETED ===');
}

// Execute tests
runTests()
  .catch(err => console.error('Error running tests:', err)); 