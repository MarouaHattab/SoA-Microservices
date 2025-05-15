const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');
const { ApolloServer, gql } = require('apollo-server-express');
const express = require('express');

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

// Test function for direct gRPC call
async function testDirectLogin(email, password) {
  try {
    console.log(`Attempting direct gRPC login with ${email}...`);
    const auth = await authenticateAsync({
      email: email,
      password: password
    });
    
    console.log('Direct gRPC authentication successful!');
    console.log('Raw response:', JSON.stringify(auth, null, 2));
    
    // Transform the response to camelCase as the resolver would
    const transformedAuth = toCamelCase(auth);
    console.log('Transformed response (snake_case to camelCase):', JSON.stringify(transformedAuth, null, 2));
    
    return { success: true, auth: transformedAuth };
  } catch (error) {
    console.error(`Direct gRPC authentication failed for ${email} with error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Test with different credentials
async function runTests() {
  console.log('=== RUNNING AUTH TESTS ===');
  
  // Try admin user
  await testDirectLogin('admin@example.com', 'admin123');
  
  // Try a regular user
  await testDirectLogin('user@example.com', 'user123');
  
  // Try with test user
  await testDirectLogin('test@example.com', 'test123');
  
  console.log('\n=== AUTH TESTS COMPLETED ===');
  
  // If you need to test with a custom user and password:
  // await testDirectLogin('your-email', 'your-password');
}

// Execute the tests
runTests(); 