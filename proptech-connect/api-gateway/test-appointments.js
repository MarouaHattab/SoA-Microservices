/**
 * Test script for appointment creation
 * 
 * This script tests the simplified appointment creation process
 * by providing only property_id and date_time
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/api';
let authToken = null;

// Login test user
async function login() {
  try {
    console.log('Logging in test user...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'user@example.com',
      password: 'password123'
    });
    
    authToken = response.data.token;
    console.log('Successfully logged in!');
    return response.data.user;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Create an appointment
async function createAppointment(propertyId) {
  try {
    console.log(`\nCreating appointment for property ${propertyId}...`);
    
    // Create a date 2 days from now at 10:00 AM
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 2);
    appointmentDate.setHours(10, 0, 0, 0);
    
    const appointmentData = {
      property_id: propertyId,
      date_time: appointmentDate.toISOString(),
      duration: 60,
      type: "viewing",
      message: "I'd like to view this property"
    };
    
    console.log('Sending appointment request with data:', JSON.stringify(appointmentData, null, 2));
    
    const response = await axios.post(
      `${API_URL}/appointments`,
      appointmentData,
      { 
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    console.log('Appointment created successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error creating appointment:', error.response?.data || error.message);
    throw error;
  }
}

// Get a property to use for testing
async function getTestProperty() {
  try {
    console.log('\nFetching a test property...');
    const response = await axios.get(
      `${API_URL}/properties?limit=1`,
      { 
        headers: { 
          Authorization: `Bearer ${authToken}`
        } 
      }
    );
    
    if (response.data.properties && response.data.properties.length > 0) {
      const property = response.data.properties[0];
      console.log(`Found test property: ${property.title} (ID: ${property.id})`);
      return property;
    } else {
      throw new Error('No properties found for testing');
    }
  } catch (error) {
    console.error('Error fetching test property:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
async function runTest() {
  try {
    const user = await login();
    console.log(`Logged in as ${user.email} (ID: ${user.id})`);
    
    const testProperty = await getTestProperty();
    await createAppointment(testProperty.id);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Execute the test
runTest(); 