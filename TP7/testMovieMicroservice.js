const axios = require('axios');
const { Kafka } = require('kafkajs');

// Kafka Consumer for testing
const kafka = new Kafka({
  clientId: 'movie-microservice-test',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'test-consumer-group' });

class MovieMicroserviceTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000/movies';
  }

  async runFullTest() {
    try {
      console.log('Starting Movie Microservice Test...');
      
      // Start Kafka consumer
      await this.setupKafkaConsumer();
      
      // Test Create Movie
      await this.testCreateMovie();
      
      // Test Get Movie
      await this.testGetMovie();
      
      // Test Update Movie
      await this.testUpdateMovie();
      
      // Test Delete Movie
      await this.testDeleteMovie();
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      // Disconnect Kafka consumer
      await consumer.disconnect();
    }
  }

  async setupKafkaConsumer() {
    await consumer.connect();
    await consumer.subscribe({ 
      topics: ['movies_topic'], 
      fromBeginning: true 
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log('Kafka Message Received:', {
          topic,
          partition,
          message: message.value.toString()
        });
      },
    });
  }

  async testCreateMovie() {
    console.log('Testing Movie Creation...');
    try {
      const response = await axios.post(this.baseUrl, {
        id: 'test_movie_1',
        title: 'Test Movie',
        description: 'A test movie for microservice'
      });
      
      console.log('Create Movie Response:', response.data);
      
      // Basic assertions
      if (!response.data.id) {
        throw new Error('Movie creation failed');
      }
    } catch (error) {
      console.error('Create Movie Test Failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async testGetMovie() {
    console.log('Testing Get Movie...');
    try {
      const response = await axios.get(`${this.baseUrl}/test_movie_1`);
      
      console.log('Get Movie Response:', response.data);
      
      // Basic assertions
      if (response.data.id !== 'test_movie_1') {
        throw new Error('Get Movie failed');
      }
    } catch (error) {
      console.error('Get Movie Test Failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async testUpdateMovie() {
    console.log('Testing Movie Update...');
    try {
      const response = await axios.put(`${this.baseUrl}/test_movie_1`, {
        title: 'Updated Test Movie',
        description: 'An updated test movie description'
      });
      
      console.log('Update Movie Response:', response.data);
      
      // Basic assertions
      if (response.data.title !== 'Updated Test Movie') {
        throw new Error('Movie update failed');
      }
    } catch (error) {
      console.error('Update Movie Test Failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async testDeleteMovie() {
    console.log('Testing Movie Deletion...');
    try {
      const response = await axios.delete(`${this.baseUrl}/test_movie_1`);
      
      console.log('Delete Movie Response:', response.data);
      
      // Basic assertions
      if (!response.data.message.includes('supprimé')) {
        throw new Error('Movie deletion failed');
      }
    } catch (error) {
      console.error('Delete Movie Test Failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }
}

// Run the test
const test = new MovieMicroserviceTest();
test.runFullTest()
  .then(() => console.log('All tests completed successfully!'))
  .catch(() => process.exit(1));