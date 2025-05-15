// debug-property-timestamps.js
require('dotenv').config();
const mongoose = require('mongoose');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Load Property model
const Property = require('./models/Property');

// Load proto file for testing gRPC
const PROTO_PATH = path.join(__dirname, '../../proto/property.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const propertyProto = grpc.loadPackageDefinition(packageDefinition).property;
const client = new propertyProto.PropertyService(
  'localhost:50053', // Update port if different
  grpc.credentials.createInsecure()
);

// Promisify gRPC methods
const getPropertyAsync = promisify(client.GetProperty.bind(client));
const createPropertyAsync = promisify(client.CreateProperty.bind(client));

async function testPropertyTimestamps() {
  let savedProperty;
  try {
    console.log('======= DEBUGGING PROPERTY TIMESTAMPS ISSUE =======');
    
    // 1. Check if timestamps are being created in MongoDB
    console.log('\n1. Checking timestamp creation in MongoDB:');
    const recentProperties = await Property.find().sort({ createdAt: -1 }).limit(5);
    
    if (recentProperties.length > 0) {
      console.log(`Found ${recentProperties.length} recent properties in database`);
      recentProperties.forEach((prop, i) => {
        console.log(`\nProperty ${i+1}: ${prop.title}`);
        console.log(`MongoDB createdAt: ${prop.createdAt}`);
        console.log(`MongoDB updatedAt: ${prop.updatedAt}`);
        console.log(`toObject() createdAt: ${prop.toObject().createdAt}`);
        console.log(`toObject() updatedAt: ${prop.toObject().updatedAt}`);
        console.log(`toJSON() createdAt: ${prop.toJSON().createdAt}`);
        console.log(`toJSON() updatedAt: ${prop.toJSON().updatedAt}`);
      });
    } else {
      console.log('No properties found in database');
    }
    
    // 2. Check latest property creation
    console.log('\n\n2. Creating a test property to check timestamps:');
    const testProperty = {
      title: "Debug Test Property",
      description: "Property created to test timestamp issues",
      price: 250000,
      location: "Test Location",
      address: "123 Debug Street",
      bedrooms: 3,
      bathrooms: 2,
      area: 1500,
      property_type: "house",
      owner_id: "68252f5297cdb61797053d44", // Use an existing user ID
      features: ["test", "debug"],
      images: ["https://example.com/test.jpg"]
    };
    
    // Try direct MongoDB creation
    const newProperty = new Property(testProperty);
    savedProperty = await newProperty.save();
    
    console.log('\nDirect MongoDB creation results:');
    console.log('MongoDB createdAt:', savedProperty.createdAt);
    console.log('MongoDB updatedAt:', savedProperty.updatedAt);
    console.log('toObject():', JSON.stringify(savedProperty.toObject(), null, 2));
    console.log('toJSON():', JSON.stringify(savedProperty.toJSON(), null, 2));
    
    // 3. Check gRPC response formatting
    console.log('\n\n3. Testing gRPC service:');
    console.log('Fetching property via gRPC:', savedProperty._id.toString());
    
    try {
      const grpcResponse = await getPropertyAsync({ id: savedProperty._id.toString() });
      console.log('\ngRPC GetProperty response:');
      console.log(JSON.stringify(grpcResponse, null, 2));
    } catch (err) {
      console.error('gRPC GetProperty error:', err);
    }
    
    // 4. Suggest fix for the issue
    console.log('\n\n4. SUGGESTED FIX:');
    console.log(`
Based on this test, the issue appears to be in the server.js file's CreateProperty and UpdateProperty implementations. 
When responding with the saved property, Mongoose document objects need to be properly formatted to include ISO string timestamps.

The fix should update the response format in server.js to explicitly include timestamps:

In the CreateProperty and UpdateProperty handlers, replace:
callback(null, { property: savedProperty });

With something like:
const formattedProperty = {
  id: savedProperty._id.toString(),
  title: savedProperty.title,
  description: savedProperty.description,
  price: savedProperty.price,
  location: savedProperty.location,
  address: savedProperty.address,
  bedrooms: savedProperty.bedrooms,
  bathrooms: savedProperty.bathrooms,
  area: savedProperty.area,
  property_type: savedProperty.property_type,
  owner_id: savedProperty.owner_id,
  features: savedProperty.features || [],
  images: savedProperty.images || [],
  created_at: savedProperty.createdAt ? savedProperty.createdAt.toISOString() : new Date().toISOString(),
  updated_at: savedProperty.updatedAt ? savedProperty.updatedAt.toISOString() : new Date().toISOString(),
  average_rating: savedProperty.average_rating || 0,
  total_ratings: savedProperty.total_ratings || 0,
  favorited_by: savedProperty.favorited_by || []
};
callback(null, { property: formattedProperty });
`);
    
  } catch (error) {
    console.error('Error testing property timestamps:', error);
  } finally {
    // Clean up test property
    if (savedProperty && savedProperty._id) {
      try {
        await Property.findByIdAndDelete(savedProperty._id);
        console.log('\nCleanup: Test property deleted');
      } catch (err) {
        console.error('Error cleaning up test property:', err);
      }
    }
    mongoose.connection.close();
  }
}

// Run the test
testPropertyTimestamps(); 