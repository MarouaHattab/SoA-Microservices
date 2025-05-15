/**
 * Test script for the fixed appointment service
 * This script tests appointment creation through the API gateway
 */

const axios = require('axios');

// Mock JWT token for testing (replace with a valid token if needed)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVmOGQwZjFkOWIwZjVhMDAxYzJlMTIzNCIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjkwMDAwMDAwLCJleHAiOjE2OTAwODY0MDB9.2UJgGfg3rFDQwqcXjn7Cl1sahJBhjfHt7VQY4QnXxyz';

// Create a test appointment
const createTestAppointment = async () => {
  try {
    // Create a future date for a weekday at 10:00 AM
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1); // Tomorrow
    
    // Make sure it's a weekday (Monday-Friday, where 1-5 are day numbers)
    while(appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    }
    
    appointmentDate.setHours(10, 0, 0, 0);

    // Test data (minimum required fields)
    const appointmentData = {
      property_id: "68192710c5b0f661a474f065", // Use a valid property ID if possible
      date_time: appointmentDate.toISOString(),
      message: "Test appointment from API gateway test"
    };

    console.log('Sending appointment request with data:', JSON.stringify(appointmentData, null, 2));

    // Send the request to the API gateway
    const response = await axios.post('http://localhost:3000/api/appointments', appointmentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Appointment created successfully!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error creating appointment:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
  }
};

// Execute the test
createTestAppointment().then(() => {
  console.log('Test completed');
}).catch(error => {
  console.error('Unexpected error:', error);
}); 