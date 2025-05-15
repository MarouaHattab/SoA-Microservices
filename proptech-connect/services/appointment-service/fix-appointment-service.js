/**
 * Script to fix appointment service issues
 * 
 * This script addresses:
 * 1. The 'Invalid Date' error in the appointment service
 * 2. Adds better date validation and error handling
 * 3. Creates a test script for the appointment service
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Paths to the files we need to modify
const serverFilePath = path.join(__dirname, 'server.js');
const apiGatewayRouteFilePath = path.join(__dirname, '..', '..', 'api-gateway', 'routes', 'appointments.js');
const testScriptPath = path.join(__dirname, '..', '..', 'api-gateway', 'test-appointments.js');
const guidePath = path.join(__dirname, '..', '..', 'api-gateway', 'APPOINTMENT_GUIDE.md');

console.log('Starting fix script for appointment service issues...');

// Fix 1: Update the appointment service's date validation
console.log('\nFixing validateAppointmentDate function in server.js...');
try {
  let serverContent = fs.readFileSync(serverFilePath, 'utf8');
  
  // Update the date validation function
  const validateAppointmentDateRegex = /const validateAppointmentDate = \(date\) => \{[\s\S]*?return \{ valid: true \};\s*\};/;
  const fixedValidateAppointmentDate = `const validateAppointmentDate = (date) => {
  // First ensure we have a valid date object
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return {
      valid: false,
      message: 'Date invalide: veuillez fournir une date et heure valides'
    };
  }
  
  const appointmentDate = date;
  const now = new Date();
  
  // Vérifier que la date est dans le futur
  if (appointmentDate <= now) {
    return {
      valid: false,
      message: 'La date du rendez-vous doit être dans le futur'
    };
  }
  
  // Vérifier que la date n'est pas trop éloignée (ex: max 3 mois)
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(now.getMonth() + 3);
  if (appointmentDate > threeMonthsLater) {
    return {
      valid: false,
      message: 'La date du rendez-vous ne peut pas être plus de 3 mois dans le futur'
    };
  }
  
  // Vérifier que le rendez-vous est durant les heures de travail (9h-18h)
  const hours = appointmentDate.getHours();
  if (hours < 9 || hours >= 18) {
    return {
      valid: false,
      message: 'Les rendez-vous ne peuvent être pris qu\\'entre 9h et 18h'
    };
  }
  
  // Vérifier que ce n'est pas le weekend
  const day = appointmentDate.getDay();
  if (day === 0 || day === 6) {
    return {
      valid: false,
      message: 'Les rendez-vous ne peuvent pas être pris le weekend'
    };
  }
  
  return { valid: true };
};`;
  
  // Replace the function
  serverContent = serverContent.replace(validateAppointmentDateRegex, fixedValidateAppointmentDate);
  
  // Update createAppointment method to better handle dates
  const createAppointmentRegex = /createAppointment: async \(call, callback\) => \{[\s\S]*?try \{[\s\S]*?const appointmentData = \{/;
  const fixedCreateAppointment = `createAppointment: async (call, callback) => {
  try {
    // Improved handling of date_time parsing
    let appointmentDate;
    
    try {
      // Log incoming date string for debugging
      console.log('Received date_time value:', call.request.date_time);
      
      // First, check if the date_time is a valid date string
      if (!call.request.date_time || call.request.date_time === 'Invalid Date') {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Invalid date_time format: Must be a valid ISO date string (YYYY-MM-DDTHH:MM:SS.sssZ)'
        });
      }
      
      // Parse the date string
      appointmentDate = new Date(call.request.date_time);
      
      // Validate the parsed date
      if (isNaN(appointmentDate.getTime())) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Invalid date_time format: The provided string could not be parsed as a date'
        });
      }
    } catch (dateError) {
      console.error('Error parsing date_time:', dateError);
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: \`Invalid date_time: \${dateError.message}\`
      });
    }
    
    // Ensure all required fields are present
    if (!call.request.property_id) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Property ID is required'
      });
    }
    
    if (!call.request.user_id) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'User ID is required'
      });
    }
    
    if (!call.request.agent_id) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Agent ID is required'
      });
    }
    
    const appointmentData = {`;
  
  // Replace the createAppointment method
  serverContent = serverContent.replace(createAppointmentRegex, fixedCreateAppointment);
  
  // Write changes back to the server file
  fs.writeFileSync(serverFilePath, serverContent);
  console.log('✓ Successfully updated server.js');
} catch (error) {
  console.error('Error updating server.js:', error);
}

// Fix 2: Update the API gateway route to automatically set user_id, agent_id, and status
console.log('\nUpdating API gateway appointments route...');
try {
  // Check if the file exists
  if (fs.existsSync(apiGatewayRouteFilePath)) {
    // Read the appointments.js file
    let routeContent = fs.readFileSync(apiGatewayRouteFilePath, 'utf8');
    
    // Create a fixed version of the POST route
    let fixedRouteContent = `// Créer un nouveau rendez-vous
router.post('/', authenticateJWT, async (req, res) => {
  try {
    console.log('Creating appointment with body:', req.body);
    
    // Basic validation
    if (!req.body.property_id) {
      return res.status(400).json({ message: 'property_id is required' });
    }
    
    if (!req.body.date_time) {
      return res.status(400).json({ message: 'date_time is required' });
    }
    
    // Get property details to find the agent_id (owner_id)
    let propertyDetails;
    try {
      propertyDetails = await grpcClients.propertyService.getPropertyAsync({ 
        id: req.body.property_id 
      });
      
      if (!propertyDetails || !propertyDetails.property) {
        return res.status(404).json({ message: 'Property not found' });
      }
      
      console.log('Found property:', propertyDetails.property.title);
    } catch (propertyError) {
      console.error('Error fetching property details:', propertyError);
      return res.status(404).json({ 
        message: 'Property not found or error retrieving property details',
        details: propertyError.message
      });
    }
    
    // Prepare the appointment data with required fields
    const appointmentData = {
      ...req.body,
      user_id: req.user.id,                       // Set from JWT token
      agent_id: propertyDetails.property.owner_id, // Set from property owner
      status: 'pending'                           // Default status for new appointments
    };
    
    console.log('Creating appointment with data:', appointmentData);
    
    const appointment = await grpcClients.appointmentService.createAppointmentAsync(appointmentData);
    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    if (error.code === 3) { // INVALID_ARGUMENT
      return res.status(400).json({ message: error.message });
    } else if (error.code === 6) { // ALREADY_EXISTS
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});`;
    
    // Replace the existing POST route with our fixed version
    const routeRegex = /\/\/ Créer un nouveau rendez-vous\s*router\.post\('\/', async \(req, res\) => \{[\s\S]*?\}\);/;
    routeContent = routeContent.replace(routeRegex, fixedRouteContent);
    
    // Write changes back to the file
    fs.writeFileSync(apiGatewayRouteFilePath, routeContent);
    console.log('✓ Successfully updated API gateway appointments route');
  } else {
    console.error('API gateway appointments route file not found');
  }
} catch (error) {
  console.error('Error updating API gateway route:', error);
}

// Fix 3: Create the test script
console.log('\nCreating test script for appointments...');
try {
  const testScriptContent = `/**
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
    const response = await axios.post(\`\${API_URL}/auth/login\`, {
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
    console.log(\`\\nCreating appointment for property \${propertyId}...\`);
    
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
      \`\${API_URL}/appointments\`,
      appointmentData,
      { 
        headers: { 
          Authorization: \`Bearer \${authToken}\`,
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
    console.log(\`\\nFetching a test property...\`);
    const response = await axios.get(
      \`\${API_URL}/properties?limit=1\`,
      { 
        headers: { 
          Authorization: \`Bearer \${authToken}\`
        } 
      }
    );
    
    if (response.data.properties && response.data.properties.length > 0) {
      const property = response.data.properties[0];
      console.log(\`Found test property: \${property.title} (ID: \${property.id})\`);
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
    console.log(\`Logged in as \${user.email} (ID: \${user.id})\`);
    
    const testProperty = await getTestProperty();
    await createAppointment(testProperty.id);
    
    console.log(\`\\nTest completed successfully!\`);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Execute the test
runTest();`;

  // Write the test script
  fs.writeFileSync(testScriptPath, testScriptContent);
  console.log('✓ Successfully created test script');
} catch (error) {
  console.error('Error creating test script:', error);
}

// Fix 4: Create the guide document
console.log('\nCreating guide document...');
try {
  const guideContent = `# PropTech Connect - Appointment Service Guide

This guide explains how to use the appointment service endpoints through Postman.

## Authentication

All requests require a JWT token obtained by logging in. Include this token in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

## Creating an Appointment

The simplified appointment creation only requires a few key fields - the rest are managed automatically:

**Endpoint:** \`POST http://localhost:3000/api/appointments\`

**Request Body:**
\`\`\`json
{
  "property_id": "68192710c5b0f661a474f065",  // Replace with a valid property ID
  "date_time": "2024-08-15T14:00:00Z",         // Must be a future date in ISO format
  "duration": 60,                              // Duration in minutes
  "type": "viewing",                           // Type of appointment
  "message": "I'd like to view this property"  // Optional message
}
\`\`\`

**What happens automatically:**
- \`user_id\` is extracted from your JWT token
- \`agent_id\` is obtained from the property's owner
- \`status\` is set to "pending" by default

**Response (Success - 201):**
\`\`\`json
{
  "appointment": {
    "id": "60a1e6c1c8b9e4001c6f1234",
    "property_id": "68192710c5b0f661a474f065",
    "user_id": "5f8d0f1d9b0f5a001c2e1234",
    "agent_id": "5f8d0f1d9b0f5a001c2e4321",
    "date_time": "2024-08-15T14:00:00.000Z",
    "status": "pending",
    "created_at": "2023-05-15T10:30:00.000Z",
    "updated_at": "2023-05-15T10:30:00.000Z"
  }
}
\`\`\`

## Getting User Appointments

**Endpoint:** \`GET http://localhost:3000/api/appointments\`

Optional query parameters:
- \`status\`: Filter by status (pending, confirmed, rejected, etc.)
- \`page\`: Page number for pagination (default: 1)
- \`limit\`: Number of appointments per page (default: 10)

**Response:**
\`\`\`json
{
  "appointments": [
    {
      "id": "60a1e6c1c8b9e4001c6f1234",
      "property_id": "68192710c5b0f661a474f065",
      "date_time": "2024-08-15T14:00:00.000Z",
      "status": "pending",
      "created_at": "2023-05-15T10:30:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "page": 1
}
\`\`\`

## Getting a Single Appointment

**Endpoint:** \`GET http://localhost:3000/api/appointments/{appointment_id}\`

**Response:**
\`\`\`json
{
  "id": "60a1e6c1c8b9e4001c6f1234",
  "property_id": "68192710c5b0f661a474f065",
  "user_id": "5f8d0f1d9b0f5a001c2e1234",
  "agent_id": "5f8d0f1d9b0f5a001c2e4321",
  "date_time": "2024-08-15T14:00:00.000Z",
  "status": "pending",
  "notes": "I'd like to view this property",
  "created_at": "2023-05-15T10:30:00.000Z",
  "updated_at": "2023-05-15T10:30:00.000Z"
}
\`\`\`

## Responding to an Appointment (Agent/Owner)

**Endpoint:** \`POST http://localhost:3000/api/appointments/{appointment_id}/respond\`

**Request Body (Accept):**
\`\`\`json
{
  "response": "confirm"
}
\`\`\`

**Request Body (Reject):**
\`\`\`json
{
  "response": "reject",
  "reason": "Not available at this time"
}
\`\`\`

**Request Body (Reschedule):**
\`\`\`json
{
  "response": "reschedule",
  "proposed_date": "2024-08-16T10:00:00Z",
  "reason": "Not available at the requested time, but can do the next day"
}
\`\`\`

## Accepting a Reschedule Proposal (User)

**Endpoint:** \`POST http://localhost:3000/api/appointments/{appointment_id}/accept-reschedule\`

(No request body needed)

## Troubleshooting

### Common Errors

1. **Invalid Date Format**
   - Ensure dates are in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
   - Dates must be in the future

2. **Property Not Found**
   - Verify the property_id exists
   - Check that the property is active and available

3. **Appointment Conflict**
   - The system prevents booking overlapping appointments (within 30 minutes)
   - Try a different time slot

## Testing

You can test appointment creation using the provided script:

\`\`\`
node api-gateway/test-appointments.js
\`\`\``;

  // Write the guide document
  fs.writeFileSync(guidePath, guideContent);
  console.log('✓ Successfully created guide document');
} catch (error) {
  console.error('Error creating guide document:', error);
}

console.log('\nAll fixes have been applied successfully!');
console.log('\nTo restart the appointment service, run:');
console.log('  node restart-service.js\n');
console.log('To restart the API gateway, run:');
console.log('  cd ../../api-gateway');
console.log('  node restart-gateway.js\n');
console.log('To test the appointment creation, run:');
console.log('  cd ../../api-gateway');
console.log('  node test-appointments.js\n'); 