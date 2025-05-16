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
      console.log('[USER-SERVICE] createUser called with:', JSON.stringify(call.request));
      
      // Validation input
      if (!call.request.name || !call.request.email || !call.request.password) {
        console.error('[USER-SERVICE] Missing required fields');
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Required fields missing: name, email, or password'
        });
      }
      
      // Vérifier si l'email existe déjà
      const existingUser = await User.findOne({ email: call.request.email });
      if (existingUser) {
        console.log('[USER-SERVICE] Email already exists:', call.request.email);
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'Email already in use'
        });
      }
      
      // Create and save user with explicit error handling
      let savedUser;
      try {
        const newUser = new User({
          name: call.request.name,
          email: call.request.email,
          password: call.request.password,
          role: call.request.role || 'buyer',
          phone: call.request.phone || ''
        });
        savedUser = await newUser.save();
      } catch (mongoError) {
        console.error('[USER-SERVICE] MongoDB save error:', mongoError);
        return callback({
          code: grpc.status.INTERNAL,
          message: `Database error: ${mongoError.message}`
        });
      }
      
      if (!savedUser || !savedUser._id) {
        console.error('[USER-SERVICE] User was not saved correctly');
        return callback({
          code: grpc.status.INTERNAL,
          message: 'Failed to save user'
        });
      }
      
      // Exclure le mot de passe
      const userWithoutPassword = {
        id: savedUser._id.toString(),
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        phone: savedUser.phone || '',
        created_at: savedUser.createdAt.toISOString(),
        updated_at: savedUser.updatedAt.toISOString()
      };
      
      // Generate JWT token
      let token;
      try {
        token = jwt.sign(
          { 
            id: savedUser._id,
            email: savedUser.email,
            role: savedUser.role
          },
          JWT_SECRET,
          { expiresIn: '1d' }
        );
      } catch (jwtError) {
        console.error('[USER-SERVICE] JWT generation error:', jwtError);
        return callback({
          code: grpc.status.INTERNAL,
          message: 'Failed to generate authentication token'
        });
      }
      
      // Ensure we have both required outputs
      if (!token) {
        console.error('[USER-SERVICE] Token generation failed');
        return callback({
          code: grpc.status.INTERNAL,
          message: 'Failed to generate authentication token'
        });
      }
      
      // Try to publish to Kafka but don't fail if it doesn't work
      try {
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
      } catch (kafkaError) {
        console.error('[USER-SERVICE] Kafka publish error:', kafkaError);
        // Continue since this is non-critical
      }
      
      // Log the successful response we're about to send
      console.log('[USER-SERVICE] User created successfully:', userWithoutPassword.id);
      console.log('[USER-SERVICE] Response contains token:', !!token);
      console.log('[USER-SERVICE] Response contains user object:', !!userWithoutPassword);
      
      // Return the complete response
      callback(null, { 
        user: userWithoutPassword,
        token: token
      });
    } catch (error) {
      console.error('[USER-SERVICE] Error creating user:', error);
      console.error('[USER-SERVICE] Error stack:', error.stack);
      callback({
        code: grpc.status.INTERNAL,
        message: `Internal server error: ${error.message}`
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
    console.error('[USER-SERVICE] Failed to bind server:', error);
    return;
  }
  console.log(`[USER-SERVICE] User service running on 0.0.0.0:${port} - ready to accept connections`);
  console.log('[USER-SERVICE] Service will be accessible at localhost:50052 from other containers or same machine');
  server.start();
});

// Gérer la fermeture propre
process.on('SIGINT', async () => {
  console.log('Shutting down user service...');
  await producer.disconnect();
  await mongoose.disconnect();
  process.exit(0);
});