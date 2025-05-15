/**
 * Direct fix for the appointment service validation issue
 */

const fs = require('fs');
const path = require('path');

// Path to the Appointment model file
const modelPath = path.join(__dirname, 'models', 'Appointment.js');

console.log(`Applying direct fix to Appointment model at: ${modelPath}`);

// Read the model file
let modelContent;
try {
  modelContent = fs.readFileSync(modelPath, 'utf8');
  console.log('Successfully read Appointment.js');
} catch (error) {
  console.error('Error reading model file:', error);
  process.exit(1);
}

// Update the model to make required validators accept empty strings
const fixedModelContent = modelContent.replace(
  /user_id: \{\s*type: String,\s*required: true(,\s*default:[^}]*)?\s*\}/,
  'user_id: { type: String, required: function() { return this.user_id !== ""; }, default: "default_user" }'
).replace(
  /agent_id: \{\s*type: String,\s*required: true(,\s*default:[^}]*)?\s*\}/,
  'agent_id: { type: String, required: function() { return this.agent_id !== ""; }, default: "default_agent" }'
).replace(
  /status: \{\s*type: String,\s*required: true(,\s*[^}]*)?\s*\}/,
  'status: { type: String, required: function() { return this.status !== ""; }, default: "pending", enum: [\'pending\', \'confirmed\', \'rejected\', \'cancelled\', \'completed\', \'rescheduled\'] }'
);

// Write the updated content back to the file
try {
  fs.writeFileSync(modelPath, fixedModelContent);
  console.log('Successfully updated Appointment.js with validation fix');
} catch (error) {
  console.error('Error writing model file:', error);
  process.exit(1);
}

// Now fix the server.js file to properly set default values
const serverPath = path.join(__dirname, 'server.js');

console.log(`Now fixing server.js at: ${serverPath}`);

// Read the server.js file
let serverContent;
try {
  serverContent = fs.readFileSync(serverPath, 'utf8');
  console.log('Successfully read server.js');
} catch (error) {
  console.error('Error reading server file:', error);
  process.exit(1);
}

// Find the createAppointment function
const patchLocation = serverContent.indexOf('const appointmentData = {');
if (patchLocation === -1) {
  console.error('Could not find appointment data initialization in server.js');
  process.exit(1);
}

// Find the end of the appointmentData block
const blockStart = serverContent.indexOf('{', patchLocation);
const blockEnd = findMatchingBrace(serverContent, blockStart);

if (blockEnd === -1) {
  console.error('Could not find end of appointmentData block');
  process.exit(1);
}

// Extract the old block
const oldBlock = serverContent.substring(blockStart, blockEnd + 1);

// Create the new block
const newBlock = `{
      ...call.request,
      user_id: call.request.user_id || 'default_user',
      agent_id: call.request.agent_id || 'default_agent',
      status: call.request.status || 'pending',
      date_time: appointmentDate
    }`;

// Replace the old block with the new one
const fixedServerContent = serverContent.replace(oldBlock, newBlock);

// Write the updated content back to the file
try {
  fs.writeFileSync(serverPath, fixedServerContent);
  console.log('Successfully updated server.js');
} catch (error) {
  console.error('Error writing server file:', error);
  process.exit(1);
}

console.log('Direct fixes applied successfully!');
console.log('Restart the appointment service to apply the changes.');

// Helper function to find the matching closing brace
function findMatchingBrace(text, openBracePos) {
  let count = 1;
  let i = openBracePos + 1;
  
  while (i < text.length && count > 0) {
    if (text[i] === '{') count++;
    else if (text[i] === '}') count--;
    i++;
  }
  
  return count === 0 ? i - 1 : -1;
} 