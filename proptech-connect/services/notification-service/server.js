
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
const dotenv = require('dotenv');

// Modèles
const Notification = require('./models/Notification');
const NotificationSettings = require('./models/NotificationSettings');

// Charger les variables d'environnement
dotenv.config();

// Connexion à Kafka
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'notification-service' });

// Charger le fichier proto
const PROTO_PATH = path.join(__dirname, '../../proto/notification.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const notificationProto = grpc.loadPackageDefinition(packageDefinition).notification;

// Service pour récupérer les infos utilisateur
const userServiceClient = require('./user-service-client');

// Implémentation du service de notification
const notificationService = {
  // Envoyer une notification à un utilisateur spécifique
  SendNotification: async (call, callback) => {
    try {
      const { sender_id, recipient_id, title, content, type, link, priority, requires_action } = call.request;
      
      // Vérifier si l'expéditeur est un administrateur
      const senderInfo = await userServiceClient.getUserById(sender_id);
      
      if (senderInfo.role !== 'admin') {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only administrators can send notifications'
        });
      }
      
      // Vérifier les paramètres de notification du destinataire
      const notificationSettings = await NotificationSettings.findOne({ user_id: recipient_id }) || 
                                  new NotificationSettings({ user_id: recipient_id });
      
      // Vérifier si le type de notification est désactivé pour cet utilisateur
      if (notificationSettings.muted_types.includes(type)) {
        return callback(null, {
          notification_id: null,
          success: false,
          message: 'User has muted this type of notification'
        });
      }
      
      // Créer la notification
      const notification = new Notification({
        sender_id,
        sender_name: senderInfo.name,
        sender_role: senderInfo.role,
        recipient_id,
        title,
        content,
        type: type || 'info',
        link,
        priority: priority || 'NORMAL',
        requires_action: requires_action || false,
        created_at: new Date()
      });
      
      // Sauvegarder la notification
      const savedNotification = await notification.save();
      
      // Produire un événement Kafka pour la notification
      await producer.send({
        topic: 'notification-events',
        messages: [
          { 
            key: recipient_id,
            value: JSON.stringify({
              event: 'NEW_NOTIFICATION',
              notification: {
                id: savedNotification._id.toString(),
                title: savedNotification.title,
                content: savedNotification.content,
                type: savedNotification.type,
                sender_name: savedNotification.sender_name,
                priority: savedNotification.priority,
                created_at: savedNotification.created_at
              }
            })
          }
        ]
      });
      
      // Répondre avec l'ID de la notification créée
      callback(null, {
        notification_id: savedNotification._id.toString(),
        success: true,
        message: 'Notification sent successfully'
      });
    } catch (error) {
      console.error('Error in SendNotification:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Envoyer une notification à plusieurs utilisateurs
  SendBulkNotification: async (call, callback) => {
    try {
      const { sender_id, recipient_ids, title, content, type, link, priority, requires_action } = call.request;
      
      // Vérifier si l'expéditeur est un administrateur
      const senderInfo = await userServiceClient.getUserById(sender_id);
      
      if (senderInfo.role !== 'admin') {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only administrators can send notifications'
        });
      }
      
      const notificationIds = [];
      let successCount = 0;
      let failureCount = 0;
      
      // Traiter chaque destinataire
      for (const recipient_id of recipient_ids) {
        try {
          // Vérifier les paramètres de notification du destinataire
          const notificationSettings = await NotificationSettings.findOne({ user_id: recipient_id }) || 
                                      new NotificationSettings({ user_id: recipient_id });
          
          // Vérifier si le type de notification est désactivé pour cet utilisateur
          if (notificationSettings.muted_types.includes(type)) {
            failureCount++;
            continue;
          }
          
          // Créer la notification
          const notification = new Notification({
            sender_id,
            sender_name: senderInfo.name,
            sender_role: senderInfo.role,
            recipient_id,
            title,
            content,
            type: type || 'info',
            link,
            priority: priority || 'NORMAL',
            requires_action: requires_action || false,
            created_at: new Date()
          });
          
          // Sauvegarder la notification
          const savedNotification = await notification.save();
          
          // Produire un événement Kafka pour la notification
          await producer.send({
            topic: 'notification-events',
            messages: [
              { 
                key: recipient_id,
                value: JSON.stringify({
                  event: 'NEW_NOTIFICATION',
                  notification: {
                    id: savedNotification._id.toString(),
                    title: savedNotification.title,
                    content: savedNotification.content,
                    type: savedNotification.type,
                    sender_name: savedNotification.sender_name,
                    priority: savedNotification.priority,
                    created_at: savedNotification.created_at
                  }
                })
              }
            ]
          });
          
          notificationIds.push(savedNotification._id.toString());
          successCount++;
        } catch (error) {
          console.error(`Error sending notification to ${recipient_id}:`, error);
          failureCount++;
        }
      }
      
      // Répondre avec les résultats
      callback(null, {
        notification_ids: notificationIds,
        success_count: successCount,
        failure_count: failureCount,
        message: `Successfully sent ${successCount} notifications, ${failureCount} failed`
      });
    } catch (error) {
      console.error('Error in SendBulkNotification:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Récupérer les notifications d'un utilisateur
  GetUserNotifications: async (call, callback) => {
    try {
      const { user_id, unread_only, page, limit } = call.request;
      
      // Construire la requête
      const query = { recipient_id: user_id };
      if (unread_only) {
        query.is_read = false;
      }
      
      // Compter le nombre total de notifications
      const totalCount = await Notification.countDocuments(query);
      
      // Compter le nombre de notifications non lues
      const unreadCount = await Notification.countDocuments({ 
        recipient_id: user_id, 
        is_read: false 
      });
      
      // Récupérer les notifications paginées
      const pageNumber = page || 1;
      const pageSize = limit || 20;
      const skip = (pageNumber - 1) * pageSize;
      
      const notifications = await Notification.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(pageSize);
      
      // Formater les notifications pour la réponse
      const formattedNotifications = notifications.map(n => ({
        id: n._id.toString(),
        sender_id: n.sender_id,
        sender_name: n.sender_name,
        sender_role: n.sender_role,
        recipient_id: n.recipient_id,
        title: n.title,
        content: n.content,
        type: n.type,
        link: n.link || '',
        priority: n.priority,
        is_read: n.is_read,
        requires_action: n.requires_action,
        created_at: n.created_at.toISOString()
      }));
      
      callback(null, {
        notifications: formattedNotifications,
        total_count: totalCount,
        unread_count: unreadCount
      });
    } catch (error) {
      console.error('Error in GetUserNotifications:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Marquer une notification comme lue
  MarkNotificationAsRead: async (call, callback) => {
    try {
      const { notification_id, user_id } = call.request;
      
      // Trouver la notification
      const notification = await Notification.findById(notification_id);
      
      if (!notification) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Notification not found'
        });
      }
      
      // Vérifier que la notification appartient à l'utilisateur
      if (notification.recipient_id !== user_id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'This notification does not belong to the user'
        });
      }
      
      // Marquer la notification comme lue
      notification.is_read = true;
      notification.read_at = new Date();
      await notification.save();
      
      callback(null, { success: true });
    } catch (error) {
      console.error('Error in MarkNotificationAsRead:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Mettre à jour les paramètres de notification
  UpdateNotificationSettings: async (call, callback) => {
    try {
      const { user_id, email_enabled, push_enabled, in_app_enabled, muted_types } = call.request;
      
      // Mettre à jour ou créer les paramètres
      const settings = await NotificationSettings.findOneAndUpdate(
        { user_id },
        {
          email_enabled,
          push_enabled,
          in_app_enabled,
          muted_types,
          updated_at: new Date()
        },
        { upsert: true, new: true }
      );
      
      callback(null, {
        success: true,
        settings: {
          user_id: settings.user_id,
          email_enabled: settings.email_enabled,
          push_enabled: settings.push_enabled,
          in_app_enabled: settings.in_app_enabled,
          muted_types: settings.muted_types,
          updated_at: settings.updated_at.toISOString()
        }
      });
    } catch (error) {
      console.error('Error in UpdateNotificationSettings:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  }
};

// Démarrer le serveur
const PORT = process.env.PORT || 50055;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-notifications';

async function startServices() {
  try {
    // Connecter à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Connecter à Kafka
    await producer.connect();
    await consumer.connect();
    
    // S'abonner aux sujets Kafka pertinents
    await consumer.subscribe({ topic: 'user-events', fromBeginning: false });
    await consumer.subscribe({ topic: 'property-events', fromBeginning: false });
    await consumer.subscribe({ topic: 'chat-events', fromBeginning: false });
    await consumer.subscribe({ topic: 'appointment-events', fromBeginning: false });
    await consumer.subscribe({ topic: 'notification-events', fromBeginning: false });
    
    // Traiter les messages Kafka
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const eventData = JSON.parse(message.value.toString());
          console.log(`Received Kafka event from ${topic}:`, eventData.event || 'unknown event');
          
          // Traiter différents types d'événements
          if (topic === 'user-events' && eventData.event === 'USER_REGISTERED') {
            // Créer des paramètres de notification par défaut pour les nouveaux utilisateurs
            await NotificationSettings.findOneAndUpdate(
              { user_id: eventData.user_id },
              {
                user_id: eventData.user_id,
                email_enabled: true,
                push_enabled: true,
                in_app_enabled: true,
                muted_types: [],
                updated_at: new Date()
              },
              { upsert: true }
            );
          } else if (topic === 'property-events' && eventData.event === 'price-change') {
            // Notifier tous les utilisateurs qui ont cette propriété en favoris
            for (const userId of eventData.favorited_by) {
              try {
                // Vérifier les paramètres de notification
                const notificationSettings = await NotificationSettings.findOne({ user_id: userId }) || 
                                          new NotificationSettings({ user_id: userId });
                
                if (!notificationSettings.muted_types.includes('price_change')) {
                  // Créer la notification
                  const priceChange = eventData.new_price - eventData.old_price;
                  const isIncrease = priceChange > 0;
                  
                  const notification = new Notification({
                    sender_id: 'SYSTEM',
                    sender_name: 'Système',
                    sender_role: 'system',
                    recipient_id: userId,
                    title: 'Changement de prix sur une propriété favorite',
                    content: `Le prix de "${eventData.title}" a ${isIncrease ? 'augmenté' : 'baissé'} de ${Math.abs(priceChange).toLocaleString()} € (${isIncrease ? '+' : '-'}${Math.abs(Math.round((priceChange / eventData.old_price) * 100))}%)`,
                    type: 'price_change',
                    reference_id: eventData.property_id,
                    reference_type: 'property',
                    link: `/properties/${eventData.property_id}`,
                    priority: 'NORMAL',
                    requires_action: false,
                    created_at: new Date()
                  });
                  
                  await notification.save();
                }
              } catch (error) {
                console.error(`Error sending price change notification to user ${userId}:`, error);
              }
            }
          } else if (topic === 'property-events' && eventData.event === 'PROPERTY_SOLD') {
            // Générer des notifications pour les parties impliquées dans la vente
            // ...
          } else if (topic === 'appointment-events') {
            // Traiter les événements d'appointement
            switch (eventData.event) {
              case 'APPOINTMENT_CREATED':
                if (eventData.appointment) {
                  // Notifier l'agent
                  await createAppointmentNotification({
                    recipient_id: eventData.appointment.agent_id,
                    title: 'Nouveau rendez-vous',
                    content: `Un nouveau rendez-vous a été programmé pour le ${new Date(eventData.appointment.date_time).toLocaleString()}`,
                    type: 'new_appointment',
                    reference_id: eventData.appointment.id,
                    reference_type: 'appointment',
                    link: `/appointments/${eventData.appointment.id}`,
                    priority: 'NORMAL',
                    requires_action: true
                  });
                }
                break;
                
              case 'APPOINTMENT_UPDATED':
                if (eventData.appointment) {
                  // Déterminer qui doit être notifié (généralement la personne qui n'a pas fait la mise à jour)
                  const notifyUserId = eventData.changed_by === eventData.appointment.user_id ? 
                    eventData.appointment.agent_id : eventData.appointment.user_id;
                  
                  // Contenu de la notification selon le statut
                  let title = 'Rendez-vous mis à jour';
                  let content = `Le rendez-vous du ${new Date(eventData.appointment.date_time).toLocaleString()} a été mis à jour`;
                  let type = 'appointment_update';
                  let requiresAction = false;
                  
                  if (eventData.appointment.status === 'confirmed') {
                    title = 'Rendez-vous confirmé';
                    content = `Votre rendez-vous du ${new Date(eventData.appointment.date_time).toLocaleString()} a été confirmé`;
                    type = 'appointment_confirmed';
                  } else if (eventData.appointment.status === 'rejected') {
                    title = 'Rendez-vous refusé';
                    content = `Votre rendez-vous du ${new Date(eventData.appointment.date_time).toLocaleString()} a été refusé: ${eventData.appointment.rejection_reason || 'Aucune raison fournie'}`;
                    type = 'appointment_rejected';
                  } else if (eventData.appointment.status === 'rescheduled') {
                    title = 'Proposition de report de rendez-vous';
                    content = `Une nouvelle date a été proposée pour votre rendez-vous: ${new Date(eventData.appointment.reschedule_proposed).toLocaleString()}`;
                    type = 'appointment_rescheduled';
                    requiresAction = true;
                  }
                  
                  await createAppointmentNotification({
                    recipient_id: notifyUserId,
                    title,
                    content,
                    type,
                    reference_id: eventData.appointment.id,
                    reference_type: 'appointment',
                    link: `/appointments/${eventData.appointment.id}`,
                    priority: eventData.appointment.status === 'rejected' ? 'HIGH' : 'NORMAL',
                    requires_action: requiresAction
                  });
                }
                break;
                
              case 'APPOINTMENT_DELETED':
                // Notifier les deux parties
                if (eventData.appointment) {
                  const recipientIds = [eventData.appointment.user_id, eventData.appointment.agent_id];
                  
                  for (const recipientId of recipientIds) {
                    if (recipientId !== eventData.deleted_by) {
                      await createAppointmentNotification({
                        recipient_id: recipientId,
                        title: 'Rendez-vous annulé',
                        content: `Le rendez-vous du ${new Date(eventData.appointment.date_time).toLocaleString()} a été annulé`,
                        type: 'appointment_cancelled',
                        reference_id: eventData.appointment.id,
                        reference_type: 'appointment',
                        link: `/appointments/${eventData.appointment.id}`,
                        priority: 'HIGH',
                        requires_action: false
                      });
                    }
                  }
                }
                break;
            }
          } else if (topic === 'notification-events' && eventData.event === 'APPOINTMENT_NOTIFICATION') {
            // Traiter les notifications spécifiques aux rendez-vous
            await createAppointmentNotification({
              recipient_id: eventData.user_id,
              title: eventData.title || 'Notification de rendez-vous',
              content: eventData.content || 'Mise à jour concernant votre rendez-vous',
              type: eventData.type || 'appointment_update',
              reference_id: eventData.appointment_id,
              reference_type: 'appointment',
              link: `/appointments/${eventData.appointment_id}`,
              priority: eventData.priority || 'NORMAL',
              requires_action: eventData.requires_action || false
            });
          }
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
    
    console.log('Connected to Kafka');
    
    // Créer et démarrer le serveur gRPC
    const server = new grpc.Server();
    server.addService(notificationProto.NotificationService.service, notificationService);
    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
      if (error) {
        console.error('Failed to start gRPC server:', error);
        return;
      }
      
      server.start();
      console.log(`Notification service started on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting services:', error);
    process.exit(1);
  }
}

// Fonction utilitaire pour créer des notifications d'appointement
async function createAppointmentNotification(params) {
  try {
    // Vérifier les paramètres de notification du destinataire
    const notificationSettings = await NotificationSettings.findOne({ user_id: params.recipient_id }) || 
                               new NotificationSettings({ user_id: params.recipient_id });
    
    // Vérifier si le type de notification est désactivé pour cet utilisateur
    if (notificationSettings.muted_types.includes(params.type)) {
      console.log(`Notification de type ${params.type} désactivée pour l'utilisateur ${params.recipient_id}`);
      return null;
    }
    
    // Créer la notification
    const notification = new Notification({
      sender_id: 'SYSTEM',
      sender_name: 'Système',
      sender_role: 'system',
      recipient_id: params.recipient_id,
      title: params.title,
      content: params.content,
      type: params.type,
      reference_id: params.reference_id,
      reference_type: params.reference_type,
      link: params.link,
      priority: params.priority,
      requires_action: params.requires_action,
      created_at: new Date()
    });
    
    // Sauvegarder la notification
    const savedNotification = await notification.save();
    
    console.log(`Notification créée pour l'utilisateur ${params.recipient_id}`);
    
    return savedNotification;
  } catch (error) {
    console.error('Error creating appointment notification:', error);
    return null;
  }
}

// Démarrer les services
startServices();

// Gérer l'arrêt gracieux
process.on('SIGINT', async () => {
  console.log('Shutting down notification service...');
  try {
    await consumer.disconnect();
    await producer.disconnect();
    await mongoose.disconnect();
    console.log('Connections closed properly');
  } catch (error) {
    console.error('Error while closing connections:', error);
  }
  process.exit(0);
});