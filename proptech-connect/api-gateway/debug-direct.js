/**
 * Direct debug script for appointment service
 * This bypasses the API gateway and connects directly to the appointment service
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the appointment proto file
const PROTO_PATH = path.join(__dirname, '..', 'proto', 'appointment.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const appointmentProto = grpc.loadPackageDefinition(packageDefinition).appointment;

// Create a gRPC client for the appointment service
const appointmentClient = new appointmentProto.AppointmentService(
  'localhost:50053',
  grpc.credentials.createInsecure()
);

// Create a test appointment with ALL required fields explicitly set
const createTestAppointment = () => {
  // Create a future date for a Monday (weekday) at 10:00 AM
  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + 1); // Tomorrow
  
  // Make sure it's a weekday (Monday-Friday, where 1-5 are day numbers)
  while(appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
    appointmentDate.setDate(appointmentDate.getDate() + 1);
  }
  
  appointmentDate.setHours(10, 0, 0, 0);

  // Hardcoded test data
  const appointmentData = {
    property_id: "68192710c5b0f661a474f065", // Use a valid property ID if possible
    user_id: "5f8d0f1d9b0f5a001c2e1234",    // Use a valid user ID if possible
    agent_id: "5f8d0f1d9b0f5a001c2e4321",   // Use a valid agent ID if possible
    date_time: appointmentDate.toISOString(),
    duration: 60,
    type: "viewing",
    message: "Test appointment from direct debug script",
    status: "pending" // Explicitly set status
  };

  console.log('Sending direct appointment request with DATA:', JSON.stringify(appointmentData, null, 2));

  // Call the CreateAppointment method directly
  appointmentClient.CreateAppointment(appointmentData, (error, response) => {
    if (error) {
      console.error('Error creating appointment:', error.message);
      console.error('Error details:', error);
    } else {
      console.log('Appointment created successfully!');
      console.log('Response:', JSON.stringify(response, null, 2));
    }
  });
};

// Execute the test
createTestAppointment(); 