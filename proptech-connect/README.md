# PropTech Connect Testing Guide

This repository contains tools and documentation for testing the PropTech Connect microservices platform.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Postman](https://www.postman.com/downloads/)
- [grpcurl](https://github.com/fullstorydev/grpcurl) (for gRPC testing)
- [BloomRPC](https://github.com/bloomrpc/bloomrpc) (optional, for gRPC testing)

## Quick Start

1. **Start the Services**

   ```bash
   # Navigate to the project root
   cd /path/to/proptech-connect
   
   # Start all services using Docker Compose
   docker-compose up -d
   ```

2. **Install Testing Tools**

   ```bash
   # Navigate to the testing tools directory
   cd testing-tools
   
   # Install dependencies
   npm install
   ```

3. **Check if Services are Running**

   ```bash
   npm run check
   ```

4. **Setup Test Data**

   ```bash
   npm run setup
   ```

5. **Import Postman Collection**

   - Open Postman
   - Click "Import" button
   - Select the `PropTech-Connect-Postman-Collection.json` file
   - Import the generated environment file (`postman_environment.json`)

6. **Run Tests in Postman**

   - Select the imported environment
   - Run the collection or individual requests

## Testing with Newman (CLI)

You can run tests automatically using Newman:

```bash
# Navigate to the testing tools directory
cd testing-tools

# Run all tests
npm run newman

# Run specific folder
newman run ../PropTech-Connect-Postman-Collection.json -e postman_environment.json --folder "User Service"
```

## Testing GraphQL and gRPC Services

For detailed guidance on testing the GraphQL API and gRPC services:

- [GraphQL and gRPC Testing Guide](./PropTech-Connect-GraphQL-gRPC-Testing-Guide.md)

### GraphQL Testing

- Use the GraphQL API folder in the Postman collection
- Access GraphiQL/Playground at `http://localhost:3000/graphql`
- See `testing-tools/graphql-test-queries.md` for example queries

### gRPC Testing

- Use grpcurl or BloomRPC to test the microservices directly
- Node.js test scripts are available in the testing-tools directory
- Run gRPC tests with:
  ```bash
  cd testing-tools
  npm run test:grpc
  ```

## Available Files

| File                                        | Description                                           |
|---------------------------------------------|-------------------------------------------------------|
| `PropTech-Connect-Postman-Collection.json`  | Postman collection with all API tests                 |
| `PropTech-Connect-Testing-Guide.md`         | Detailed guide for manual testing                     |
| `PropTech-Connect-GraphQL-gRPC-Testing-Guide.md` | Guide for testing GraphQL and gRPC services      |
| `check-services.js`                         | Script to check if all services are running           |
| `setup-test-data.js`                        | Script to populate test data                          |
| `testing-tools/package.json`                | NPM package for testing tools                         |
| `testing-tools/test-user-service.js`        | gRPC test script for User Service                     |
| `testing-tools/graphql-test-queries.md`     | Example GraphQL queries for testing                   |
| `testing-tools/grpc-test-guide.md`          | Detailed guide for gRPC testing                       |

## Testing Flow

1. **User Authentication**
   - Register or login to get a JWT token

2. **Property Management**
   - Create, read, update, delete properties
   - Add reviews and favorites

3. **Appointments**
   - Schedule property viewings
   - Manage appointments

4. **Chat**
   - Create conversations about properties
   - Send messages between users

5. **Notifications**
   - Check user notifications
   - Update notification preferences

6. **GraphQL API**
   - Test GraphQL queries and mutations

7. **gRPC Services**
   - Test direct service-to-service communication

## Troubleshooting

- **Services Not Running**: Check Docker logs with `docker-compose logs`
- **Authentication Errors**: Verify the JWT token is valid and not expired
- **Missing Data**: Run the setup script again to create fresh test data
- **Network Issues**: Ensure all services are on the same Docker network
- **gRPC Connection Issues**: Check if the service is running on the correct port

## Additional Resources

- [PropTech Connect Documentation](./docs/)
- [Microservice Architecture Diagram](./docs/architecture.md)
- [API Gateway Documentation](./api-gateway/README.md) 