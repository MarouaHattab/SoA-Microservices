const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');

// Constants
const USER_SERVICE_PORT = 50051;
const PROTO_PATH = path.resolve(__dirname, '../proto/user.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// Create client
const client = new userProto.UserService(
  `localhost:${USER_SERVICE_PORT}`,
  grpc.credentials.createInsecure()
);

// Save results to an output file
const saveResult = (name, result) => {
  const outputFile = path.join(__dirname, 'grpc-test-results.json');
  
  // Read existing results if file exists
  let results = {};
  if (fs.existsSync(outputFile)) {
    try {
      results = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    } catch (err) {
      console.error('Error reading results file:', err);
    }
  }
  
  // Add new result
  results[name] = {
    timestamp: new Date().toISOString(),
    result
  };
  
  // Write results back to file
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`Results saved to ${outputFile}`);
};

// Test authentication
function testAuthentication(email, password) {
  return new Promise((resolve, reject) => {
    console.log(`Authenticating user: ${email}`);
    
    client.Authenticate({
      email,
      password
    }, (err, response) => {
      if (err) {
        console.error('Authentication failed:', err.message);
        return reject(err);
      }
      
      console.log('Authentication successful!');
      console.log('Token:', response.token.substring(0, 20) + '...');
      console.log('User ID:', response.user.id);
      
      resolve(response);
    });
  });
}

// Test creating a new user
function testCreateUser(userData) {
  return new Promise((resolve, reject) => {
    console.log(`Creating user: ${userData.email}`);
    
    client.CreateUser(userData, (err, response) => {
      if (err) {
        console.error('User creation failed:', err.message);
        return reject(err);
      }
      
      console.log('User created successfully!');
      console.log('User ID:', response.user.id);
      
      resolve(response);
    });
  });
}

// Test getting user details
function testGetUser(userId, authToken) {
  return new Promise((resolve, reject) => {
    console.log(`Getting user details for ID: ${userId}`);
    
    const metadata = new grpc.Metadata();
    if (authToken) {
      metadata.add('authorization', `Bearer ${authToken}`);
    }
    
    client.GetUser({ id: userId }, metadata, (err, response) => {
      if (err) {
        console.error('Getting user failed:', err.message);
        return reject(err);
      }
      
      console.log('User details retrieved successfully!');
      console.log('User:', response.user);
      
      resolve(response);
    });
  });
}

// Test getting all users
function testGetUsers(authToken) {
  return new Promise((resolve, reject) => {
    console.log('Getting all users');
    
    const metadata = new grpc.Metadata();
    if (authToken) {
      metadata.add('authorization', `Bearer ${authToken}`);
    }
    
    client.GetUsers({}, metadata, (err, response) => {
      if (err) {
        console.error('Getting users failed:', err.message);
        return reject(err);
      }
      
      console.log('Users retrieved successfully!');
      console.log(`Total users: ${response.users.length}`);
      
      resolve(response);
    });
  });
}

// Run all tests
async function runTests() {
  try {
    console.log('=== Starting User Service gRPC Tests ===');
    
    // Generate a unique email for testing
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    
    // 1. Create a new user
    const newUser = {
      name: 'gRPC Test User',
      email: testEmail,
      password: 'Password123',
      role: 'buyer',
      phone: '+1234567890'
    };
    
    const createResult = await testCreateUser(newUser);
    saveResult('createUser', createResult);
    
    // 2. Authenticate with the new user
    const authResult = await testAuthentication(testEmail, 'Password123');
    saveResult('authenticate', authResult);
    
    // 3. Get user details using the ID
    const userId = authResult.user.id;
    const token = authResult.token;
    
    const userResult = await testGetUser(userId, token);
    saveResult('getUser', userResult);
    
    // 4. Get all users (requires authentication)
    try {
      const usersResult = await testGetUsers(token);
      saveResult('getUsers', usersResult);
    } catch (error) {
      console.log('Note: Getting all users may require admin privileges');
    }
    
    console.log('\n=== All tests completed successfully ===');
    
  } catch (error) {
    console.error('\n=== Test failed ===');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Check if service is available before running tests
function checkServiceAvailability() {
  return new Promise((resolve) => {
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);
    
    client.waitForReady(deadline, (error) => {
      if (error) {
        console.error(`User Service not available on port ${USER_SERVICE_PORT}`);
        console.error('Make sure the service is running before executing tests');
        resolve(false);
      } else {
        console.log(`User Service is available on port ${USER_SERVICE_PORT}`);
        resolve(true);
      }
    });
  });
}

// Main execution
async function main() {
  const isAvailable = await checkServiceAvailability();
  
  if (isAvailable) {
    await runTests();
  } else {
    process.exit(1);
  }
}

main(); 