// Mise à jour du server.js pour le service d'appointement
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

// Fonction d'utilitaire pour valider les dates
const validateAppointmentDate = (date) => {
  const appointmentDate = new Date(date);
  const now = new Date();
  
  // Vérifier que la date est dans le futur
  if (appointmentDate <= now) {
    return {
      valid: false,
      message: 'La date du rendez-vous doit être dans le futur'
    };
  }
  
  // Vérifier que la date n'est pas trop éloignée (ex: max 3 mois)
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(now.getMonth() + 3);
  if (appointmentDate > threeMonthsLater) {
    return {
      valid: false,
      message: 'La date du rendez-vous ne peut pas être plus de 3 mois dans le futur'
    };
  }
  
  // Vérifier que le rendez-vous est durant les heures de travail (9h-18h)
  const hours = appointmentDate.getHours();
  if (hours < 9 || hours >= 18) {
    return {
      valid: false,
      message: 'Les rendez-vous ne peuvent être pris qu\'entre 9h et 18h'
    };
  }
  
  // Vérifier que ce n'est pas le weekend
  const day = appointmentDate.getDay();
  if (day === 0 || day === 6) {
    return {
      valid: false,
      message: 'Les rendez-vous ne peuvent pas être pris le weekend'
    };
  }
  
  return { valid: true };
};

// Fonction pour notifier les participants
const notifyParticipants = async (appointmentId, type, recipients) => {
  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return;
    
    // Construire le message selon le type
    let title, content, notificationType, priority;
    
    switch (type) {
      case 'created':
        title = 'Nouveau rendez-vous';
        content = `Nouveau rendez-vous programmé pour le ${new Date(appointment.date_time).toLocaleString()}`;
        notificationType = 'new_appointment';
        priority = 'NORMAL';
        break;
      case 'confirmed':
        title = 'Rendez-vous confirmé';
        content = `Votre rendez-vous du ${new Date(appointment.date_time).toLocaleString()} a été confirmé`;
        notificationType = 'appointment_confirmed';
        priority = 'NORMAL';
        break;
      case 'rejected':
        title = 'Rendez-vous refusé';
        content = `Votre rendez-vous du ${new Date(appointment.date_time).toLocaleString()} a été refusé: ${appointment.rejection_reason || 'Aucune raison fournie'}`;
        notificationType = 'appointment_rejected';
        priority = 'HIGH';
        break;
      case 'rescheduled':
        title = 'Proposition de report de rendez-vous';
        content = `Proposition de report pour le rendez-vous initialement prévu le ${new Date(appointment.date_time).toLocaleString()}. Nouvelle date proposée: ${new Date(appointment.reschedule_proposed).toLocaleString()}`;
        notificationType = 'appointment_rescheduled';
        priority = 'HIGH';
        break;
      case 'reminder':
        title = 'Rappel de rendez-vous';
        content = `Rappel: vous avez un rendez-vous demain à ${new Date(appointment.date_time).toLocaleString()}`;
        notificationType = 'appointment_reminder';
        priority = 'NORMAL';
        break;
      default:
        title = 'Mise à jour de rendez-vous';
        content = `Mise à jour pour votre rendez-vous du ${new Date(appointment.date_time).toLocaleString()}`;
        notificationType = 'appointment_update';
        priority = 'NORMAL';
    }
    
    // Envoyer des notifications à tous les destinataires
    for (const recipientId of recipients) {
      await producer.send({
        topic: 'notification-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_NOTIFICATION',
              type: notificationType,
              user_id: recipientId,
              appointment_id: appointmentId,
              title,
              content,
              priority,
              requires_action: ['created', 'rescheduled'].includes(type)
            }) 
          }
        ]
      });
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
};

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
        owner_response: appointment.owner_response || '',
        reschedule_proposed: appointment.reschedule_proposed ? appointment.reschedule_proposed.toISOString() : null,
        reschedule_reason: appointment.reschedule_reason || '',
        rejection_reason: appointment.rejection_reason || '',
        feedback: appointment.feedback || '',
        feedback_rating: appointment.feedback_rating || 0,
        history: appointment.history ? appointment.history.map(h => ({
          status: h.status,
          date_time: h.date_time ? h.date_time.toISOString() : null,
          changed_by: h.changed_by,
          changed_at: h.changed_at.toISOString(),
          notes: h.notes || ''
        })) : [],
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
      const { user_id, status, from_date, to_date, page = 1, limit = 20 } = call.request;
      
      // Construire la requête avec filtres optionnels
      const query = { 
        $or: [
          { user_id },
          { agent_id: user_id }
        ]
      };
      
      if (status) {
        query.status = status;
      }
      
      if (from_date || to_date) {
        query.date_time = {};
        if (from_date) {
          query.date_time.$gte = new Date(from_date);
        }
        if (to_date) {
          query.date_time.$lte = new Date(to_date);
        }
      }
      
      const skip = (page - 1) * limit;
      
      const [appointments, total] = await Promise.all([
        Appointment.find(query)
          .sort({ date_time: 1 })
          .skip(skip)
          .limit(limit),
        Appointment.countDocuments(query)
      ]);
      
      const formattedAppointments = appointments.map(appointment => ({
        id: appointment._id.toString(),
        property_id: appointment.property_id,
        user_id: appointment.user_id,
        agent_id: appointment.agent_id,
        date_time: appointment.date_time.toISOString(),
        status: appointment.status,
        notes: appointment.notes,
        owner_response: appointment.owner_response || '',
        reschedule_proposed: appointment.reschedule_proposed ? appointment.reschedule_proposed.toISOString() : null,
        reschedule_reason: appointment.reschedule_reason || '',
        rejection_reason: appointment.rejection_reason || '',
        created_at: appointment.createdAt.toISOString(),
        updated_at: appointment.updatedAt.toISOString()
      }));
      
      callback(null, { 
        appointments: formattedAppointments,
        total,
        page,
        limit
      });
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
      const { property_id, status, from_date, to_date, page = 1, limit = 20 } = call.request;
      
      // Construire la requête avec filtres optionnels
      const query = { property_id };
      
      if (status) {
        query.status = status;
      }
      
      if (from_date || to_date) {
        query.date_time = {};
        if (from_date) {
          query.date_time.$gte = new Date(from_date);
        }
        if (to_date) {
          query.date_time.$lte = new Date(to_date);
        }
      }
      
      const skip = (page - 1) * limit;
      
      const [appointments, total] = await Promise.all([
        Appointment.find(query)
          .sort({ date_time: 1 })
          .skip(skip)
          .limit(limit),
        Appointment.countDocuments(query)
      ]);
      
      const formattedAppointments = appointments.map(appointment => ({
        id: appointment._id.toString(),
        property_id: appointment.property_id,
        user_id: appointment.user_id,
        agent_id: appointment.agent_id,
        date_time: appointment.date_time.toISOString(),
        status: appointment.status,
        notes: appointment.notes,
        owner_response: appointment.owner_response || '',
        reschedule_proposed: appointment.reschedule_proposed ? appointment.reschedule_proposed.toISOString() : null,
        reschedule_reason: appointment.reschedule_reason || '',
        rejection_reason: appointment.rejection_reason || '',
        created_at: appointment.createdAt.toISOString(),
        updated_at: appointment.updatedAt.toISOString()
      }));
      
      callback(null, { 
        appointments: formattedAppointments,
        total,
        limit,
        page
      });
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
      
      // Valider la date du rendez-vous
      const validation = validateAppointmentDate(appointmentData.date_time);
      if (!validation.valid) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: validation.message
        });
      }
      
      // Vérifier les conflits potentiels
      const conflictQuery = {
        property_id: appointmentData.property_id,
        date_time: {
          $gte: new Date(appointmentData.date_time.getTime() - 30 * 60000), // 30 min avant
          $lte: new Date(appointmentData.date_time.getTime() + 30 * 60000)  // 30 min après
        },
        status: { $in: ['pending', 'confirmed'] }
      };
      
      const existingAppointment = await Appointment.findOne(conflictQuery);
      if (existingAppointment) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: `Un rendez-vous existe déjà à l'heure demandée. Veuillez choisir un autre créneau.`
        });
      }
      
      // Ajouter l'historique initial
      appointmentData.history = [{
        status: 'pending',
        date_time: appointmentData.date_time,
        changed_by: appointmentData.user_id,
        notes: 'Rendez-vous créé'
      }];
      
      // Planifier un rappel automatique pour la veille du rendez-vous
      const reminderDate = new Date(appointmentData.date_time);
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(10, 0, 0, 0); // 10:00 AM
      
      appointmentData.reminder_scheduled_at = reminderDate;
      
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

      // Notifier le propriétaire/agent
      await notifyParticipants(
        savedAppointment._id.toString(),
        'created',
        [savedAppointment.agent_id, savedAppointment.user_id]
      );
      
      callback(null, { appointment: formattedAppointment });
    } catch (error) {
      console.error('Error in CreateAppointment:', error);
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
      
      // Récupérer le rendez-vous existant
      const existingAppointment = await Appointment.findById(id);
      
      if (!existingAppointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      // Si la date change, la valider
      if (appointmentData.date_time) {
        appointmentData.date_time = new Date(appointmentData.date_time);
        const validation = validateAppointmentDate(appointmentData.date_time);
        if (!validation.valid) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: validation.message
          });
        }
        
        // Vérifier les conflits potentiels (sauf pour le rendez-vous en cours de modification)
        const conflictQuery = {
          _id: { $ne: id },
          property_id: existingAppointment.property_id,
          date_time: {
            $gte: new Date(appointmentData.date_time.getTime() - 30 * 60000), // 30 min avant
            $lte: new Date(appointmentData.date_time.getTime() + 30 * 60000)  // 30 min après
          },
          status: { $in: ['pending', 'confirmed'] }
        };
        
        const conflictingAppointment = await Appointment.findOne(conflictQuery);
        if (conflictingAppointment) {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            message: `Un rendez-vous existe déjà à l'heure demandée. Veuillez choisir un autre créneau.`
          });
        }
      }
      
      // Ajouter une entrée à l'historique
      const historyEntry = {
        status: appointmentData.status || existingAppointment.status,
        date_time: appointmentData.date_time || existingAppointment.date_time,
        changed_by: appointmentData.changed_by || existingAppointment.user_id,
        notes: appointmentData.notes || 'Mise à jour du rendez-vous'
      };
      
      // Mettre à jour le rendez-vous
      const updateData = {
        ...appointmentData,
        $push: { history: historyEntry }
      };
      
      delete updateData.changed_by; // Supprimer ce champ qui ne fait pas partie du modèle
      
      // Gérer spécifiquement le statut 'rejected'
      if (appointmentData.status === 'rejected' && appointmentData.rejection_reason) {
        updateData.rejection_reason = appointmentData.rejection_reason;
      }
      
      // Gérer spécifiquement le statut 'rescheduled'
      if (appointmentData.status === 'rescheduled' && appointmentData.reschedule_proposed) {
        updateData.reschedule_proposed = new Date(appointmentData.reschedule_proposed);
        updateData.reschedule_reason = appointmentData.reschedule_reason || 'Aucune raison fournie';
      }
      
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
      
      const formattedAppointment = {
        id: updatedAppointment._id.toString(),
        property_id: updatedAppointment.property_id,
        user_id: updatedAppointment.user_id,
        agent_id: updatedAppointment.agent_id,
        date_time: updatedAppointment.date_time.toISOString(),
        status: updatedAppointment.status,
        notes: updatedAppointment.notes,
        owner_response: updatedAppointment.owner_response || '',
        reschedule_proposed: updatedAppointment.reschedule_proposed ? updatedAppointment.reschedule_proposed.toISOString() : null,
        reschedule_reason: updatedAppointment.reschedule_reason || '',
        rejection_reason: updatedAppointment.rejection_reason || '',
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

      // Notifier les participants selon la mise à jour
      let notificationType = 'updated';
      
      if (appointmentData.status === 'confirmed') {
        notificationType = 'confirmed';
      } else if (appointmentData.status === 'rejected') {
        notificationType = 'rejected';
      } else if (appointmentData.status === 'rescheduled') {
        notificationType = 'rescheduled';
      }
      
      await notifyParticipants(
        updatedAppointment._id.toString(),
        notificationType,
        [updatedAppointment.user_id, updatedAppointment.agent_id]
      );
      
      callback(null, { appointment: formattedAppointment });
    } catch (error) {
      console.error('Error in UpdateAppointment:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Répondre à un rendez-vous (accepter, rejeter ou proposer un report)
  respondToAppointment: async (call, callback) => {
    try {
      const { id, response, reason, proposed_date, responder_id } = call.request;
      
      // Vérifier que le rendez-vous existe
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      // Vérifier que le répondant est le propriétaire ou l'agent
      if (appointment.agent_id !== responder_id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only the agent can respond to appointment requests'
        });
      }
      
      // Vérifier que le rendez-vous est en attente
      if (appointment.status !== 'pending') {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: `Cannot respond to appointment with status: ${appointment.status}`
        });
      }
      
      let updateData = {};
      let notificationType = '';
      
      // Traiter selon la réponse
      switch (response) {
        case 'confirm':
          updateData = {
            status: 'confirmed',
            owner_response: 'Rendez-vous confirmé'
          };
          notificationType = 'confirmed';
          break;
          
        case 'reject':
          if (!reason) {
            return callback({
              code: grpc.status.INVALID_ARGUMENT,
              message: 'Reason is required when rejecting an appointment'
            });
          }
          
          updateData = {
            status: 'rejected',
            owner_response: 'Rendez-vous refusé',
            rejection_reason: reason
          };
          notificationType = 'rejected';
          break;
          
        case 'reschedule':
          if (!proposed_date) {
            return callback({
              code: grpc.status.INVALID_ARGUMENT,
              message: 'Proposed date is required when rescheduling an appointment'
            });
          }
          
          // Valider la nouvelle date
          const newDate = new Date(proposed_date);
          const validation = validateAppointmentDate(newDate);
          if (!validation.valid) {
            return callback({
              code: grpc.status.INVALID_ARGUMENT,
              message: validation.message
            });
          }
          
          updateData = {
            status: 'rescheduled',
            owner_response: 'Proposition de report',
            reschedule_proposed: newDate,
            reschedule_reason: reason || 'Aucune raison fournie'
          };
          notificationType = 'rescheduled';
          break;
          
        default:
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Invalid response type. Must be "confirm", "reject", or "reschedule"'
          });
      }
      
      // Ajouter une entrée à l'historique
      const historyEntry = {
        status: updateData.status,
        date_time: updateData.reschedule_proposed || appointment.date_time,
        changed_by: responder_id,
        changed_at: new Date(),
        notes: updateData.owner_response + (reason ? `: ${reason}` : '')
      };
      
      updateData.$push = { history: historyEntry };
      
      // Mettre à jour le rendez-vous
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
      
      // Notifier le demandeur du rendez-vous
      await notifyParticipants(
        updatedAppointment._id.toString(),
        notificationType,
        [updatedAppointment.user_id]
      );
      
      // Formater la réponse
      const formattedAppointment = {
        id: updatedAppointment._id.toString(),
        property_id: updatedAppointment.property_id,
        user_id: updatedAppointment.user_id,
        agent_id: updatedAppointment.agent_id,
        date_time: updatedAppointment.date_time.toISOString(),
        status: updatedAppointment.status,
        notes: updatedAppointment.notes,
        owner_response: updatedAppointment.owner_response,
        reschedule_proposed: updatedAppointment.reschedule_proposed ? updatedAppointment.reschedule_proposed.toISOString() : null,
        reschedule_reason: updatedAppointment.reschedule_reason || '',
        rejection_reason: updatedAppointment.rejection_reason || '',
        created_at: updatedAppointment.createdAt.toISOString(),
        updated_at: updatedAppointment.updatedAt.toISOString()
      };
      
      callback(null, { appointment: formattedAppointment });
    } catch (error) {
      console.error('Error in RespondToAppointment:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Accepter une proposition de report
  acceptReschedule: async (call, callback) => {
    try {
      const { id, user_id } = call.request;
      
      // Vérifier que le rendez-vous existe
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      // Vérifier que l'utilisateur est bien le demandeur du rendez-vous
      if (appointment.user_id !== user_id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only the appointment requester can accept reschedule proposals'
        });
      }
      
      // Vérifier que le rendez-vous est bien en statut 'rescheduled'
      if (appointment.status !== 'rescheduled') {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: `Cannot accept reschedule for appointment with status: ${appointment.status}`
        });
      }
      
      // Vérifier qu'une date a bien été proposée
      if (!appointment.reschedule_proposed) {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: 'No reschedule date has been proposed'
        });
      }
      
      // Mettre à jour le rendez-vous avec la nouvelle date
      const newDate = appointment.reschedule_proposed;
      
      // Ajouter une entrée à l'historique
      const historyEntry = {
        status: 'confirmed',
        date_time: newDate,
        changed_by: user_id,
        changed_at: new Date(),
        notes: 'Report de rendez-vous accepté'
      };
      
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          status: 'confirmed',
          date_time: newDate,
          $unset: { reschedule_proposed: "", reschedule_reason: "" },
          $push: { history: historyEntry }
        },
        { new: true }
      );
      
      // Notifier l'agent que le report a été accepté
      await notifyParticipants(
        updatedAppointment._id.toString(),
        'confirmed',
        [updatedAppointment.agent_id]
      );
      
      // Formater la réponse
      const formattedAppointment = {
        id: updatedAppointment._id.toString(),
        property_id: updatedAppointment.property_id,
        user_id: updatedAppointment.user_id,
        agent_id: updatedAppointment.agent_id,
        date_time: updatedAppointment.date_time.toISOString(),
        status: updatedAppointment.status,
        notes: updatedAppointment.notes,
        owner_response: updatedAppointment.owner_response,
        created_at: updatedAppointment.createdAt.toISOString(),
        updated_at: updatedAppointment.updatedAt.toISOString()
      };
      
      callback(null, { appointment: formattedAppointment });
    } catch (error) {
      console.error('Error in AcceptReschedule:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Refuser une proposition de report
  declineReschedule: async (call, callback) => {
    try {
      const { id, user_id, reason } = call.request;
      
      // Vérifier que le rendez-vous existe
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      // Vérifier que l'utilisateur est bien le demandeur du rendez-vous
      if (appointment.user_id !== user_id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only the appointment requester can decline reschedule proposals'
        });
      }
      
      // Vérifier que le rendez-vous est bien en statut 'rescheduled'
      if (appointment.status !== 'rescheduled') {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: `Cannot decline reschedule for appointment with status: ${appointment.status}`
        });
      }
      
      // Ajouter une entrée à l'historique
      const historyEntry = {
        status: 'pending', // Revenir à l'état en attente
        date_time: appointment.date_time,
        changed_by: user_id,
        changed_at: new Date(),
        notes: 'Proposition de report refusée: ' + (reason || 'Aucune raison fournie')
      };
      
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          status: 'pending',
          $unset: { reschedule_proposed: "", reschedule_reason: "" },
          $push: { history: historyEntry }
        },
        { new: true }
      );
      
      // Notifier l'agent que le report a été refusé
      await producer.send({
        topic: 'notification-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_NOTIFICATION',
              type: 'reschedule_declined',
              user_id: updatedAppointment.agent_id,
              appointment_id: updatedAppointment._id.toString(),
              title: 'Report refusé',
              content: `La proposition de report pour le rendez-vous du ${new Date(updatedAppointment.date_time).toLocaleString()} a été refusée: ${reason || 'Aucune raison fournie'}`,
              priority: 'HIGH',
              requires_action: true
            }) 
          }
        ]
      });
      
      // Formater la réponse
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
      
      callback(null, { appointment: formattedAppointment });
    } catch (error) {
      console.error('Error in DeclineReschedule:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Ajouter un retour sur le rendez-vous
  addFeedback: async (call, callback) => {
    try {
      const { id, user_id, rating, feedback } = call.request;
      
      // Vérifier que le rendez-vous existe
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      // Vérifier que l'utilisateur est bien le demandeur du rendez-vous
      if (appointment.user_id !== user_id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only the appointment requester can add feedback'
        });
      }
      
      // Vérifier que le rendez-vous est bien terminé
      if (appointment.status !== 'completed') {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: `Cannot add feedback for appointment with status: ${appointment.status}`
        });
      }
      
      // Vérifier la note
      if (rating < 1 || rating > 5) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Rating must be between 1 and 5'
        });
      }
      
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          feedback_rating: rating,
          feedback: feedback || ''
        },
        { new: true }
      );
      
      // Notifier l'agent du retour
      await producer.send({
        topic: 'notification-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_NOTIFICATION',
              type: 'feedback_received',
              user_id: updatedAppointment.agent_id,
              appointment_id: updatedAppointment._id.toString(),
              title: 'Retour sur rendez-vous',
              content: `Vous avez reçu un retour sur le rendez-vous du ${new Date(updatedAppointment.date_time).toLocaleString()}. Note: ${rating}/5`,
              priority: 'NORMAL'
            }) 
          }
        ]
      });
      
      // Formater la réponse
      const formattedAppointment = {
        id: updatedAppointment._id.toString(),
        property_id: updatedAppointment.property_id,
        user_id: updatedAppointment.user_id,
        agent_id: updatedAppointment.agent_id,
        date_time: updatedAppointment.date_time.toISOString(),
        status: updatedAppointment.status,
        notes: updatedAppointment.notes,
        feedback: updatedAppointment.feedback,
        feedback_rating: updatedAppointment.feedback_rating,
        created_at: updatedAppointment.createdAt.toISOString(),
        updated_at: updatedAppointment.updatedAt.toISOString()
      };
      
      callback(null, { appointment: formattedAppointment });
    } catch (error) {
      console.error('Error in AddFeedback:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Marquer un rendez-vous comme terminé
  completeAppointment: async (call, callback) => {
    try {
      const { id, completed_by } = call.request;
      
      // Vérifier que le rendez-vous existe
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      // Vérifier que l'utilisateur a le droit de marquer le rendez-vous comme terminé
      if (appointment.user_id !== completed_by && appointment.agent_id !== completed_by) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only the appointment requester or agent can mark it as completed'
        });
      }
      
      // Vérifier que le rendez-vous est bien confirmé
      if (appointment.status !== 'confirmed') {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: `Cannot complete appointment with status: ${appointment.status}`
        });
      }
      
      // Ajouter une entrée à l'historique
      const historyEntry = {
        status: 'completed',
        date_time: appointment.date_time,
        changed_by: completed_by,
        changed_at: new Date(),
        notes: 'Rendez-vous marqué comme terminé'
      };
      
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          status: 'completed',
          $push: { history: historyEntry }
        },
        { new: true }
      );
      
      // Notifier les participants
      const recipientId = completed_by === appointment.user_id ? appointment.agent_id : appointment.user_id;
      await producer.send({
        topic: 'notification-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_NOTIFICATION',
              type: 'appointment_completed',
              user_id: recipientId,
              appointment_id: updatedAppointment._id.toString(),
              title: 'Rendez-vous terminé',
              content: `Le rendez-vous du ${new Date(updatedAppointment.date_time).toLocaleString()} a été marqué comme terminé`,
              priority: 'NORMAL'
            }) 
          }
        ]
      });
      
      // Si l'utilisateur a terminé le rendez-vous, lui envoyer une demande de feedback
      if (completed_by === appointment.user_id) {
        await producer.send({
          topic: 'notification-events',
          messages: [
            { 
              value: JSON.stringify({
                event: 'APPOINTMENT_NOTIFICATION',
                type: 'feedback_request',
                user_id: appointment.user_id,
                appointment_id: updatedAppointment._id.toString(),
                title: 'Comment s\'est passé votre rendez-vous?',
                content: `Merci de nous donner votre avis sur votre visite du ${new Date(updatedAppointment.date_time).toLocaleString()}`,
                priority: 'NORMAL',
                requires_action: true
              }) 
            }
          ]
        });
      }
      
      // Formater la réponse
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
      
      callback(null, { appointment: formattedAppointment });
    } catch (error) {
      console.error('Error in CompleteAppointment:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Supprimer un rendez-vous
  deleteAppointment: async (call, callback) => {
    try {
      const { id, user_id } = call.request;
      
      // Vérifier que le rendez-vous existe
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      // Vérifier que l'utilisateur a le droit de supprimer le rendez-vous
      const isUser = appointment.user_id === user_id;
      const isAgent = appointment.agent_id === user_id;
      
      if (!isUser && !isAgent) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Not authorized to delete this appointment'
        });
      }
      
      // Si le statut est 'confirmed' et que la date du rendez-vous approche, empêcher la suppression
      if (appointment.status === 'confirmed') {
        const now = new Date();
        const appointmentDate = new Date(appointment.date_time);
        const timeDifference = appointmentDate.getTime() - now.getTime();
        const hoursDifference = timeDifference / (1000 * 60 * 60);
        
        // Si moins de 24h avant le rendez-vous, empêcher la suppression
        if (hoursDifference < 24) {
          return callback({
            code: grpc.status.FAILED_PRECONDITION,
            message: 'Cannot delete a confirmed appointment less than 24 hours before the scheduled time'
          });
        }
      }
      
      // Marquer comme annulé plutôt que de supprimer
      const cancelledAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          status: 'cancelled',
          $push: { 
            history: {
              status: 'cancelled',
              date_time: appointment.date_time,
              changed_by: user_id,
              changed_at: new Date(),
              notes: `Rendez-vous annulé par ${isUser ? 'le demandeur' : 'l\'agent'}`
            }
          }
        },
        { new: true }
      );
      
      // Notifier l'autre partie
      const recipientId = isUser ? appointment.agent_id : appointment.user_id;
      await producer.send({
        topic: 'notification-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'APPOINTMENT_NOTIFICATION',
              type: 'appointment_cancelled',
              user_id: recipientId,
              appointment_id: id,
              title: 'Rendez-vous annulé',
              content: `Le rendez-vous du ${new Date(appointment.date_time).toLocaleString()} a été annulé par ${isUser ? 'le demandeur' : 'l\'agent'}`,
              priority: 'HIGH'
            }) 
          }
        ]
      });
      
      callback(null, { 
        success: true,
        message: 'Appointment cancelled successfully'
      });
    } catch (error) {
      console.error('Error in DeleteAppointment:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Envoyer un rappel de rendez-vous
  sendAppointmentReminder: async (call, callback) => {
    try {
      const { id } = call.request;
      
      // Vérifier que le rendez-vous existe
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Appointment not found'
        });
      }
      
      // Vérifier que le rendez-vous est confirmé
      if (appointment.status !== 'confirmed') {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: `Cannot send reminder for appointment with status: ${appointment.status}`
        });
      }
      
      // Vérifier que le rappel n'a pas déjà été envoyé
      if (appointment.reminder_sent) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'Reminder already sent for this appointment'
        });
      }
      
      // Marquer le rappel comme envoyé
      await Appointment.findByIdAndUpdate(
        id,
        {
          reminder_sent: true
        }
      );
      
      // Envoyer les notifications aux deux parties
      await notifyParticipants(
        appointment._id.toString(),
        'reminder',
        [appointment.user_id, appointment.agent_id]
      );
      
      callback(null, { 
        success: true,
        message: 'Reminder sent successfully'
      });
    } catch (error) {
      console.error('Error in SendAppointmentReminder:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Obtenir les statistiques des rendez-vous
  getAppointmentStats: async (call, callback) => {
    try {
      const { user_id, period } = call.request;
      
      // Définir la plage de dates en fonction de la période
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 1); // Par défaut 1 mois
      }
      
      // Construire la requête de base
      const baseQuery = {
        date_time: {
          $gte: startDate,
          $lte: now
        }
      };
      
      // Ajouter le filtre utilisateur si fourni
      if (user_id) {
        baseQuery.$or = [
          { user_id },
          { agent_id: user_id }
        ];
      }
      
      // Agréger les statistiques
      const stats = await Appointment.aggregate([
        { $match: baseQuery },
        { $group: {
          _id: "$status",
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } }
      ]);
      
      // Calculer le total
      const total = stats.reduce((sum, stat) => sum + stat.count, 0);
      
      // Convertir en format attendu
      const statusStats = stats.map(stat => ({
        status: stat._id,
        count: stat.count,
        percentage: total > 0 ? Math.round((stat.count / total) * 100) : 0
      }));
      
      // Obtenir la distribution des rendez-vous par jour de la semaine
      const dayOfWeekStats = await Appointment.aggregate([
        { $match: baseQuery },
        { $group: {
          _id: { $dayOfWeek: "$date_time" }, // 1 pour dimanche, 2 pour lundi, etc.
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]);
      
      // Carte pour convertir les jours de la semaine
      const dayMap = {
        1: "Dimanche",
        2: "Lundi",
        3: "Mardi",
        4: "Mercredi",
        5: "Jeudi",
        6: "Vendredi",
        7: "Samedi"
      };
      
      // Formater les statistiques par jour
      const dayStats = dayOfWeekStats.map(day => ({
        day: dayMap[day._id],
        count: day.count,
        percentage: total > 0 ? Math.round((day.count / total) * 100) : 0
      }));
      
      callback(null, {
        total_appointments: total,
        period,
        status_distribution: statusStats,
        day_distribution: dayStats,
        start_date: startDate.toISOString(),
        end_date: now.toISOString()
      });
    } catch (error) {
      console.error('Error in GetAppointmentStats:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  }
});

// Service de rappels automatiques (à exécuter périodiquement)
const sendScheduledReminders = async () => {
  try {
    console.log('Checking for appointment reminders to send...');
    
    const now = new Date();
    
    // Trouver tous les rendez-vous confirmés dont le rappel est prévu pour maintenant
    const appointmentsToRemind = await Appointment.find({
      status: 'confirmed',
      reminder_sent: false,
      reminder_scheduled_at: { $lte: now }
    });
    
    console.log(`Found ${appointmentsToRemind.length} appointments to send reminders for`);
    
    // Envoyer un rappel pour chaque rendez-vous
    for (const appointment of appointmentsToRemind) {
      await Appointment.findByIdAndUpdate(
        appointment._id,
        { reminder_sent: true }
      );
      
      await notifyParticipants(
        appointment._id.toString(),
        'reminder',
        [appointment.user_id, appointment.agent_id]
      );
      
      console.log(`Sent reminder for appointment ${appointment._id}`);
    }
  } catch (error) {
    console.error('Error sending scheduled reminders:', error);
  }
};

// Planifier l'exécution des rappels toutes les heures
setInterval(sendScheduledReminders, 60 * 60 * 1000);

// Démarrer le serveur gRPC
const PORT = process.env.PORT || 50053;
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error('Failed to bind server:', error);
    return;
  }
  console.log(`Appointment service running on port ${port}`);
  server.start();
  
  // Exécuter la vérification des rappels au démarrage
  sendScheduledReminders();
});

// Gérer la fermeture propre
process.on('SIGINT', async () => {
  console.log('Shutting down appointment service...');
  await producer.disconnect();
  await mongoose.disconnect();
  process.exit(0);
});