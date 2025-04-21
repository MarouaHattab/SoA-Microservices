const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/kafka_messages', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connecté à MongoDB'))
.catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Définir le schéma pour les messages
const messageSchema = new mongoose.Schema({
  value: String,
  timestamp: { type: Date, default: Date.now }
});

// Créer le modèle
const Message = mongoose.model('Message', messageSchema);

// Configuration Kafka
const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'db-group' });

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'test-topic', fromBeginning: true });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageValue = message.value.toString();
      console.log(`Message reçu: ${messageValue}`);
      
      // Enregistrer dans MongoDB
      try {
        const newMessage = new Message({ value: messageValue });
        await newMessage.save();
        console.log('Message enregistré dans la base de données');
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement dans MongoDB:', error);
      }
    },
  });
};

run().catch(console.error);