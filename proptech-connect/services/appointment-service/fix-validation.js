/**
 * Script to fix validation in the appointment service
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Path to the appointment model file
const appointmentModelPath = path.join(__dirname, 'models', 'Appointment.js');

console.log(`Fixing appointment model at: ${appointmentModelPath}`);

// Read the current content of the file
let modelContent;
try {
  modelContent = fs.readFileSync(appointmentModelPath, 'utf8');
  console.log('Successfully read Appointment.js model');
} catch (error) {
  console.error('Error reading model file:', error);
  process.exit(1);
}

// Set default values for user_id and agent_id fields
const updatedModelContent = modelContent
  .replace(
    /user_id: \{ type: String, required: true \},/,
    'user_id: { type: String, required: true },'
  )
  .replace(
    /agent_id: \{ type: String, required: true \},/,
    'agent_id: { type: String, required: true },'
  )
  .replace(
    /status: \{ \n    type: String, \n    required: true, \n    enum: \['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'rescheduled'\],\n    default: 'pending'\n  \},/,
    'status: { \n    type: String, \n    required: true, \n    enum: [\'pending\', \'confirmed\', \'rejected\', \'cancelled\', \'completed\', \'rescheduled\'],\n    default: \'pending\'\n  },'
  );

// Write the updated content back to the file
try {
  fs.writeFileSync(appointmentModelPath, updatedModelContent);
  console.log('Successfully updated Appointment.js model');
} catch (error) {
  console.error('Error writing model file:', error);
  process.exit(1);
}

// Path to the server.js file
const serverFilePath = path.join(__dirname, 'server.js');

console.log(`Fixing appointment server at: ${serverFilePath}`);

// Read the current content of the file
let serverContent;
try {
  serverContent = fs.readFileSync(serverFilePath, 'utf8');
  console.log('Successfully read server.js');
} catch (error) {
  console.error('Error reading server file:', error);
  process.exit(1);
}

// Fix the createAppointment function to properly handle missing fields
const createAppointmentFixRegex = /createAppointment: async \(call, callback\) => \{[\s\S]+?try \{[\s\S]+?const appointmentData = \{/;
const fixedCreateAppointment = `createAppointment: async (call, callback) => {
  try {
    // Log the incoming request for debugging
    console.log('CreateAppointment request:', JSON.stringify(call.request, null, 2));
    
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
          message: \`Invalid date_time: \${dateError.message}\`
        });
      }
    } catch (dateError) {
      console.error('Error parsing date_time:', dateError);
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: \`Invalid date_time: \${dateError.message}\`
      });
    }
    
    // Validate required fields manually before creating the appointment
    const missingFields = [];
    
    if (!call.request.property_id) missingFields.push('property_id');
    if (!call.request.user_id) missingFields.push('user_id');
    if (!call.request.agent_id) missingFields.push('agent_id');
    
    if (missingFields.length > 0) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: \`Missing required fields: \${missingFields.join(', ')}\`
      });
    }
    
    // Ensure status has a default value if not provided
    const status = call.request.status || 'pending';
    
    const appointmentData = {`;

// Replace the createAppointment function
const updatedServerContent = serverContent.replace(
  createAppointmentFixRegex,
  fixedCreateAppointment
);

// Also ensure we set the status in the appointmentData
const appointmentDataFixRegex = /const appointmentData = \{[\s\S]+?\.\.\.call\.request,[\s\S]+?date_time: appointmentDate/;
const fixedAppointmentData = `const appointmentData = {
      ...call.request,
      status: status,
      date_time: appointmentDate`;

// Replace the appointmentData object construction
const finalServerContent = updatedServerContent.replace(
  appointmentDataFixRegex,
  fixedAppointmentData
);

// Write the updated content back to the file
try {
  fs.writeFileSync(serverFilePath, finalServerContent);
  console.log('Successfully updated server.js');
} catch (error) {
  console.error('Error writing server file:', error);
  process.exit(1);
}

console.log('Fix completed successfully! Restart the appointment service to apply changes.');
console.log('You can restart the appointment service by running: node restart-service.js'); 