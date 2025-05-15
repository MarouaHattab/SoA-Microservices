const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

/**
 * Template for testing gRPC services in PropTech Connect
 * 
 * Usage: 
 * 1. Set the SERVICE_NAME to one of: 'property', 'user', 'appointment', 'chat', 'notification'
 * 2. Set the METHOD_TO_TEST to the method you want to test
 * 3. Modify the TEST_PARAMS object with the parameters your method requires
 * 4. Run with: node grpc-test-template.js
 */

// Configure these parameters based on the service you want to test
const SERVICE_NAME = 'property'; // Choose from: property, user, appointment, chat, notification
const METHOD_TO_TEST = 'getProperty'; // The method name in PascalCase
const TEST_PARAMS = { id: '123' }; // Parameters for the method call

// Service port mappings
const SERVICE_PORTS = {
  property: 50051,
  user: 50052,
  appointment: 50053,
  chat: 50054,
  notification: 50055
};

// Proto file mappings
const PROTO_FILES = {
  property: '../proto/property.proto',
  user: '../proto/user.proto',
  appointment: '../proto/appointment.proto',
  chat: '../proto/chat.proto',
  notification: '../proto/notification.proto'
};

// Service name mappings
const SERVICE_CLASSES = {
  property: 'PropertyService',
  user: 'UserService',
  appointment: 'AppointmentService',
  chat: 'ChatService',
  notification: 'NotificationService'
};

// Validate configuration
if (!SERVICE_NAME || !Object.keys(SERVICE_PORTS).includes(SERVICE_NAME)) {
  console.error(`Invalid SERVICE_NAME. Choose from: ${Object.keys(SERVICE_PORTS).join(', ')}`);
  process.exit(1);
}

if (!METHOD_TO_TEST) {
  console.error('METHOD_TO_TEST is required');
  process.exit(1);
}

// Load proto and create client
async function testGrpcService() {
  console.log(`Testing ${SERVICE_NAME} service, method ${METHOD_TO_TEST}...`);
  
  // Proto loading options
  const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  };
  
  // Load proto
  const protoPath = path.join(__dirname, PROTO_FILES[SERVICE_NAME]);
  const packageDefinition = protoLoader.loadSync(protoPath, options);
  const proto = grpc.loadPackageDefinition(packageDefinition)[SERVICE_NAME];
  
  // Create client
  const client = new proto[SERVICE_CLASSES[SERVICE_NAME]](
    `localhost:${SERVICE_PORTS[SERVICE_NAME]}`,
    grpc.credentials.createInsecure()
  );
  
  // Promisify method
  const methodAsync = promisify(client[METHOD_TO_TEST].bind(client));
  
  // Call method
  try {
    console.log(`Calling ${METHOD_TO_TEST} with params:`, TEST_PARAMS);
    const result = await methodAsync(TEST_PARAMS);
    console.log('Response received:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error(`Error calling ${METHOD_TO_TEST}:`, error.message);
    console.error('Error details:', error);
  }
}

// Execute the test
testGrpcService().catch(err => console.error('Unexpected error:', err)); 