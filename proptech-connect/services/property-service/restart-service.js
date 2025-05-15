/**
 * Script to restart the property service
 * 
 * This script will stop any running property service and start a new instance
 * with the updated code to properly handle favorites and reviews.
 */

const { spawn, exec } = require('child_process');
const path = require('path');

// Kill any existing property service process
console.log('Stopping any running property service...');
exec('taskkill /f /im node.exe /fi "WINDOWTITLE eq property-service"', (error, stdout, stderr) => {
  if (error) {
    console.log('No existing property service process found or could not be stopped');
  } else {
    console.log('Existing property service process stopped');
  }
  
  // Start the property service
  console.log('Starting property service with updated code...');
  const serverPath = path.join(__dirname, 'server.js');
  
  const propertyService = spawn('node', [serverPath], {
    detached: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DEBUG: 'property*'  // Enable property service debugging
    },
    windowsHide: false,
    windowsVerbatimArguments: true
  });
  
  propertyService.on('error', (err) => {
    console.error('Failed to start property service:', err);
  });
  
  propertyService.unref();
  console.log('Property service started successfully');
}); 