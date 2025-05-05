const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
const Property = require('./models/Property');
require('dotenv').config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-property', {
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
  clientId: 'property-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();
producer.connect().then(() => {
  console.log('Connected to Kafka');
}).catch(err => {
  console.error('Failed to connect to Kafka', err);
});

// Chargement du fichier proto
const PROTO_PATH = '../../proto/property.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const propertyProto = grpc.loadPackageDefinition(packageDefinition).property;

// Implémentation des méthodes du service
const server = new grpc.Server();

server.addService(propertyProto.PropertyService.service, {
  // Récupérer une propriété par ID
  getProperty: async (call, callback) => {
    try {
      const property = await Property.findById(call.request.id);
      if (!property) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Property not found'
        });
      }
      callback(null, { property });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Rechercher des propriétés
  searchProperties: async (call, callback) => {
    try {
      const { 
        location, min_price, max_price, bedrooms, 
        bathrooms, min_area, property_type, page = 1, limit = 10 
      } = call.request;

      let query = {};
      
      if (location) {
        query.location = { $regex: location, $options: 'i' };
      }
      
      if (min_price || max_price) {
        query.price = {};
        if (min_price) query.price.$gte = min_price;
        if (max_price) query.price.$lte = max_price;
      }
      
      if (bedrooms) {
        query.bedrooms = bedrooms;
      }
      
      if (bathrooms) {
        query.bathrooms = bathrooms;
      }
      
      if (min_area) {
        query.area = { $gte: min_area };
      }
      
      if (property_type) {
        query.property_type = property_type;
      }

      const skip = (page - 1) * limit;

      const [properties, totalCount] = await Promise.all([
        Property.find(query).skip(skip).limit(limit),
        Property.countDocuments(query)
      ]);

      callback(null, {
        properties,
        total_count: totalCount,
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
  
  // Créer une nouvelle propriété
  createProperty: async (call, callback) => {
    try {
      const newProperty = new Property(call.request);
      const savedProperty = await newProperty.save();
      
      // Publier un événement Kafka
      await producer.send({
        topic: 'property-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'PROPERTY_CREATED',
              property: savedProperty
            }) 
          }
        ]
      });
      
      callback(null, { property: savedProperty });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Mettre à jour une propriété
  updateProperty: async (call, callback) => {
    try {
      const { id, ...propertyData } = call.request;
      
      const updatedProperty = await Property.findByIdAndUpdate(
        id,
        propertyData,
        { new: true }
      );
      
      if (!updatedProperty) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Property not found'
        });
      }
      
      // Publier un événement Kafka
      await producer.send({
        topic: 'property-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'PROPERTY_UPDATED',
              property: updatedProperty
            }) 
          }
        ]
      });
      
      callback(null, { property: updatedProperty });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Supprimer une propriété
  deleteProperty: async (call, callback) => {
    try {
      const deletedProperty = await Property.findByIdAndDelete(call.request.id);
      
      if (!deletedProperty) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Property not found'
        });
      }
      
      // Publier un événement Kafka
      await producer.send({
        topic: 'property-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'PROPERTY_DELETED',
              property_id: call.request.id
            }) 
          }
        ]
      });
      
      callback(null, { 
        success: true,
        message: 'Property deleted successfully'
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
const PORT = process.env.PORT || 50051;
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error('Failed to bind server:', error);
    return;
  }
  console.log(`Property service running on port ${port}`);
  server.start();
});

// Gérer la fermeture propre
process.on('SIGINT', async () => {
  console.log('Shutting down property service...');
  await producer.disconnect();
  await mongoose.disconnect();
  process.exit(0);
});