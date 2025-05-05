const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
const Notification = require('./models/Notification');
require('dotenv').config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-notification', {
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
  clientId: 'notification-service',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'notification-group' });
const producer = kafka.producer();

// Fonction pour traiter les notifications
const processNotification = async (message) => {
  try {
    const eventData = JSON.parse(message.value.toString());
    console.log('Processing notification event:', eventData.event);
    
    let notification;
    
    // Traiter différents types d'événements
    switch (eventData.event) {
      case 'PROPERTY_CREATED':
        notification = new Notification({
          user_id: 'admin', // Pour l'instant, notifier l'admin seulement
          type: 'new_property',
          message: `Nouvelle propriété ajoutée: ${eventData.property.title}`,
          related_id: eventData.property.id
        });
        break;
        
      case 'PROPERTY_UPDATED':
        if (eventData.property.price_changed) {
          notification = new Notification({
            user_id: eventData.property.owner_id,
            type: 'price_change',
            message: `Le prix de votre propriété ${eventData.property.title} a été mis à jour à ${eventData.property.price}`,
            related_id: eventData.property.id
          });
        }
        break;
        
      case 'APPOINTMENT_NOTIFICATION':
        notification = new Notification({
          user_id: eventData.user_id,
          type: eventData.type,
          message: eventData.message,
          related_id: eventData.appointment_id
        });
        
        // Créer également une notification pour l'agent
        const agentNotification = new Notification({
          user_id: eventData.agent_id,
          type: eventData.type,
          message: `${eventData.message} (avec client)`,
          related_id: eventData.appointment_id
        });
        await agentNotification.save();
        break;
        
      case 'CHAT_MESSAGE':
        notification = new Notification({
          user_id: eventData.receiver_id,
          type: 'new_message',
          message: `Nouveau message de ${eventData.sender_name}: ${eventData.content.substring(0, 50)}${eventData.content.length > 50 ? '...' : ''}`,
          related_id: eventData.conversation_id
        });
        break;
    }
    
    // Sauvegarder la notification si elle existe
    if (notification) {
      await notification.save();
      console.log('Notification saved:', notification);
    }
  } catch (error) {
    console.error('Error processing notification:', error);
  }
};

// Fonction principale
const run = async () => {
  // Connecter les clients Kafka
  await Promise.all([
    consumer.connect(),
    producer.connect()
  ]);
  
  console.log('Connected to Kafka');
  
  // S'abonner aux topics
  await consumer.subscribe({ 
    topics: [
      'property-events', 
      'appointment-events', 
      'user-events', 
      'chat-events',
      'notification-events'
    ] 
  });
  
  // Consommer les messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await processNotification(message);
    },
  });
  
  console.log('Notification service is running');
};

// Démarrer le service
run().catch(error => {
  console.error('Error running notification service:', error);
  process.exit(1);
});

// Gérer la fermeture propre
process.on('SIGINT', async () => {
  console.log('Shutting down notification service...');
  await consumer.disconnect();
  await producer.disconnect();
  await mongoose.disconnect();
  process.exit(0);
});