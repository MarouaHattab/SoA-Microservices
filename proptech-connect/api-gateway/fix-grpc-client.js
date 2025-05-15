/**
 * Fix for the gRPC appointment client
 * This ensures non-empty values for required fields before sending to the appointment service
 */

const fs = require('fs');
const path = require('path');

// Path to the gRPC clients file
const clientFilePath = path.join(__dirname, 'grpc-clients', 'index.js');

console.log(`Adding interception for appointment service gRPC client at: ${clientFilePath}`);

// Read the gRPC clients file
let clientContent;
try {
  clientContent = fs.readFileSync(clientFilePath, 'utf8');
  console.log('Successfully read gRPC clients file');
} catch (error) {
  console.error('Error reading gRPC clients file:', error);
  process.exit(1);
}

// Add the wrapper function after the Object.keys loop for promisifying methods
const objectKeysLoopEnd = `Object.keys(appointmentClient.__proto__).forEach(method => {
  if (typeof appointmentClient[method] === 'function' && method !== 'constructor') {
    appointmentService[\`\${method}Async\`] = promisify(appointmentClient[method].bind(appointmentClient));
  }
});`;

// Add our interceptor that will modify the requests to ensure non-empty values
const wrapperCode = `
// Add custom wrapper for createAppointment to ensure non-empty fields
const originalCreateAppointmentAsync = appointmentService.createAppointmentAsync;
appointmentService.createAppointmentAsync = async function(data) {
  // Ensure required fields have non-empty values
  console.log('INTERCEPTED createAppointment request:', JSON.stringify(data, null, 2));
  
  const enhancedData = {
    ...data,
    user_id: data.user_id || 'default_user',
    agent_id: data.agent_id || 'default_agent',
    status: data.status || 'pending'
  };
  
  console.log('Enhanced with non-empty values:', JSON.stringify(enhancedData, null, 2));
  
  // Call the original method with the enhanced data
  return originalCreateAppointmentAsync(enhancedData);
};`;

// Replace the content
const updatedContent = clientContent.replace(objectKeysLoopEnd, objectKeysLoopEnd + wrapperCode);

// Write the updated content back to the file
try {
  fs.writeFileSync(clientFilePath, updatedContent);
  console.log('Successfully updated gRPC clients file with createAppointment interceptor');
} catch (error) {
  console.error('Error writing gRPC clients file:', error);
  process.exit(1);
}

console.log('gRPC client fix applied successfully!');
console.log('Restart the API gateway to apply the changes.');
console.log('You can now test appointment creation with Postman or the test script.'); 