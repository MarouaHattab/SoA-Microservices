const { ApolloClient, InMemoryCache, HttpLink, gql } = require('@apollo/client');
const fetch = require('cross-fetch');

// Create Apollo Client
const client = new ApolloClient({
  link: new HttpLink({ 
    uri: 'http://localhost:3000/graphql',
    fetch
  }),
  cache: new InMemoryCache()
});

// Login mutation
const LOGIN_MUTATION = gql`
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

// Test function
async function testLogin(email, password) {
  console.log(`Testing login with ${email}...`);
  try {
    const result = await client.mutate({
      mutation: LOGIN_MUTATION,
      variables: { email, password }
    });
    
    console.log('Login successful!');
    console.log('Result:', JSON.stringify(result.data, null, 2));
    return { success: true, data: result.data };
  } catch (error) {
    console.log('Login failed with error:');
    
    // Check for GraphQL errors
    if (error.graphQLErrors) {
      console.log('GraphQL Errors:', error.graphQLErrors.map(e => e.message));
    }
    
    // Check for network errors
    if (error.networkError) {
      console.log('Network Error:', error.networkError);
    }
    
    return { success: false, error };
  }
}

// Run tests
async function runTests() {
  console.log('=== TESTING LOGIN WITH APOLLO CLIENT ===');
  
  // Try with demo credentials - modify these with real credentials you want to test
  await testLogin('admin@example.com', 'admin123');
  await testLogin('user@example.com', 'user123');
  
  console.log('\n=== TESTS COMPLETED ===');
}

// Execute tests
runTests()
  .catch(err => console.error('Error running tests:', err))
  .finally(() => {
    // Force exit to avoid hanging
    setTimeout(() => process.exit(0), 1000);
  }); 