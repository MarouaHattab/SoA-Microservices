/**
 * Simple restart script for the appointment service
 */

const { exec } = require('child_process');

console.log('Restarting appointment service...');

// Try to kill any running instances
try {
  if (process.platform === 'win32') {
    exec('taskkill /f /im node.exe /fi "WINDOWTITLE eq Appointment Service"');
  } else {
    exec("pkill -f 'node.*appointment.*server\\.js'");
  }
  console.log('Stopped any running instances');
} catch (error) {
  console.log('No running instances found or could not be stopped');
}

// Start the server
console.log('Starting appointment service...');
exec('node server.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(`stdout: ${stdout}`);
});

console.log('Appointment service restarted!');
console.log('The service is now running with the simplified fix applied.'); 