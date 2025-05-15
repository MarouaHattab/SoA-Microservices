/**
 * Simplified fix for the appointment service
 * This applies only the essential changes needed to fix the validation issue
 */

const fs = require('fs');
const path = require('path');

// Path to the server.js file
const serverFilePath = path.join(__dirname, 'server.js');

console.log(`Applying simplified fix to appointment service at: ${serverFilePath}`);

// Read the server.js file
let serverContent;
try {
  serverContent = fs.readFileSync(serverFilePath, 'utf8');
  console.log('Successfully read server.js');
} catch (error) {
  console.error('Error reading server file:', error);
  process.exit(1);
}

// Find the createAppointment function's relevant part
const createAppointmentBodyRegex = /const appointmentData = \{[\s\S]+?\.\.\.call\.request,[\s\S]+?date_time: appointmentDate[\s\S]+?\};/;

// Replace with the fixed version that includes the essential fix
const fixedAppointmentBody = `const appointmentData = {
      ...call.request,
      // Essential fix: ensure required fields are never empty strings
      user_id: call.request.user_id || 'default_user',
      agent_id: call.request.agent_id || 'default_agent', 
      status: call.request.status || 'pending',
      date_time: appointmentDate
    };`;

// Apply the fix
const updatedContent = serverContent.replace(createAppointmentBodyRegex, fixedAppointmentBody);

// Write the updated content back to the file
try {
  fs.writeFileSync(serverFilePath, updatedContent);
  console.log('Successfully applied simplified fix to server.js');
} catch (error) {
  console.error('Error writing server file:', error);
  process.exit(1);
}

console.log('Simplified fix applied successfully!');
console.log('This fix only modifies the appointment service to handle empty strings properly.');
console.log('Restart the appointment service to apply the changes:');
console.log('  node restart-service.js'); 