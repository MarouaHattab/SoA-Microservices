/**
 * Script to restart the API gateway
 * 
 * This script will stop any running API gateway and start a new instance
 */

const { spawn, exec } = require('child_process');
const path = require('path');

// Log with timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Kill any existing API gateway process
log('Stopping any running API gateway processes...');
exec('taskkill /f /im node.exe /fi "WINDOWTITLE eq api-gateway"', (error, stdout, stderr) => {
  if (error) {
    log('No existing API gateway process found or could not be stopped');
  } else {
    log('Existing API gateway process stopped');
  }
  
  // Start the API gateway
  log('Starting API gateway with updated code...');
  const serverPath = path.join(__dirname, 'server.js');
  
  const apiGateway = spawn('node', [serverPath], {
    detached: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      SERVICE_NAME: 'api-gateway'
    }
  });
  
  apiGateway.on('error', (error) => {
    log(`Error starting API gateway: ${error.message}`);
  });
  
  apiGateway.unref();
  
  log('API gateway has been restarted!');
  log('Access the API at: http://localhost:3000/api');
}); 