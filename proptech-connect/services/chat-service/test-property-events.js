/**
 * Test script to simulate property events and verify chat service handling
 */

const { Kafka } = require('kafkajs');
require('dotenv').config();

// Configuration Kafka
const kafka = new Kafka({
  clientId: 'property-event-test',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

async function sendTestEvents() {
  try {
    console.log('Connecting to Kafka...');
    await producer.connect();
    console.log('Connected to Kafka');
    
    // Test property-created event
    console.log('\nSending property-created event...');
    await producer.send({
      topic: 'property-events',
      messages: [
        {
          key: 'property-created',
          value: JSON.stringify({
            property_id: 'test-property-123',
            owner_id: 'user-456',
            price: 250000,
            location: 'Test City',
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
    console.log('property-created event sent');
    
    // Wait a bit before sending the next event
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test property-updated event
    console.log('\nSending property-updated event...');
    await producer.send({
      topic: 'property-events',
      messages: [
        {
          key: 'property-updated',
          value: JSON.stringify({
            property_id: 'test-property-123',
            owner_id: 'user-456',
            price: 260000, // Updated price
            location: 'Test City',
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
    console.log('property-updated event sent');
    
    // Wait a bit before sending the next event
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test PROPERTY_SOLD event
    console.log('\nSending PROPERTY_SOLD event...');
    await producer.send({
      topic: 'property-events',
      messages: [
        {
          key: 'PROPERTY_SOLD',
          value: JSON.stringify({
            property_id: 'test-property-123',
            property_title: 'Test Property',
            seller_id: 'user-456',
            buyer_id: 'user-789',
            price: 260000,
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
    console.log('PROPERTY_SOLD event sent');
    
    console.log('\nAll test events sent successfully');
    console.log('Check the chat service logs to verify correct handling');
    
  } catch (error) {
    console.error('Error sending test events:', error);
  } finally {
    await producer.disconnect();
    console.log('Disconnected from Kafka');
  }
}

sendTestEvents().catch(console.error); 