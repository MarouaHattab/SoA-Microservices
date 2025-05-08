# PropTech Connect GraphQL and gRPC Testing Guide

This guide provides detailed instructions for testing both the GraphQL API and the gRPC services of the PropTech Connect platform.

## Table of Contents

- [GraphQL Testing](#graphql-testing)
  - [Introduction to GraphQL](#introduction-to-graphql)
  - [Testing with Postman](#testing-graphql-with-postman)
  - [Testing with GraphiQL/Playground](#testing-with-graphiqlplayground)
  - [Common GraphQL Queries](#common-graphql-queries)
  - [Common GraphQL Mutations](#common-graphql-mutations)
  - [Authentication in GraphQL](#authentication-in-graphql)
  - [Error Handling](#graphql-error-handling)
  
- [gRPC Testing](#grpc-testing)
  - [Introduction to gRPC and Protocol Buffers](#introduction-to-grpc-and-protocol-buffers)
  - [Proto Files Overview](#proto-files-overview)
  - [Testing with grpcurl](#testing-with-grpcurl)
  - [Testing with BloomRPC](#testing-with-bloomrpc)
  - [Testing with Node.js Scripts](#testing-with-nodejs-scripts)
  - [Authentication in gRPC](#authentication-in-grpc)
  - [Error Handling](#grpc-error-handling)

---

## GraphQL Testing

### Introduction to GraphQL

GraphQL is a query language for your API that provides a flexible and efficient alternative to REST. PropTech Connect offers a GraphQL endpoint at:

```
http://localhost:3000/graphql
```

Key benefits of testing with GraphQL:
- Request only the data you need
- Get multiple resources in a single request
- Strong typing system
- Introspection capabilities

### Testing GraphQL with Postman

1. **Setup**:
   - Use the `GraphQL API` folder in the Postman collection
   - All GraphQL requests use `POST` to the `/graphql` endpoint
   - Set the content type to `application/json`

2. **Request Format**:
   ```json
   {
     "query": "query { properties { id title price } }",
     "variables": {}
   }
   ```

3. **Authentication**:
   - Add the Authorization header: `Bearer {{auth_token}}`
   - The token is automatically set when using the login/register endpoints

### Testing with GraphiQL/Playground

1. **Access the GraphQL Playground**:
   - Open your browser to `http://localhost:3000/graphql`
   - This interactive tool provides documentation and auto-completion

2. **Explore the Schema**:
   - Click on "Schema" or "Docs" tab to see available types and operations
   - Use auto-completion to discover available fields

3. **Authentication in Playground**:
   - Click on "HTTP HEADERS" at the bottom
   - Add authorization header:
     ```json
     {
       "Authorization": "Bearer YOUR_TOKEN_HERE"
     }
     ```

### Common GraphQL Queries

See the `testing-tools/graphql-test-queries.md` file for a comprehensive list of ready-to-use queries for:
- Querying properties with filters
- Getting property details with reviews
- User profile information
- Appointments with property details
- Chats and messages

Examples:

```graphql
# Get properties with filtering
query {
  properties(
    location: "New York"
    min_price: 100000
    max_price: 500000
    bedrooms: 2
    property_type: "apartment"
    page: 1
    limit: 5
  ) {
    id
    title
    price
    location
    address
    bedrooms
    bathrooms
    area
    property_type
    average_rating
  }
}

# Get user profile and appointments
query {
  me {
    id
    name
    email
    role
    phone
    appointments {
      id
      property_id
      date
      status
    }
  }
}
```

### Common GraphQL Mutations

Examples:

```graphql
# Create property
mutation {
  createProperty(
    input: {
      title: "GraphQL Test Property"
      description: "Created via GraphQL"
      price: 350000
      location: "Boston"
      address: "123 GraphQL St, Boston, MA"
      bedrooms: 3
      bathrooms: 2
      area: 1500
      property_type: "house"
      features: ["backyard", "renovated", "fireplace"]
      images: ["https://example.com/img1.jpg"]
    }
  ) {
    property {
      id
      title
      price
    }
  }
}

# Add a review
mutation {
  addReview(
    input: {
      property_id: "PROPERTY_ID_HERE"
      rating: 5
      comment: "Amazing property!"
    }
  ) {
    review {
      id
      rating
      comment
    }
  }
}
```

### Authentication in GraphQL

1. **Login to Get Token**:
   ```graphql
   mutation {
     login(email: "user@example.com", password: "Password123") {
       token
       user {
         id
         name
         email
         role
       }
     }
   }
   ```

2. **Using the Token**:
   - Add the token to the HTTP headers section
   - Format: `{ "Authorization": "Bearer YOUR_TOKEN_HERE" }`

### GraphQL Error Handling

The GraphQL API returns errors in a standardized format:

```json
{
  "errors": [
    {
      "message": "Error message here",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["fieldName"]
    }
  ],
  "data": null
}
```

Common error codes:
- Authentication: 401 Unauthorized
- Validation: 400 Bad Request
- Not Found: 404 Resource Not Found
- Server Error: 500 Internal Server Error

---

## gRPC Testing

### Introduction to gRPC and Protocol Buffers

gRPC is a high-performance RPC framework that uses Protocol Buffers (protobuf) as its interface definition language. PropTech Connect uses gRPC for service-to-service communication.

Each microservice exposes its own gRPC server:
- User Service: `localhost:50051`
- Property Service: `localhost:50052`
- Appointment Service: `localhost:50053`
- Chat Service: `localhost:50054`
- Notification Service: `localhost:50055`

### Proto Files Overview

Protocol Buffer files (`.proto`) define the service interfaces and message formats. PropTech Connect's proto files are in the `/proto` directory:

- **user.proto**: User authentication and management
- **property.proto**: Property listings, reviews, and favorites
- **appointment.proto**: Property viewings and appointments
- **chat.proto**: Messaging between users
- **notification.proto**: User notifications
- **payment.proto**: Payment processing

Each proto file defines:
1. Service interfaces with RPC methods
2. Request and response message types
3. Enumerations and common types

Example from `user.proto`:
```protobuf
service UserService {
  rpc GetUser (UserRequest) returns (UserResponse);
  rpc CreateUser (CreateUserRequest) returns (UserResponse);
  rpc Authenticate (AuthRequest) returns (AuthResponse);
  // other methods...
}

message UserRequest {
  string id = 1;
}

message UserResponse {
  User user = 1;
}
```

### Testing with grpcurl

[grpcurl](https://github.com/fullstorydev/grpcurl) is a command-line tool for interacting with gRPC servers.

#### Installation

```bash
# On macOS
brew install grpcurl

# On Windows (with Chocolatey)
choco install grpcurl

# On Linux
# Download from GitHub releases
```

#### Basic Commands

List all services:
```bash
grpcurl -plaintext localhost:50051 list
```

Describe a service:
```bash
grpcurl -plaintext localhost:50051 describe user.UserService
```

Call a method (example: authenticating a user):
```bash
grpcurl -plaintext -d '{
  "email": "user@example.com",
  "password": "Password123"
}' localhost:50051 user.UserService/Authenticate
```

#### Useful Options

- `-plaintext`: Use insecure connection (no TLS)
- `-d`: Provide request data (JSON format)
- `-H`: Add metadata headers

### Testing with BloomRPC

[BloomRPC](https://github.com/bloomrpc/bloomrpc) is a GUI client for testing gRPC services.

#### Setup Instructions

1. Download and install BloomRPC
2. Click "Import Protos" and select the proto files from `/proto` directory
3. Select the service method in the left panel
4. Enter the server address (e.g., `localhost:50051`)
5. Fill in the request JSON
6. Click "Play" to send the request

### Testing with Node.js Scripts

For automated testing, you can use Node.js with the `@grpc/grpc-js` and `@grpc/proto-loader` packages. We've created example scripts in the `testing-tools` directory.

#### Setup

```bash
cd testing-tools
npm install
```

#### Running gRPC Tests

```bash
# Test User Service
npm run test:grpc:user

# Run all gRPC tests
npm run test:grpc
```

#### Creating Your Own Tests

You can use the existing test scripts as templates or create new ones for specific services. Key components of a gRPC test script:

1. Load the proto file
2. Create a gRPC client
3. Define test functions for different methods
4. Run tests and verify results

### Authentication in gRPC

Most methods in the gRPC services require authentication. This is done by passing metadata with the request.

In grpcurl:
```bash
grpcurl -plaintext -H "authorization: Bearer YOUR_TOKEN_HERE" -d '{"id": "USER_ID"}' localhost:50051 user.UserService/GetUser
```

In Node.js:
```javascript
const metadata = new grpc.Metadata();
metadata.add('authorization', 'Bearer YOUR_TOKEN_HERE');

client.GetUser({ id: 'USER_ID' }, metadata, (err, response) => {
  // Handle response
});
```

### gRPC Error Handling

gRPC uses status codes and error messages to communicate errors:

- `UNAUTHENTICATED (16)`: Missing or invalid authentication
- `PERMISSION_DENIED (7)`: User doesn't have permission
- `NOT_FOUND (5)`: Resource not found
- `INVALID_ARGUMENT (3)`: Invalid request data
- `INTERNAL (13)`: Server error

---

## Integration Testing Between GraphQL and gRPC

For comprehensive testing, it's important to verify that data flows correctly between the GraphQL API (which clients use) and the gRPC services (which handle business logic).

### Testing Flow

1. Create/modify data via GraphQL
2. Verify the changes via direct gRPC calls to services
3. Make changes via gRPC calls
4. Verify the changes are reflected in GraphQL queries

This end-to-end testing ensures that your API gateway correctly translates between GraphQL and gRPC.

---

## Conclusion

By thoroughly testing both the GraphQL API and gRPC services, you can ensure that your PropTech Connect platform functions correctly at all levels of the architecture. 

The API gateway translates client-friendly GraphQL requests into internal gRPC calls, making the overall system both user-friendly and highly efficient.

For more information, see:
- [GraphQL Documentation](https://graphql.org/learn/)
- [gRPC Documentation](https://grpc.io/docs/)
- [Protocol Buffers Documentation](https://developers.google.com/protocol-buffers/docs/overview) 