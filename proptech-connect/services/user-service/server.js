const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Kafka } = require('kafkajs');
const User = require('./models/User');
require('dotenv').config();

// Secret pour JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-user', {
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
  clientId: 'user-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();
producer.connect().then(() => {
  console.log('Connected to Kafka');
}).catch(err => {
  console.error('Failed to connect to Kafka', err);
});

// Chargement du fichier proto
const PROTO_PATH = '../../proto/user.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// Implémentation des méthodes du service
const server = new grpc.Server();

server.addService(userProto.UserService.service, {
  // Récupérer un utilisateur par ID
  getUser: async (call, callback) => {
    try {
      const user = await User.findById(call.request.id);
      if (!user) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found'
        });
      }
      
      // Exclure le mot de passe
      const userWithoutPassword = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString()
      };
      
      callback(null, { user: userWithoutPassword });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Récupérer tous les utilisateurs
  getUsers: async (call, callback) => {
    try {
      const users = await User.find({}, '-password');
      const formattedUsers = users.map(user => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString()
      }));
      
      callback(null, { users: formattedUsers });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Créer un nouvel utilisateur
  createUser: async (call, callback) => {
    try {
      // Vérifier si l'email existe déjà
      const existingUser = await User.findOne({ email: call.request.email });
      if (existingUser) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'Email already in use'
        });
      }
      
      const newUser = new User(call.request);
      const savedUser = await newUser.save();
      
      // Exclure le mot de passe
      const userWithoutPassword = {
        id: savedUser._id.toString(),
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        phone: savedUser.phone,
        created_at: savedUser.createdAt.toISOString(),
        updated_at: savedUser.updatedAt.toISOString()
      };
      
      // Publier un événement Kafka
      await producer.send({
        topic: 'user-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'USER_CREATED',
              user: userWithoutPassword
            }) 
          }
        ]
      });
      
      callback(null, { user: userWithoutPassword });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Mettre à jour un utilisateur
  updateUser: async (call, callback) => {
    try {
      const { id, ...userData } = call.request;
      
      const updatedUser = await User.findByIdAndUpdate(
        id,
        userData,
        { new: true }
      );
      
      if (!updatedUser) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found'
        });
      }
      
      // Exclure le mot de passe
      const userWithoutPassword = {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        created_at: updatedUser.createdAt.toISOString(),
        updated_at: updatedUser.updatedAt.toISOString()
      };
      
      // Publier un événement Kafka
      await producer.send({
        topic: 'user-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'USER_UPDATED',
              user: userWithoutPassword
            }) 
          }
        ]
      });
      
      callback(null, { user: userWithoutPassword });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Supprimer un utilisateur
  deleteUser: async (call, callback) => {
    try {
      const deletedUser = await User.findByIdAndDelete(call.request.id);
      
      if (!deletedUser) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found'
        });
      }
      
      // Publier un événement Kafka
      await producer.send({
        topic: 'user-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'USER_DELETED',
              user_id: call.request.id
            }) 
          }
        ]
      });
      
      callback(null, { 
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Authentification
  authenticate: async (call, callback) => {
    try {
      const { email, password } = call.request;
      
      // Trouver l'utilisateur par email
      const user = await User.findOne({ email });
      if (!user) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Invalid email or password'
        });
      }
      
      // Vérifier le mot de passe
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid email or password'
        });
      }
      
      // Générer un JWT
      const token = jwt.sign(
        { 
          id: user._id,
          email: user.email,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      // Exclure le mot de passe
      const userWithoutPassword = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString()
      };
      
      // Publier un événement Kafka
      await producer.send({
        topic: 'user-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'USER_LOGGED_IN',
              user_id: user._id.toString()
            }) 
          }
        ]
      });
      
      callback(null, { 
        token,
        user: userWithoutPassword
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
const PORT = process.env.PORT || 50052;
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error('Failed to bind server:', error);
    return;
  }
  console.log(`User service running on port ${port}`);
  server.start();
});

// Gérer la fermeture propre
process.on('SIGINT', async () => {
  console.log('Shutting down user service...');
  await producer.disconnect();
  await mongoose.disconnect();
  process.exit(0);
});