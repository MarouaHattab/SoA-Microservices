# PropTech Connect Review Endpoints Update

## Overview

This update improves the property review functionality in the PropTech Connect platform by removing the need for clients to provide `user_id` and `user_name` in review requests. Instead, the API gateway now automatically uses the authenticated user's information from the JWT token and user service.

## Changes Made

1. Updated the review endpoints to extract user information from the JWT token:
   - `POST /api/properties/:id/reviews`
   - `PUT /api/properties/reviews/:reviewId`

2. Added support for category ratings in reviews, which allows users to rate properties across five categories:
   - Location
   - Value
   - Quality
   - Amenities
   - Neighborhood

3. Improved the "anonymous review" functionality with a simple `hidden: true` flag that anonymizes reviews without requiring the client to handle user name logic.

## Benefits

1. **Enhanced Security**: User identity is verified through the authentication token, preventing impersonation.

2. **Simplified Client Code**: Frontend applications no longer need to track and send user IDs, reducing code complexity.

3. **Consistent User Information**: Using the user service ensures consistent user names across the platform.

4. **Better User Experience**: The category ratings provide more detailed feedback for property seekers.

## How to Test

1. Use the included `test-updated-reviews.js` script to test the updated endpoints:
   ```bash
   node test-updated-reviews.js
   ```

2. Alternatively, use the Postman collection and guide provided in `services/property-service/POSTMAN_GUIDE_UPDATED.md`.

## Example Requests

### Adding a Review

```http
POST /api/properties/60a1e0f9c8b9e4001c6f0987/reviews
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "rating": 4,
  "comment": "Great property with excellent amenities",
  "hidden": false,
  "category_ratings": {
    "location": 5,
    "value": 4,
    "quality": 4,
    "amenities": 3,
    "neighborhood": 5
  }
}
```

### Updating a Review as Anonymous

```http
PUT 
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "rating": 5,
  "comment": "Updated review with anonymous name",
  "hidden": true,
  "category_ratings": {
    "location": 5,
    "value": 5,
    "quality": 4,
    "amenities": 4,
    "neighborhood": 5
  }
}
```

## Implementation Notes

1. The API gateway fetches the user's name from the user service when needed, with fallbacks to JWT information if the user service is unavailable.

2. Reviews can be anonymized by setting `hidden: true` in the request, which will use "Anonymous" as the reviewer name.

3. Category ratings are optional - if not provided, the main rating value will be used for all categories.

## Future Enhancements

1. Add support for review filtering based on category ratings
2. Expand review statistics to show average ratings per category
3. Implement a review helpfulness voting system that uses the authenticated user's identity 