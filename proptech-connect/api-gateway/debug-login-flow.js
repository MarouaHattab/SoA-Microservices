const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');
const { ApolloServer, gql } = require('apollo-server-express');
const { AuthenticationError } = require('apollo-server-errors');
const express = require('express');

// Load schema
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    phone: String
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    dummy: String
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
  }
`;

// Load the user service proto
const userProtoPath = path.join(__dirname, '../proto/user.proto');
const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const userPackageDefinition = protoLoader.loadSync(userProtoPath, options);
const userProto = grpc.loadPackageDefinition(userPackageDefinition).user;

// Create client
const userClient = new userProto.UserService(
  'localhost:50052',
  grpc.credentials.createInsecure()
);

// Promisify the authenticate method
const authenticateAsync = promisify(userClient.Authenticate.bind(userClient));

// Function to convert snake_case to camelCase
function toCamelCase(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  }

  return Object.keys(obj).reduce((result, key) => {
    // Convert key from snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, function(match, p1) {
      return p1.toUpperCase();
    });

    // Convert nested objects recursively
    result[camelKey] = toCamelCase(obj[key]);
    return result;
  }, {});
}

// Define resolvers
const resolvers = {
  Query: {
    dummy: () => 'dummy'
  },
  Mutation: {
    login: async (_, { email, password }) => {
      try {
        console.log(`GraphQL resolver: Attempting login with ${email}...`);
        
        const auth = await authenticateAsync({
          email, password
        });
        
        console.log('GraphQL resolver: Raw gRPC response:', JSON.stringify(auth, null, 2));
        
        // Convert response to camelCase
        const camelCaseAuth = toCamelCase(auth);
        console.log('GraphQL resolver: Transformed response:', JSON.stringify(camelCaseAuth, null, 2));
        
        return camelCaseAuth;
      } catch (error) {
        console.error('GraphQL resolver: Authentication error:', error.message);
        throw new AuthenticationError(error.message);
      }
    }
  }
};

// Test direct gRPC login
async function testDirectLogin(email, password) {
  console.log(`\n=== Testing direct gRPC login with ${email} ===`);
  try {
    const auth = await authenticateAsync({
      email: email,
      password: password
    });
    
    console.log('Direct gRPC authentication successful!');
    console.log('Raw response:', JSON.stringify(auth, null, 2));
    
    return { success: true, auth };
  } catch (error) {
    console.error(`Direct gRPC authentication failed with error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Create a simplified test for checking auth flow
async function testSimpleLogin(email, password) {
  console.log(`\n=== Testing simplified login with ${email} ===`);
  try {
    console.log('1. Making gRPC auth call');
    const auth = await authenticateAsync({ email, password });
    console.log('2. Raw gRPC response:', JSON.stringify(auth, null, 2));
    
    console.log('3. Converting to camelCase');
    const camelCaseAuth = toCamelCase(auth);
    console.log('4. Camel case result:', JSON.stringify(camelCaseAuth, null, 2));
    
    // Check if token and user exist in the camelCase result
    if (!camelCaseAuth.token || !camelCaseAuth.user) {
      console.error('5. MISSING REQUIRED FIELDS after conversion');
      console.error('Fields in camelCaseAuth:', Object.keys(camelCaseAuth));
      return { success: false, error: 'Missing token or user in converted response' };
    }
    
    console.log('5. SUCCESS - Has required token and user fields');
    return { success: true, auth: camelCaseAuth };
  } catch (error) {
    console.error('Login failed with error:', error.message);
    return { success: false, error: error.message };
  }
}

// Create a testing helper to check object structure
function verifyStructure(obj, expectedFields) {
  const missingFields = [];
  
  for (const field of expectedFields) {
    if (obj[field] === undefined) {
      missingFields.push(field);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// Run the tests
async function runTests() {
  console.log('=== RUNNING AUTH FLOW TESTS ===');
  
  // Test credentials
  const testCredentials = [
    { email: 'admin@example.com', password: 'admin123' },
    { email: 'user@example.com', password: 'user123' },
    { email: 'test@example.com', password: 'test123' }
  ];
  
  for (const cred of testCredentials) {
    // Test authentication flow
    const result = await testSimpleLogin(cred.email, cred.password);
    
    console.log(`\n=== SUMMARY FOR ${cred.email} ===`);
    console.log(`Login success: ${result.success}`);
    if (result.success) {
      // Verify AuthPayload structure
      const authCheck = verifyStructure(result.auth, ['token', 'user']);
      console.log(`Valid AuthPayload structure: ${authCheck.isValid}`);
      if (!authCheck.isValid) {
        console.log(`Missing fields: ${authCheck.missingFields.join(', ')}`);
      }
      
      // Verify User structure if user exists
      if (result.auth.user) {
        const userCheck = verifyStructure(result.auth.user, ['id', 'name', 'email', 'role']);
        console.log(`Valid User structure: ${userCheck.isValid}`);
        if (!userCheck.isValid) {
          console.log(`Missing user fields: ${userCheck.missingFields.join(', ')}`);
        }
      }
    }
    console.log('===============================\n');
  }
}

// Execute the tests
runTests().catch(console.error); 