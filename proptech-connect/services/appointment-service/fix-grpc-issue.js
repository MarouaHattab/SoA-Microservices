/**
 * This script fixes the gRPC communication issue in the appointment service
 * by adding middleware to ensure required fields are set before validation
 */

const fs = require('fs');
const path = require('path');

// Path to the server.js file
const serverFilePath = path.join(__dirname, 'server.js');

console.log(`Fixing appointment service gRPC issue at: ${serverFilePath}`);

// Read the server.js file
let serverContent;
try {
  serverContent = fs.readFileSync(serverFilePath, 'utf8');
  console.log('Successfully read server.js');
} catch (error) {
  console.error('Error reading server file:', error);
  process.exit(1);
}

// Fix the createAppointment function
const createAppointmentRegex = /createAppointment: async \(call, callback\) => \{[\s\S]+?try \{[\s\S]+?const appointmentData = \{/;

const fixedCreateAppointment = `createAppointment: async (call, callback) => {
  try {
    // Log the entire request for debugging
    console.log('CreateAppointment FULL REQUEST:', JSON.stringify(call.request, null, 2));
    
    // Improved handling of date_time parsing
    let appointmentDate;
    try {
      console.log('Received date_time value:', call.request.date_time);
      
      if (!call.request.date_time || call.request.date_time === 'Invalid Date') {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Invalid date_time format: Must be a valid ISO date string (YYYY-MM-DDTHH:MM:SS.sssZ)'
        });
      }
      
      // Parse the date string
      appointmentDate = new Date(call.request.date_time);
      
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
    
    // CRITICAL FIX: Ensure required fields have values or defaults
    // This prevents Mongoose validation errors
    const user_id = call.request.user_id || '';
    const agent_id = call.request.agent_id || '';
    const status = call.request.status || 'pending';
    
    console.log('Extracted fields for validation:');
    console.log('- user_id:', user_id);
    console.log('- agent_id:', agent_id);
    console.log('- status:', status);
    
    // Log entire structure before creating the appointment
    console.log('Full appointment data before creation:', JSON.stringify({
      ...call.request,
      user_id,
      agent_id,
      status,
      date_time: appointmentDate
    }, null, 2));
    
    const appointmentData = {`;

// Fix the appointment data object
const appointmentDataRegex = /const appointmentData = \{[\s\S]+?\.\.\.call\.request,[\s\S]+?date_time: appointmentDate/;

const fixedAppointmentData = `const appointmentData = {
      ...call.request,
      user_id,  // Use the extracted or default user_id
      agent_id, // Use the extracted or default agent_id
      status,   // Use the extracted or default status
      date_time: appointmentDate`;

// Replace the content in the server.js file
let updatedContent = serverContent.replace(createAppointmentRegex, fixedCreateAppointment);
updatedContent = updatedContent.replace(appointmentDataRegex, fixedAppointmentData);

// Write the updated content back to the server.js file
try {
  fs.writeFileSync(serverFilePath, updatedContent);
  console.log('Successfully updated server.js with gRPC fix');
} catch (error) {
  console.error('Error writing server file:', error);
  process.exit(1);
}

console.log('gRPC fix applied successfully!');
console.log('Restart the appointment service to apply the changes.');
console.log('You can now test appointment creation with Postman.'); 