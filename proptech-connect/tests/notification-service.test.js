// tests/notification-service.test.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { expect } = require('chai');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let client;
let userId;

const PROTO_PATH = path.join(__dirname, '../../proto/notification.proto');

describe('Notification Service Tests', () => {
  before(async function() {
    this.timeout(10000); // Timeout plus long pour le démarrage du serveur de test
    
    // Démarrer une instance MongoDB en mémoire
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Remplacer l'URL MongoDB dans le processus
    process.env.MONGODB_URI = mongoUri;
    
    // Démarrer le service de notification (assurez-vous qu'il utilise la variable d'environnement MONGODB_URI)
    // Vous pouvez exécuter le serveur dans un processus séparé ou l'initialiser directement ici
    
    // Créer le client gRPC pour les tests
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    
    const notificationProto = grpc.loadPackageDefinition(packageDefinition).notification;
    
    client = new notificationProto.NotificationService(
      'localhost:50055',
      grpc.credentials.createInsecure()
    );
    
    // Créer un ID utilisateur pour les tests
    userId = mongoose.Types.ObjectId().toString();
  });
  
  after(async function() {
    // Arrêter la base de données en mémoire
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    // Arrêter le service si vous l'avez démarré ici
  });
  
  it('should create a notification', (done) => {
    client.SendNotification({
      user_id: userId,
      title: 'Test Notification',
      content: 'This is a test notification',
      type: 'test',
      related_id: 'test123'
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('id');
      expect(response).to.have.property('status', 'sent');
      
      // Stocker l'ID pour les tests suivants
      notificationId = response.id;
      done();
    });
  });
  
  it('should get user notifications', (done) => {
    client.GetUserNotifications({
      user_id: userId
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('notifications');
      expect(response.notifications).to.be.an('array');
      expect(response.notifications.length).to.be.at.least(1);
      
      const notification = response.notifications.find(n => n.title === 'Test Notification');
      expect(notification).to.exist;
      expect(notification.is_read).to.be.false;
      
      done();
    });
  });
  
  it('should mark a notification as read', (done) => {
    client.MarkAsRead({
      notification_id: notificationId
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('status', 'read');
      
      // Vérifier que la notification est bien marquée comme lue
      client.GetUserNotifications({
        user_id: userId
      }, (err, response) => {
        expect(err).to.be.null;
        
        const notification = response.notifications.find(n => n.id === notificationId);
        expect(notification).to.exist;
        expect(notification.is_read).to.be.true;
        
        done();
      });
    });
  });
});