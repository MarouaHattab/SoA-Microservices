const { Kafka } = require('kafkajs');
require('dotenv').config();

// Configuration Kafka
const kafka = new Kafka({
  clientId: 'property-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

// Connexion à Kafka
async function connectProducer() {
  try {
    await producer.connect();
    console.log('Property service connected to Kafka');
    return producer;
  } catch (error) {
    console.error('Error connecting to Kafka:', error);
    throw error;
  }
}

// Envoyer un événement
async function sendEvent(topic, key, value) {
  try {
    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value)
        }
      ]
    });
    
    console.log(`Event sent to topic ${topic}`);
  } catch (error) {
    console.error(`Error sending event to topic ${topic}:`, error);
    throw error;
  }
}

module.exports = {
  connectProducer,
  sendEvent
};