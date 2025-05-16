// chat-service/property-service-client.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Charger le fichier proto du service de propriétés
const PROPERTY_PROTO_PATH = path.join(__dirname, '../../proto/property.proto');
const packageDefinition = protoLoader.loadSync(PROPERTY_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const propertyProto = grpc.loadPackageDefinition(packageDefinition).property;

// Créer le client gRPC
const propertyClient = new propertyProto.PropertyService(
  process.env.PROPERTY_SERVICE_URL || 'localhost:50051',
  grpc.credentials.createInsecure()
);

module.exports = {
  propertyClient
};