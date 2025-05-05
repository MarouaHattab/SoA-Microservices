const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
const Appointment = require('./models/Appointment');
require('dotenv').config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-appointment', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
  process.exit(1);
});

// Connexion à Kafka
const kafka = new Kafka({
  clientId: 'appointment-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();
producer.connect().then(() => {
  console.log('Connected to Kafka');
}).catch(err => {
  console.error('Failed to connect to Kafka', err);
});

// Chargement du fichier proto
const PROTO_PATH = '../../proto/appointment.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const appointmentProto = grpc.loadPackageDefinition(packageDefinition).appointment;

// Implémentation des méthodes du service
const server = new grpc.Server();

server.addService(appointmentProto.AppointmentService.service, {
  // Récupérer un rendez-vous par ID
  getAppointment: async (call, callback) => {
    try {
      const appointment = await Appointment.findById(call.request.id);
      if (!appointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      const formattedAppointment = {
        id: appointment._id.toString(),
        property_id: appointment.property_id,
        user_id: appointment.user_id,
        agent_id: appointment.agent_id,
        date_time: appointment.date_time.toISOString(),
        status: appointment.status,
        notes: appointment.notes,
        created_at: appointment.createdAt.toISOString(),
        updated_at: appointment.updatedAt.toISOString()
      };
      
      callback(null, { appointment: formattedAppointment });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Récupérer les rendez-vous d'un utilisateur
  getUserAppointments: async (call, callback) => {
    try {
      const appointments = await Appointment.find({ 
        $or: [
          { user_id: call.request.user_id },
          { agent_id: call.request.user_id }
        ]
      }).sort({ date_time: 1 });
      
      const formattedAppointments = appointments.map(appointment => ({
        id: appointment._id.toString(),
        property_id: appointment.property_id,
        user_id: appointment.user_id,
        agent_id: appointment.agent_id,
        date_time: appointment.date_time.toISOString(),
        status: appointment.status,
        notes: appointment.notes,
        created_at: appointment.createdAt.toISOString(),
        updated_at: appointment.updatedAt.toISOString()
      }));
      
      callback(null, { appointments: formattedAppointments });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Récupérer les rendez-vous d'une propriété
  getPropertyAppointments: async (call, callback) => {
    try {
      const appointments = await Appointment.find({ 
        property_id: call.request.property_id 
      }).sort({ date_time: 1 });
      
      const formattedAppointments = appointments.map(appointment => ({
        id: appointment._id.toString(),
        property_id: appointment.property_id,
        user_id: appointment.user_id,
        agent_id: appointment.agent_id,
        date_time: appointment.date_time.toISOString(),
        status: appointment.status,
        notes: appointment.notes,
        created_at: appointment.createdAt.toISOString(),
        updated_at: appointment.updatedAt.toISOString()
      }));
      
      callback(null, { appointments: formattedAppointments });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Créer un nouveau rendez-vous
  createAppointment: async (call, callback) => {
    try {
      const appointmentData = {
        ...call.request,
        date_time: new Date(call.request.date_time)
      };
      
      const newAppointment = new Appointment(appointmentData);
      const savedAppointment = await newAppointment.save();
      
      const formattedAppointment = {
        id: savedAppointment._id.toString(),
        property_id: savedAppointment.property_id,
        user_id: savedAppointment.user_id,
        agent_id: savedAppointment.agent_id,
        date_time: savedAppointment.date_time.toISOString(),
        status: savedAppointment.status,
        notes: savedAppointment.notes,
        created_at: savedAppointment.createdAt.toISOString(),
        updated_at: savedAppointment.updatedAt.toISOString()
      };
      
      // Publier un événement Kafka
      await producer.send({
        topic: 'appointment-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_CREATED',
              appointment: formattedAppointment
            }) 
          }
        ]
      });

      // Envoyer également une notification
      await producer.send({
        topic: 'notification-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_NOTIFICATION',
              type: 'new_appointment',
              user_id: savedAppointment.user_id,
              agent_id: savedAppointment.agent_id,
              property_id: savedAppointment.property_id,
              appointment_id: savedAppointment._id.toString(),
              date_time: savedAppointment.date_time.toISOString(),
              message: `Nouveau rendez-vous programmé pour le ${new Date(savedAppointment.date_time).toLocaleString()}`
            }) 
          }
        ]
      });
      
      callback(null, { appointment: formattedAppointment });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Mettre à jour un rendez-vous
  updateAppointment: async (call, callback) => {
    try {
      const { id, ...appointmentData } = call.request;
      
      if (appointmentData.date_time) {
        appointmentData.date_time = new Date(appointmentData.date_time);
      }
      
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        appointmentData,
        { new: true }
      );
      
      if (!updatedAppointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      const formattedAppointment = {
        id: updatedAppointment._id.toString(),
        property_id: updatedAppointment.property_id,
        user_id: updatedAppointment.user_id,
        agent_id: updatedAppointment.agent_id,
        date_time: updatedAppointment.date_time.toISOString(),
        status: updatedAppointment.status,
        notes: updatedAppointment.notes,
        created_at: updatedAppointment.createdAt.toISOString(),
        updated_at: updatedAppointment.updatedAt.toISOString()
      };
      
      // Publier un événement Kafka
      await producer.send({
        topic: 'appointment-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_UPDATED',
              appointment: formattedAppointment
            }) 
          }
        ]
      });

      // Envoyer également une notification
      await producer.send({
        topic: 'notification-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_NOTIFICATION',
              type: 'updated_appointment',
              user_id: updatedAppointment.user_id,
              agent_id: updatedAppointment.agent_id,
              property_id: updatedAppointment.property_id,
              appointment_id: updatedAppointment._id.toString(),
              status: updatedAppointment.status,
              message: `Rendez-vous mis à jour - Statut: ${updatedAppointment.status}`
            }) 
          }
        ]
      });
      
      callback(null, { appointment: formattedAppointment });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Supprimer un rendez-vous
  deleteAppointment: async (call, callback) => {
    try {
      const deletedAppointment = await Appointment.findByIdAndDelete(call.request.id);
      
      if (!deletedAppointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      // Publier un événement Kafka
      await producer.send({
        topic: 'appointment-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_DELETED',
              appointment_id: call.request.id
            }) 
          }
        ]
      });

      // Envoyer également une notification
      await producer.send({
        topic: 'notification-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_NOTIFICATION',
              type: 'cancelled_appointment',
              user_id: deletedAppointment.user_id,
              agent_id: deletedAppointment.agent_id,
              property_id: deletedAppointment.property_id,
              appointment_id: deletedAppointment._id.toString(),
              message: `Rendez-vous du ${new Date(deletedAppointment.date_time).toLocaleString()} annulé`
            }) 
          }
        ]
      });
      
      callback(null, { 
        success: true,
        message: 'Appointment deleted successfully'
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  }
});

// Démarrer le serveur gRPC
const PORT = process.env.PORT || 50053;
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error('Failed to bind server:', error);
    return;
  }
  console.log(`Appointment service running on port ${port}`);
  server.start();
});

// Gérer la fermeture propre
process.on('SIGINT', async () => {
  console.log('Shutting down appointment service...');
  await producer.disconnect();
  await mongoose.disconnect();
  process.exit(0);
});