const http = require('http');
const { exec } = require('child_process');

// API Gateway endpoint
const API_GATEWAY_URL = 'http://localhost:3000';

// Service health check endpoints (these should be implemented in your microservices)
const SERVICES = [
  { name: 'API Gateway', url: `${API_GATEWAY_URL}/health` },
  { name: 'User Service', url: `${API_GATEWAY_URL}/api/users/health` },
  { name: 'Property Service', url: `${API_GATEWAY_URL}/api/properties/health` },
  { name: 'Appointment Service', url: `${API_GATEWAY_URL}/api/appointments/health` },
  { name: 'Chat Service', url: `${API_GATEWAY_URL}/api/chat/health` },
  { name: 'Notification Service', url: `${API_GATEWAY_URL}/api/notifications/health` }
];

// Check if Docker containers are running
function checkDockerContainers() {
  return new Promise((resolve, reject) => {
    exec('docker ps', (error, stdout, stderr) => {
      if (error) {
        console.error('Error checking Docker containers:', error);
        return resolve(false);
      }
      
      console.log('\n--- Docker Containers ---');
      console.log(stdout);
      
      const services = [
        'proptech-connect_user-service',
        'proptech-connect_property-service',
        'proptech-connect_appointment-service',
        'proptech-connect_chat-service',
        'proptech-connect_notification-service',
        'proptech-connect_api-gateway'
      ];
      
      const allRunning = services.every(service => stdout.includes(service));
      
      if (!allRunning) {
        console.log('\nSome services are not running in Docker. Check docker-compose logs.');
      }
      
      resolve(allRunning);
    });
  });
}

// Check if a service is responding
function checkService(service) {
  return new Promise((resolve) => {
    const request = http.get(service.url, (res) => {
      const { statusCode } = res;
      
      if (statusCode === 200) {
        console.log(`✅ ${service.name}: Running`);
        resolve(true);
      } else {
        console.log(`❌ ${service.name}: Not healthy (Status: ${statusCode})`);
        resolve(false);
      }
      
      res.resume(); // Consume response to free up memory
    });
    
    request.on('error', (err) => {
      console.log(`❌ ${service.name}: Not running (${err.message})`);
      resolve(false);
    });
    
    request.setTimeout(5000, () => {
      request.abort();
      console.log(`❌ ${service.name}: Timeout`);
      resolve(false);
    });
  });
}

// Main function to check all services
async function checkAllServices() {
  console.log('🔍 Checking PropTech Connect services...\n');
  
  // First check Docker containers
  const containersRunning = await checkDockerContainers();
  
  console.log('\n--- Service Health Checks ---');
  
  // Check each service endpoint
  const results = await Promise.all(SERVICES.map(service => checkService(service)));
  const allServicesRunning = results.every(result => result === true);
  
  console.log('\n--- Summary ---');
  if (allServicesRunning) {
    console.log('✅ All services are running and healthy!');
    console.log('🚀 You can proceed with Postman testing.');
  } else {
    console.log('❌ Some services are not running or not healthy.');
    console.log('Please check the logs above and start all services before testing.');
  }
  
  return allServicesRunning;
}

// Run the check
checkAllServices().then(result => {
  process.exit(result ? 0 : 1);
}); 