/**
 * Simple appointment test that explicitly sets user_id and agent_id
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

// Create a test appointment with EXPLICITLY set required fields
const createTestAppointment = () => {
  // Create a future date for a Monday (weekday) at 10:00 AM
  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + 1); // Tomorrow
  
  // Make sure it's a weekday (Monday-Friday, where 1-5 are day numbers)
  while(appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
    appointmentDate.setDate(appointmentDate.getDate() + 1);
  }
  
  appointmentDate.setHours(10, 0, 0, 0);

  // TEST DATA - Notice that we're explicitly setting ALL required fields
  // with non-empty values
  const appointmentData = {
    property_id: "681945a85c7b8a858717f024", // Use the property ID from your error message
    user_id: "explicit-user-12345",    // EXPLICITLY set non-empty value
    agent_id: "explicit-agent-67890",  // EXPLICITLY set non-empty value
    date_time: appointmentDate.toISOString(),
    duration: 60,
    type: "viewing",
    message: "This is a test with explicit user_id and agent_id",
    status: "pending" // EXPLICITLY set non-empty value
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