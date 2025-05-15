/**
 * Test script to verify the fixes for property service favorites and reviews
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
require('dotenv').config();

// Load the proto file
const PROTO_PATH = path.join(__dirname, '../../proto/property.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const propertyProto = grpc.loadPackageDefinition(packageDefinition).property;

// Create a gRPC client
const client = new propertyProto.PropertyService(
  process.env.PROPERTY_SERVICE_URL || 'localhost:50051',
  grpc.credentials.createInsecure()
);

// Test data
const testUserId = 'test-user-123';
const testPropertyId = ''; // Will be filled after creating a test property

// Function to create a test property
function createTestProperty() {
  return new Promise((resolve, reject) => {
    const propertyData = {
      title: 'Test Property for Favorites',
      description: 'This is a test property to verify favorites functionality',
      price: 250000,
      location: 'Test City',
      address: '123 Test Street',
      bedrooms: 3,
      bathrooms: 2,
      area: 150,
      property_type: 'house',
      owner_id: 'test-owner-456',
      features: ['garden', 'garage'],
      images: ['https://example.com/image1.jpg']
    };

    client.CreateProperty(propertyData, (error, response) => {
      if (error) {
        return reject(error);
      }
      resolve(response.property);
    });
  });
}

// Test add to favorites
function testAddToFavorites(propertyId, userId) {
  return new Promise((resolve, reject) => {
    console.log(`\nTesting AddToFavorites for property ${propertyId} and user ${userId}`);
    
    client.AddToFavorites({ property_id: propertyId, user_id: userId }, (error, response) => {
      if (error) {
        console.error('Error adding to favorites:', error.message);
        return reject(error);
      }
      
      console.log('AddToFavorites response:', response);
      resolve(response);
    });
  });
}

// Test get user favorites
function testGetUserFavorites(userId) {
  return new Promise((resolve, reject) => {
    console.log(`\nTesting GetUserFavorites for user ${userId}`);
    
    client.GetUserFavorites({ user_id: userId }, (error, response) => {
      if (error) {
        console.error('Error getting user favorites:', error.message);
        return reject(error);
      }
      
      console.log('GetUserFavorites response:');
      console.log(`Total favorites: ${response.total_count}`);
      
      if (response.properties && response.properties.length > 0) {
        console.log('First favorite property:');
        const property = response.properties[0];
        console.log(`- ID: ${property.id}`);
        console.log(`- Title: ${property.title}`);
        console.log(`- Price: ${property.price}`);
        console.log(`- Location: ${property.location}`);
      } else {
        console.log('No favorites found');
      }
      
      resolve(response);
    });
  });
}

// Test add property review
function testAddReview(propertyId, userId) {
  return new Promise((resolve, reject) => {
    console.log(`\nTesting AddReview for property ${propertyId} and user ${userId}`);
    
    const reviewData = {
      property_id: propertyId,
      user_id: userId,
      user_name: 'Test User',
      rating: 4,
      comment: 'This is a test review',
      category_ratings: {
        location: 5,
        value: 4,
        quality: 4,
        amenities: 3,
        neighborhood: 5
      }
    };
    
    client.AddReview(reviewData, (error, response) => {
      if (error) {
        console.error('Error adding review:', error.message);
        return reject(error);
      }
      
      console.log('AddReview response:');
      console.log(`- Review ID: ${response.review.id}`);
      console.log(`- Rating: ${response.review.rating}`);
      console.log(`- Comment: ${response.review.comment}`);
      console.log(`- Category Ratings:`, response.review.category_ratings);
      
      resolve(response);
    });
  });
}

// Run all tests
async function runTests() {
  try {
    console.log('Starting property service functionality tests...');
    
    // Create a test property
    console.log('\nCreating test property...');
    const property = await createTestProperty();
    console.log(`Test property created with ID: ${property.id}`);
    
    // Set the test property ID
    const propertyId = property.id;
    
    // Test add to favorites
    await testAddToFavorites(propertyId, testUserId);
    
    // Test get user favorites
    await testGetUserFavorites(testUserId);
    
    // Test add property review
    await testAddReview(propertyId, testUserId);
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests(); 