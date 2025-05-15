/**
 * Debug script for appointment service communication
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the proto file
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

// Test data
const appointmentData = {
  property_id: "68192710c5b0f661a474f065", // Replace with a real property ID
  user_id: "5f8d0f1d9b0f5a001c2e1234",    // Replace with a real user ID
  agent_id: "5f8d0f1d9b0f5a001c2e4321",   // Replace with a real agent ID
  date_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days from now
  duration: 60,
  type: "viewing",
  message: "Test appointment from debug script",
  status: "pending"
};

console.log('Sending appointment data to appointment service:', JSON.stringify(appointmentData, null, 2));

// Attempt to create an appointment with all required fields
appointmentClient.CreateAppointment(appointmentData, (error, response) => {
  if (error) {
    console.error('Error creating appointment:', error.message);
    console.error('Error details:', error);
  } else {
    console.log('Appointment created successfully!');
    console.log('Response:', JSON.stringify(response, null, 2));
  }
}); 