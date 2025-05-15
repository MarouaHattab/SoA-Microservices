/**
 * Restart script for the appointment service
 */

const { exec } = require('child_process');

console.log('Restarting appointment service...');

// First kill any running instances
const killCommand = process.platform === 'win32' 
  ? 'taskkill /f /im node.exe /fi "WINDOWTITLE eq Appointment Service"'
  : "pkill -f 'node.*server\\.js'";

exec(killCommand, (error, stdout, stderr) => {
  if (error) {
    console.log('No previous instance running or could not kill it');
  } else {
    console.log('Killed previous instance');
  }
  
  console.log('Starting appointment service...');
  
  // Start the server in a new process
  const nodeProcess = exec('node server.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting server: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Server stderr: ${stderr}`);
    }
    console.log(`Server stdout: ${stdout}`);
  });
  
  nodeProcess.stdout.on('data', (data) => {
    console.log(`Server output: ${data}`);
  });
  
  nodeProcess.stderr.on('data', (data) => {
    console.error(`Server error: ${data}`);
  });
  
  console.log('Appointment service restarted!');
  console.log('You can now test appointment creation with the test script.');
}); 