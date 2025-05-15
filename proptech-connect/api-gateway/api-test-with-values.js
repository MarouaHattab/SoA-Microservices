/**
 * API Gateway test with explicit field values
 */

const axios = require('axios');

// Mock JWT token for testing (replace with a valid token if needed)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVmOGQwZjFkOWIwZjVhMDAxYzJlMTIzNCIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjkwMDAwMDAwLCJleHAiOjE2OTAwODY0MDB9.2UJgGfg3rFDQwqcXjn7Cl1sahJBhjfHt7VQY4QnXxyz';

// Test the API gateway with explicit values
const testApiGateway = async () => {
  try {
    // Create a future date for a weekday at 10:00 AM
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1); // Tomorrow
    
    // Make sure it's a weekday (Monday-Friday, where 1-5 are day numbers)
    while(appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    }
    
    appointmentDate.setHours(10, 0, 0, 0);

    // Test data with EXPLICIT values for required fields
    const appointmentData = {
      property_id: "681945a85c7b8a858717f024", // Use a valid property ID
      user_id: "explicit-user-12345",          // Explicitly set user_id
      agent_id: "explicit-agent-67890",        // Explicitly set agent_id
      date_time: appointmentDate.toISOString(),
      duration: 60,
      type: "viewing",
      message: "API test with explicit values",
      status: "pending"                         // Explicitly set status
    };

    console.log('Sending API request with data:', JSON.stringify(appointmentData, null, 2));

    // Send the request to the API gateway
    const response = await axios.post('http://localhost:3000/api/appointments', appointmentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Appointment created successfully through API!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error creating appointment through API:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
  }
};

// Execute the test
testApiGateway().then(() => {
  console.log('API test completed');
}).catch(error => {
  console.error('Unexpected error:', error);
}); 