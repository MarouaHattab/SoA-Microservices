/**
 * Test script for demonstrating the updated review endpoints
 * that use the authenticated user's identity instead of requiring user_id and user_name
 * 
 * Usage:
 * 1. Start the API gateway and all required services
 * 2. Run this script: node test-updated-reviews.js
 */

const axios = require('axios');
const API_URL = 'http://localhost:3000/api';

// Replace with your actual test credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

// Global variable to store the JWT token
let authToken;
let testPropertyId;

async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    authToken = response.data.token;
    console.log('Login successful! Token received.');
    return authToken;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createTestProperty() {
  try {
    console.log('\nCreating test property...');
    const propertyData = {
      title: "Test Property for Updated Reviews",
      description: "This is a test property to demonstrate the updated review endpoints",
      price: 300000,
      location: "Test Location",
      address: "123 Test Street",
      bedrooms: 3,
      bathrooms: 2,
      area: 150,
      property_type: "house",
      features: ["garden", "garage", "balcony"],
      images: ["https://example.com/test-image.jpg"]
    };

    const response = await axios.post(
      `${API_URL}/properties`,
      propertyData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    testPropertyId = response.data.property.id;
    console.log(`Test property created with ID: ${testPropertyId}`);
    console.log('Property details:', response.data.property);
    return testPropertyId;
  } catch (error) {
    console.error('Create property failed:', error.response?.data || error.message);
    throw error;
  }
}

async function addReview() {
  try {
    console.log('\nAdding a review with category ratings...');
    const reviewData = {
      rating: 4,
      comment: "This is a test review with category ratings",
      category_ratings: {
        location: 5,
        value: 4,
        quality: 3,
        amenities: 4,
        neighborhood: 5
      }
    };

    const response = await axios.post(
      `${API_URL}/properties/${testPropertyId}/reviews`,
      reviewData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('Review created successfully!');
    console.log('Review details:', response.data.review);
    return response.data.review.id;
  } catch (error) {
    console.error('Add review failed:', error.response?.data || error.message);
    throw error;
  }
}

async function updateReviewAsAnonymous(reviewId) {
  try {
    console.log('\nUpdating review as anonymous...');
    const reviewData = {
      rating: 5,
      comment: "Updated test review with hidden name",
      hidden: true,
      category_ratings: {
        location: 5,
        value: 5,
        quality: 4,
        amenities: 5,
        neighborhood: 5
      }
    };

    console.log('Sending update request with data:', JSON.stringify(reviewData, null, 2));

    const response = await axios.put(
      `${API_URL}/properties/reviews/${reviewId}`,
      reviewData,
      { 
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    console.log('Review updated successfully!');
    console.log('Updated review details:', response.data.review);
    return response.data.review;
  } catch (error) {
    console.error('Update review failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status code:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    throw error;
  }
}

async function getReviews() {
  try {
    console.log('\nFetching reviews for the property...');
    const response = await axios.get(
      `${API_URL}/properties/${testPropertyId}/reviews`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('Reviews fetched successfully!');
    console.log(`Total reviews: ${response.data.reviews.length}`);
    console.log('Reviews:', response.data.reviews);
    return response.data.reviews;
  } catch (error) {
    console.error('Get reviews failed:', error.response?.data || error.message);
    throw error;
  }
}

async function addToFavorites() {
  try {
    console.log('\nAdding property to favorites...');
    const response = await axios.post(
      `${API_URL}/properties/${testPropertyId}/favorites`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('Property added to favorites successfully!');
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Add to favorites failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getUserFavorites() {
  try {
    console.log('\nFetching user favorites...');
    const response = await axios.get(
      `${API_URL}/properties/user/favorites`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('Favorites fetched successfully!');
    console.log(`Total favorites: ${response.data.total_count}`);
    console.log('Favorite properties:', response.data.properties);
    return response.data;
  } catch (error) {
    console.error('Get favorites failed:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    // Login
    await login();

    // Create a test property
    await createTestProperty();

    // Add a review
    const reviewId = await addReview();

    // Update the review as anonymous
    await updateReviewAsAnonymous(reviewId);

    // Get all reviews for the property
    await getReviews();

    // Add the property to favorites
    await addToFavorites();

    // Get user favorites
    await getUserFavorites();

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests(); 