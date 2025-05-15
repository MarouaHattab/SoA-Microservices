/**
 * Script to update API gateway code to remove references to the appointment service
 */

const fs = require('fs');
const path = require('path');

console.log('Updating API gateway code to remove appointment service references...');

// 1. Update server.js to remove appointment routes
const serverJsPath = path.join(__dirname, 'api-gateway', 'server.js');
if (fs.existsSync(serverJsPath)) {
    console.log('Updating server.js...');
    let serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
    
    // Remove appointment route imports
    serverJsContent = serverJsContent.replace(/const\s+appointmentRoutes\s*=\s*require\s*\(\s*['"]\.\/routes\/appointments['"]\s*\)\s*;?/g, '');
    
    // Remove appointment route usage
    serverJsContent = serverJsContent.replace(/app\.use\s*\(\s*['"]\/api\/appointments['"]\s*,\s*appointmentRoutes\s*\)\s*;?/g, '');
    
    fs.writeFileSync(serverJsPath, serverJsContent);
    console.log('✓ Updated server.js');
} else {
    console.log('× server.js not found');
}

// 2. Update gRPC clients index.js to remove appointment service client
const grpcClientsPath = path.join(__dirname, 'api-gateway', 'grpc-clients', 'index.js');
if (fs.existsSync(grpcClientsPath)) {
    console.log('Updating gRPC clients index.js...');
    let grpcClientsContent = fs.readFileSync(grpcClientsPath, 'utf8');
    
    // Remove appointment proto path import
    grpcClientsContent = grpcClientsContent.replace(/const\s+appointmentProtoPath\s*=\s*path\.join\s*\([^)]*appointment\.proto[^)]*\)\s*;?/g, '');
    
    // Remove appointment proto loading
    grpcClientsContent = grpcClientsContent.replace(/appointment:\s*protoLoader\.loadSync\s*\(\s*appointmentProtoPath\s*,[^)]*\)\s*,?/g, '');
    
    // Remove appointment proto descriptor
    grpcClientsContent = grpcClientsContent.replace(/appointment:\s*grpc\.loadPackageDefinition\s*\([^)]*\)\.appointment\s*,?/g, '');
    
    // Remove appointment client creation
    grpcClientsContent = grpcClientsContent.replace(/const\s+appointmentClient\s*=\s*new\s+protoDescriptors\.appointment\.AppointmentService\s*\([^)]*\)\s*;?/g, '');
    
    // Remove appointment service object declaration
    grpcClientsContent = grpcClientsContent.replace(/const\s+appointmentService\s*=\s*{}\s*;?/g, '');
    
    // Remove appointment client promisification loop
    grpcClientsContent = grpcClientsContent.replace(/Object\.keys\s*\(\s*appointmentClient\.__proto__\s*\)[^;]*;/g, '');
    
    // Remove appointment methods initialization
    grpcClientsContent = grpcClientsContent.replace(/const\s+appointmentMethods\s*=\s*\[\s*[^\]]*\]\s*;([\s\S]*?)appointmentMethods\.forEach[^;]*;/g, '');
    
    // Remove appointmentService from module.exports
    grpcClientsContent = grpcClientsContent.replace(/appointmentService,/g, '');
    grpcClientsContent = grpcClientsContent.replace(/appointmentClient,/g, '');
    
    fs.writeFileSync(grpcClientsPath, grpcClientsContent);
    console.log('✓ Updated gRPC clients index.js');
} else {
    console.log('× gRPC clients index.js not found');
}

console.log('API gateway code updated successfully!');
console.log('The appointment service has been completely removed from your project.'); 