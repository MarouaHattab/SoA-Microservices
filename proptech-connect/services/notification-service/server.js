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
          } else if (topic === 'property-events' && eventData.event === 'PROPERTY_SOLD') {
            // Générer des notifications pour les parties impliquées dans la vente
            // ...
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