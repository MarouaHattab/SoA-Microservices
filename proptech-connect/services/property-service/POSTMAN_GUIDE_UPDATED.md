# PropTech Connect Property Service Postman Testing Guide

This guide provides instructions for testing the Property Service API using Postman, with a focus on the updated review endpoints that now rely on authenticated user information rather than requiring user_id and user_name in the request body.

## Authentication

Before testing any endpoints, you need to authenticate:

1. Send a POST request to `/api/auth/login` with:
   ```json
   {
     "email": "your_email@example.com",
     "password": "your_password"
   }
   ```

2. Copy the JWT token from the response.

3. For all subsequent requests, add the Authorization header:
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

## Property Service Endpoints

### 1. Create Property

**Endpoint:** `POST /api/properties`

**Body:**
```json
{
  "title": "Modern Apartment in City Center",
  "description": "Beautiful 2-bedroom apartment with amazing city views",
  "price": 250000,
  "location": "Downtown",
  "address": "123 Main Street",
  "bedrooms": 2,
  "bathrooms": 1,
  "area": 85,
  "property_type": "apartment",
  "features": ["balcony", "parking", "elevator"],
  "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
}
```

**Note:** The `owner_id` will automatically be set to the authenticated user's ID.

### 2. Get Property

**Endpoint:** `GET /api/properties/{id}`

Replace `{id}` with the actual property ID.

### 3. Search Properties

**Endpoint:** `GET /api/properties`

**Query Parameters:**
- `location` (optional): Filter by location
- `min_price` (optional): Minimum price
- `max_price` (optional): Maximum price
- `bedrooms` (optional): Number of bedrooms
- `bathrooms` (optional): Number of bathrooms
- `min_area` (optional): Minimum area
- `property_type` (optional): Type of property
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

Example: `GET /api/properties?location=Downtown&min_price=200000&max_price=300000&bedrooms=2&page=1&limit=10`

### 4. Update Property

**Endpoint:** `PUT /api/properties/{id}`

**Body:**
```json
{
  "title": "Updated Modern Apartment",
  "description": "Updated description with new features",
  "price": 260000,
  "location": "Downtown",
  "address": "123 Main Street",
  "bedrooms": 2,
  "bathrooms": 1,
  "area": 85,
  "property_type": "apartment",
  "features": ["balcony", "parking", "elevator", "gym"],
  "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
}
```

### 5. Delete Property

**Endpoint:** `DELETE /api/properties/{id}`

Replace `{id}` with the actual property ID.

## Review Endpoints (Updated)

### 6. Add Review (Updated)

**Endpoint:** `POST /api/properties/{id}/reviews`

**Body (Updated):**
```json
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

**Notes:**
- The `user_id` is automatically taken from the authenticated user's JWT token
- The `user_name` is automatically fetched from the user service
- If `hidden` is set to `true`, the review will be posted as "Anonymous"
- `category_ratings` is optional

### 7. Update Review (Updated)

**Endpoint:** `PUT /api/properties/reviews/{reviewId}`

**Body (Updated):**
```json
{
  "rating": 5,
  "comment": "Updated review - this property exceeded my expectations!",
  "hidden": false,
  "category_ratings": {
    "location": 5,
    "value": 4,
    "quality": 5,
    "amenities": 4,
    "neighborhood": 5
  }
}
```

**Notes:**
- The `user_id` is automatically taken from the authenticated user's JWT token
- Only the owner of the review can update it
- If `hidden` is set to `true`, the review will be updated as "Anonymous"
- `category_ratings` is optional

### 8. Get Property Reviews

**Endpoint:** `GET /api/properties/{id}/reviews`

**Query Parameters:**
- `verified_only` (optional): Filter by verified reviews only (true/false)
- `sort_by` (optional): Sort by option (date, rating_high, rating_low, helpful)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

Example: `GET /api/properties/{id}/reviews?sort_by=rating_high&page=1&limit=10`

### 9. Delete Review

**Endpoint:** `DELETE /api/properties/reviews/{reviewId}`

Replace `{reviewId}` with the actual review ID. Only the user who created the review can delete it.

## Favorites Endpoints

### 10. Add to Favorites

**Endpoint:** `POST /api/properties/{id}/favorites`

No body required. The user ID is automatically taken from the JWT token.

### 11. Remove from Favorites

**Endpoint:** `DELETE /api/properties/{id}/favorites`

No body required. The user ID is automatically taken from the JWT token.

### 12. Get User Favorites

**Endpoint:** `GET /api/properties/user/favorites`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

Example: `GET /api/properties/user/favorites?page=1&limit=10`

### 13. Create Favorite Category

**Endpoint:** `POST /api/properties/favorites/categories`

**Body:**
```json
{
  "name": "Dream Homes",
  "color": "#4a90e2",
  "icon": "home"
}
```

### 14. Get Favorite Categories

**Endpoint:** `GET /api/properties/favorites/categories`

No body required. The user ID is automatically taken from the JWT token.

### 15. Add to Favorites with Categories

**Endpoint:** `POST /api/properties/{id}/favorites`

**Body:**
```json
{
  "category_ids": ["category123", "category456"],
  "notes": "Perfect property for family gatherings"
}
```

## Testing the Fixed Functionality

To verify the fixes implemented in the property service, you should test the following key endpoints:

### 1. Test Add to Favorites

**Endpoint:** `POST /api/properties/{id}/favorites`

No request body needed. The authenticated user's ID will be used.

### 2. Test Get User Favorites

**Endpoint:** `GET /api/properties/user/favorites`

This should return properly formatted property objects with all fields including timestamps.

### 3. Test Add Property Review with Category Ratings

**Endpoint:** `POST /api/properties/{id}/reviews`

**Body:**
```json
{
  "rating": 4,
  "comment": "Testing review with category ratings",
  "category_ratings": {
    "location": 5,
    "value": 4,
    "quality": 4,
    "amenities": 3,
    "neighborhood": 5
  }
}
```

The response should include the category_ratings object with all the ratings.

## Response Examples

### Successful Review Creation Response

```json
{
  "review": {
    "id": "60a1e6c1c8b9e4001c6f1234",
    "property_id": "60a1e0f9c8b9e4001c6f0987",
    "name": "John Doe",
    "rating": 4,
    "comment": "Great property with excellent amenities",
    "created_at": "2023-05-17T14:23:13.651Z",
    "updated_at": "2023-05-17T14:23:13.651Z",
    "category_ratings": {
      "location": 5,
      "value": 4,
      "quality": 4,
      "amenities": 3,
      "neighborhood": 5
    }
  }
}
```

### Successful Get Favorites Response

```json
{
  "properties": [
    {
      "id": "60a1e0f9c8b9e4001c6f0987",
      "title": "Modern Apartment in City Center",
      "description": "Beautiful 2-bedroom apartment with amazing city views",
      "price": 250000,
      "location": "Downtown",
      "address": "123 Main Street",
      "bedrooms": 2,
      "bathrooms": 1,
      "area": 85,
      "property_type": "apartment",
      "owner_id": "user123",
      "features": ["balcony", "parking", "elevator"],
      "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
      "created_at": "2023-05-17T14:00:09.123Z",
      "updated_at": "2023-05-17T14:00:09.123Z",
      "average_rating": 4.5,
      "total_ratings": 10,
      "favorited_by": ["user456", "user789"]
    }
  ],
  "total_count": 1,
  "page": 1,
  "limit": 10
}
``` 