# Testing gRPC Services with Protocol Buffers

This guide explains how to test the microservices in PropTech Connect that use Protocol Buffers and gRPC.

## Prerequisites

- [grpcurl](https://github.com/fullstorydev/grpcurl) - A command-line tool for interacting with gRPC servers
- [Bloomrpc](https://github.com/bloomrpc/bloomrpc) or [gRPCui](https://github.com/fullstorydev/grpcui) - GUI tools for gRPC testing

## Installing Test Tools

### Installing grpcurl

```bash
# On macOS
brew install grpcurl

# On Windows (with Chocolatey)
choco install grpcurl

# On Linux
# Download the binary from https://github.com/fullstorydev/grpcurl/releases
```

### Installing BloomRPC

Download from https://github.com/bloomrpc/bloomrpc/releases/tag/1.5.3

## Service Ports

Each microservice in PropTech Connect runs on a different port:

- User Service: 50051
- Property Service: 50052
- Appointment Service: 50053
- Chat Service: 50054
- Notification Service: 50055

## Testing with grpcurl

### Listing Available Services

```bash
# For User Service
grpcurl -plaintext localhost:50051 list

# For Property Service
grpcurl -plaintext localhost:50052 list
```

### Describing a Service

```bash
# Describe User Service
grpcurl -plaintext localhost:50051 describe user.UserService

# Describe Property Service
grpcurl -plaintext localhost:50052 describe property.PropertyService
```

### Example Requests

#### User Service

**Get User:**
```bash
grpcurl -plaintext -d '{"id": "USER_ID_HERE"}' localhost:50051 user.UserService/GetUser
```

**Authenticate User:**
```bash
grpcurl -plaintext -d '{"email": "user@example.com", "password": "Password123"}' localhost:50051 user.UserService/Authenticate
```

**Create User:**
```bash
grpcurl -plaintext -d '{
  "name": "Test User",
  "email": "testuser@example.com",
  "password": "Password123",
  "role": "buyer",
  "phone": "+1234567890"
}' localhost:50051 user.UserService/CreateUser
```

#### Property Service

**Get Property:**
```bash
grpcurl -plaintext -d '{"id": "PROPERTY_ID_HERE"}' localhost:50052 property.PropertyService/GetProperty
```

**Search Properties:**
```bash
grpcurl -plaintext -d '{
  "location": "New York",
  "min_price": 100000,
  "max_price": 500000,
  "bedrooms": 2,
  "property_type": "apartment",
  "page": 1,
  "limit": 10
}' localhost:50052 property.PropertyService/SearchProperties
```

**Create Property:**
```bash
grpcurl -plaintext -d '{
  "title": "New Property via gRPC",
  "description": "Testing with grpcurl",
  "price": 350000,
  "location": "Boston",
  "address": "123 Main St, Boston, MA",
  "bedrooms": 3,
  "bathrooms": 2,
  "area": 1800,
  "property_type": "house",
  "owner_id": "OWNER_ID_HERE",
  "features": ["garden", "garage", "central air"],
  "images": ["https://example.com/img.jpg"]
}' localhost:50052 property.PropertyService/CreateProperty
```

#### Appointment Service

**Get Appointment:**
```bash
grpcurl -plaintext -d '{"id": "APPOINTMENT_ID_HERE"}' localhost:50053 appointment.AppointmentService/GetAppointment
```

**Create Appointment:**
```bash
grpcurl -plaintext -d '{
  "property_id": "PROPERTY_ID_HERE",
  "user_id": "USER_ID_HERE",
  "date": "2024-08-15T14:00:00Z",
  "duration": 60,
  "type": "viewing",
  "message": "I would like to view this property"
}' localhost:50053 appointment.AppointmentService/CreateAppointment
```

#### Chat Service

**Get Chat:**
```bash
grpcurl -plaintext -d '{"id": "CHAT_ID_HERE"}' localhost:50054 chat.ChatService/GetChat
```

**Send Message:**
```bash
grpcurl -plaintext -d '{
  "chat_id": "CHAT_ID_HERE",
  "sender_id": "USER_ID_HERE",
  "content": "Hello, is the property still available?"
}' localhost:50054 chat.ChatService/SendMessage
```

#### Notification Service

**Get User Notifications:**
```bash
grpcurl -plaintext -d '{"user_id": "USER_ID_HERE"}' localhost:50055 notification.NotificationService/GetUserNotifications
```

## Testing with BloomRPC

1. **Import proto files**:
   - Open BloomRPC
   - Click "Import Protos" and select all .proto files from your `/proto` directory

2. **Select a Service**:
   - Choose a service method from the left sidebar
   - Enter the server address (e.g., `localhost:50051`)
   - Fill in the request JSON
   - Click "Play" to send the request

## Creating a gRPC Test Script

You can automate gRPC testing with Node.js and the grpc-tools package:

```javascript
// Example: test-user-service.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load proto file
const PROTO_PATH = path.resolve(__dirname, '../proto/user.proto');
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
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Test authentication
function testAuthentication() {
  return new Promise((resolve, reject) => {
    client.Authenticate({
      email: 'user@example.com',
      password: 'Password123'
    }, (err, response) => {
      if (err) {
        console.error('Authentication failed:', err);
        return reject(err);
      }
      
      console.log('Authentication successful!');
      console.log('Token:', response.token);
      console.log('User:', response.user);
      resolve(response);
    });
  });
}

// Run tests
async function runTests() {
  try {
    const auth = await testAuthentication();
    // Add more test cases here
  } catch (error) {
    console.error('Tests failed:', error);
  }
}

runTests();
```

## Automating gRPC Tests

Create a package.json entry for gRPC tests:

```json
"scripts": {
  "test:grpc:user": "node test-user-service.js",
  "test:grpc:property": "node test-property-service.js",
  "test:grpc:all": "npm run test:grpc:user && npm run test:grpc:property"
}
```

## Testing Interceptors and Middleware

To test gRPC interceptors (like authentication), you'll need to pass metadata:

```javascript
const metadata = new grpc.Metadata();
metadata.add('authorization', 'Bearer YOUR_TOKEN_HERE');

client.GetUser({ id: 'USER_ID_HERE' }, metadata, (err, response) => {
  // Handle response
});
```

## Troubleshooting gRPC Connections

If you're having trouble connecting to gRPC services:

1. Ensure the service is running
2. Check the port number
3. Verify the service isn't blocked by a firewall
4. Check for TLS/SSL configuration
5. Try using the `-plaintext` flag with grpcurl if you're using unencrypted connections 