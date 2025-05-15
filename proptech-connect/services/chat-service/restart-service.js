/**
 * Script to restart the chat service
 * 
 * This script will stop any running chat service and start a new instance
 * with the updated code to properly handle property events.
 */

const { spawn, exec } = require('child_process');
const path = require('path');

// Kill any existing chat service process
console.log('Stopping any running chat service...');
exec('taskkill /f /im node.exe /fi "WINDOWTITLE eq chat-service"', (error, stdout, stderr) => {
  if (error) {
    console.log('No existing chat service process found or could not be stopped');
  } else {
    console.log('Existing chat service process stopped');
  }
  
  // Start the chat service
  console.log('Starting chat service with updated code...');
  const serverPath = path.join(__dirname, 'server.js');
  
  const chatService = spawn('node', [serverPath], {
    detached: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DEBUG: 'kafka*'  // Enable Kafka debugging
    },
    windowsHide: false,
    windowsVerbatimArguments: true
  });
  
  chatService.on('error', (err) => {
    console.error('Failed to start chat service:', err);
  });
  
  chatService.unref();
  console.log('Chat service started successfully');
}); 