const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

// Fonction pour générer un message aléatoire
function generateRandomMessage() {
  const messages = [
    "Message important du système",
    "Alerte de sécurité",
    "Mise à jour disponible",
    "Nouvel utilisateur enregistré",
    "Transaction complétée"
  ];
  
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex] + " #" + Math.floor(Math.random() * 1000);
}

const run = async () => {
  await producer.connect();
  
  setInterval(async () => {
    try {
      const messageValue = generateRandomMessage();
      await producer.send({
        topic: 'test-topic',
        messages: [
          { value: messageValue },
        ],
      });
      console.log('Message produit avec succès:', messageValue);
    } catch (err) {
      console.error("Erreur lors de la production de message", err);
    }
  }, 2000);
};

run().catch(console.error);