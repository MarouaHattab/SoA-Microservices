/**
 * Restart script for the API gateway 
 */

const { exec } = require('child_process');

console.log('Restarting API gateway...');

// First kill any running instances
const killCommand = process.platform === 'win32' 
  ? 'taskkill /f /im node.exe /fi "WINDOWTITLE eq API Gateway"'
  : "pkill -f 'node.*server\\.js'";

exec(killCommand, (error, stdout, stderr) => {
  if (error) {
    console.log('No previous instance running or could not kill it');
  } else {
    console.log('Killed previous instance');
  }
  
  console.log('Starting API gateway...');
  
  // Start the server in a new process
  const nodeProcess = exec('node server.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting API gateway: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`API gateway stderr: ${stderr}`);
    }
    console.log(`API gateway stdout: ${stdout}`);
  });
  
  nodeProcess.stdout.on('data', (data) => {
    console.log(`API gateway output: ${data}`);
  });
  
  nodeProcess.stderr.on('data', (data) => {
    console.error(`API gateway error: ${data}`);
  });
  
  console.log('API gateway restarted!');
  console.log('Apply the gRPC client fix:');
  console.log('  node fix-grpc-client.js');
  console.log('Then you can test appointment creation with:');
  console.log('  node test-fixed-appointments.js');
}); 