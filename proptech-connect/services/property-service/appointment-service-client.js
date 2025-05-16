const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

// Load the appointment service proto file
const APPOINTMENT_PROTO_PATH = path.join(__dirname, '../../proto/appointment.proto');
const packageDefinition = protoLoader.loadSync(APPOINTMENT_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const appointmentProto = grpc.loadPackageDefinition(packageDefinition).appointment;

// Create the gRPC client
const appointmentClient = new appointmentProto.AppointmentService(
    process.env.APPOINTMENT_SERVICE_URL || 'localhost:50053',
    grpc.credentials.createInsecure()
);

// Create a safer version without promisify for now
module.exports = {
    // Simple stub functions that don't depend on the actual gRPC methods
    hasAppointment: async (userId, propertyId) => {
        console.log(`[STUB] Checking appointment for user ${userId} and property ${propertyId}`);
        return false; // Default implementation returning false
    },

    getAppointmentsForProperty: async (propertyId) => {
        console.log(`[STUB] Getting appointments for property ${propertyId}`);
        return []; // Default implementation returning empty array
    },
    
    // Add the missing getUserPropertyAppointmentsAsync method
    getUserPropertyAppointmentsAsync: async (params) => {
        console.log(`[STUB] getUserPropertyAppointmentsAsync called with:`, params);
        return { 
            appointments: [],
            total_count: 0
        }; // Return empty appointments array as a stub
    }
};