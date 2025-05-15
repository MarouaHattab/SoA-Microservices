const axios = require('axios');

// GraphQL endpoint
const GRAPHQL_ENDPOINT = 'http://localhost:3000/graphql';

// Introspection query to get schema
const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      types {
        name
        kind
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    }
  }
`;

// Function to check a specific field's nullability
async function checkLoginMutationNullability() {
  console.log('Checking login mutation in schema...');
  
  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, {
      query: INTROSPECTION_QUERY
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.errors) {
      console.log('GraphQL errors:', response.data.errors);
      return;
    }
    
    const schema = response.data.data.__schema;
    
    // Find Mutation type
    const mutationType = schema.types.find(type => type.name === 'Mutation');
    if (!mutationType) {
      console.log('Mutation type not found in schema');
      return;
    }
    
    // Find login field
    const loginField = mutationType.fields.find(field => field.name === 'login');
    if (!loginField) {
      console.log('login field not found in Mutation type');
      return;
    }
    
    // Check nullability
    console.log('Login field found in schema:');
    console.log(JSON.stringify(loginField, null, 2));
    
    const isNonNullable = (
      loginField.type.kind === 'NON_NULL' || 
      (loginField.type.ofType && loginField.type.ofType.kind === 'NON_NULL')
    );
    
    console.log(`Is login field non-nullable? ${isNonNullable ? 'YES' : 'NO'}`);
    
    if (isNonNullable) {
      console.log('!!! PROBLEM: The login field is still defined as non-nullable (AuthPayload!)');
      console.log('The schema update did not take effect. The API gateway needs to be restarted.');
    } else {
      console.log('✓ The login field is nullable (AuthPayload). Schema change was successful.');
    }
  } catch (error) {
    console.log('Request failed:');
    
    if (error.response) {
      console.log('Server responded with error:', error.response.status);
      console.log('Response data:', error.response.data);
    } else if (error.request) {
      console.log('No response received from server');
    } else {
      console.log('Error setting up request:', error.message);
    }
  }
}

// Run the check
checkLoginMutationNullability().catch(console.error); 