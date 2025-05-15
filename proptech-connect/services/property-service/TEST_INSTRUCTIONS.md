# PropTech Connect Fix Testing Instructions

This guide provides step-by-step instructions for testing the fixes implemented for the property service.

## Step 1: Fix the Property Service

1. Navigate to the property service directory:
   ```
   cd services/property-service
   ```

2. Run the fix script:
   ```
   node fix-property-service.js
   ```

3. Restart the property service:
   ```
   node restart-service.js
   ```

## Step 2: Restart the API Gateway

1. Navigate to the API gateway directory:
   ```
   cd ../../api-gateway
   ```

2. Restart the API gateway:
   ```
   node restart-gateway.js
   ```

## Step 3: Test the Fixed Functionality

1. Run the test script to verify that all functions now work correctly:
   ```
   cd ../../api-gateway
   node test-updated-reviews.js
   ```

2. Check that the following functionality is working:
   - Adding a property review with category ratings
   - Updating a review (anonymous or regular)
   - Adding a property to favorites
   - Getting a user's favorite properties with proper formatting

## Troubleshooting

If you encounter any issues during testing:

1. Check the console logs for both services to identify errors
2. Verify that the request body is properly formatted (JSON)
3. Make sure all services (property service, user service, and API gateway) are running
4. Check that your JWT token is valid

For review updates specifically, ensure your request includes these required fields:
```json
{
  "rating": 4,
  "comment": "Updated review comment",
  "category_ratings": {
    "location": 5,
    "value": 4,
    "quality": 4,
    "amenities": 3,
    "neighborhood": 5
  }
}
``` 