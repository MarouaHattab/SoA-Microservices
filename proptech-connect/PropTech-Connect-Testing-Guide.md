# PropTech Connect Testing Guide with Postman

This guide will walk you through testing all microservices in the PropTech Connect platform using Postman.

## Getting Started

1. **Import the Collection**:
   - Import the `PropTech-Connect-Postman-Collection.json` file into Postman
   - Create a new Environment in Postman and set the following variables:
     - `base_url`: `http://localhost:3000` (or your API gateway URL)
     - `existing_user_email`: An email for an existing user (if any)
     - `existing_user_password`: Password for the existing user
     - `existing_property_id`: ID of an existing property (if available)
     - `recipient_user_id`: ID of another user for chat testing

2. **Start Services**:
   - Make sure all microservices are running
   - Ensure the API gateway is running on the specified port (default 3000)

## Test Flow

The tests are organized by service. Follow this recommended sequence:

### 1. User Service Testing

1. **Register a New User**:
   - Executes: `POST /api/auth/register`
   - Automatically saves the authentication token and user ID
   - If you already have users in your system, you can skip to the login step

2. **User Login**:
   - Executes: `POST /api/auth/login`
   - Uses existing user credentials from your environment
   - Automatically saves the authentication token and user ID

3. **Get User Profile**:
   - Executes: `GET /api/users/{user_id}`
   - Retrieves detailed user information

4. **Update User Profile**:
   - Executes: `PUT /api/users/{user_id}`
   - Updates user information

### 2. Property Service Testing

1. **Search Properties**:
   - Executes: `GET /api/properties` with search parameters
   - Test different search criteria

2. **Get Property Details**:
   - Executes: `GET /api/properties/{property_id}`
   - Retrieves detailed information about a specific property

3. **Create Property**:
   - Executes: `POST /api/properties`
   - Creates a new property listing
   - Saves the new property ID for later tests

4. **Update Property**:
   - Executes: `PUT /api/properties/{property_id}`
   - Updates an existing property listing

5. **Add Property Review**:
   - Executes: `POST /api/properties/{property_id}/reviews`
   - Adds a review for a property
   - Saves the review ID for reference

6. **Add to Favorites**:
   - Executes: `POST /api/properties/favorites`
   - Adds a property to the user's favorites

7. **Get User Favorites**:
   - Executes: `GET /api/properties/favorites`
   - Retrieves the user's favorite properties

8. **Delete Property**:
   - Executes: `DELETE /api/properties/{property_id}`
   - Deletes a property listing (use with caution)

### 3. Appointment Service Testing

1. **Create Appointment**:
   - Executes: `POST /api/appointments`
   - Creates a new appointment for a property viewing
   - Saves the appointment ID for later tests

2. **Get User Appointments**:
   - Executes: `GET /api/appointments`
   - Lists all appointments for the current user

3. **Get Appointment Details**:
   - Executes: `GET /api/appointments/{appointment_id}`
   - Retrieves detailed information about a specific appointment

4. **Update Appointment**:
   - Executes: `PUT /api/appointments/{appointment_id}`
   - Updates an existing appointment

5. **Cancel Appointment**:
   - Executes: `DELETE /api/appointments/{appointment_id}`
   - Cancels an existing appointment

### 4. Chat Service Testing

1. **Create Chat**:
   - Executes: `POST /api/chat`
   - Creates a new chat conversation
   - Requires a recipient user ID
   - Saves the chat ID for later tests

2. **Get User Chats**:
   - Executes: `GET /api/chat`
   - Lists all chat conversations for the current user

3. **Get Chat Messages**:
   - Executes: `GET /api/chat/{chat_id}/messages`
   - Retrieves all messages in a specific chat conversation

4. **Send Message**:
   - Executes: `POST /api/chat/{chat_id}/messages`
   - Sends a new message in an existing chat conversation

### 5. Notification Service Testing

1. **Get User Notifications**:
   - Executes: `GET /api/notifications`
   - Retrieves all notifications for the current user

2. **Mark Notification as Read**:
   - Executes: `PUT /api/notifications/{notification_id}`
   - Marks a notification as read

3. **Update Notification Preferences**:
   - Executes: `PUT /api/notifications/preferences`
   - Updates the user's notification preferences

### 6. GraphQL API Testing

1. **Query Properties**:
   - Executes a GraphQL query to retrieve a list of properties

2. **Query Property Details**:
   - Executes a GraphQL query to retrieve detailed property information

3. **User Profile and Appointments**:
   - Executes a GraphQL query to retrieve user profile and appointments

## Test Environments

You can create multiple environments for different testing scenarios:

1. **Development Environment**:
   - Base URL: `http://localhost:3000`
   - Use for local development testing

2. **Staging Environment**:
   - Base URL: `https://staging-api.proptech-connect.com`
   - Use for pre-production testing

3. **Production Environment**:
   - Base URL: `https://api.proptech-connect.com`
   - Use only for production verification (with caution)

## Tips for Effective Testing

1. **Sequential Testing**:
   - Follow the test sequence as outlined to ensure dependencies are met
   - Some tests require data created in previous steps

2. **Test Data Management**:
   - Be careful with delete operations in shared environments
   - Consider creating specific test users/properties for testing

3. **Authentication**:
   - Most endpoints require authentication
   - The token is automatically set when registering or logging in
   - If you encounter 401 errors, try re-running the login test

4. **Error Handling**:
   - Test error scenarios (invalid data, unauthorized access)
   - Check response status codes and error messages

5. **Performance Testing**:
   - Use Postman's Collection Runner for basic load testing
   - Monitor response times for different endpoints

## Troubleshooting

1. **Connection Issues**:
   - Verify all services are running
   - Check the API gateway URL in your environment

2. **Authentication Errors**:
   - Ensure you've run the login request
   - Check if the token has expired
   - Verify the token is properly set in the environment

3. **Missing Data**:
   - Some tests depend on existing data in the database
   - Make sure to set the appropriate IDs in your environment

4. **Service-Specific Issues**:
   - User Service: Check user roles and permissions
   - Property Service: Verify property ownership for protected operations
   - Appointment Service: Check date/time format (ISO 8601)
   - Chat Service: Ensure recipient user exists
   - Notification Service: Check notification preferences

## Advanced Testing

1. **Test Scripts**:
   - Add more test scripts to validate responses
   - Check data integrity between services

2. **Automated Testing**:
   - Use Newman (Postman CLI) for CI/CD integration
   - Schedule regular API health checks

3. **Security Testing**:
   - Test with different user roles and permissions
   - Verify authentication and authorization mechanisms 