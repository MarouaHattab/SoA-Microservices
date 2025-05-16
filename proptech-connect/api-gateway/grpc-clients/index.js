const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

// Options de chargement pour tous les proto
const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

// Ajout des nouveaux chemins proto
const propertyProtoPath = path.join(__dirname, '../../proto/property.proto');
const userProtoPath = path.join(__dirname, '../../proto/user.proto');
const appointmentProtoPath = path.join(__dirname, '../../proto/appointment.proto');
const chatProtoPath = path.join(__dirname, '../../proto/chat.proto');
const notificationProtoPath = path.join(__dirname, '../../proto/notification.proto');

// Charger les définitions de proto
const packageDefinition = {
  property: protoLoader.loadSync(propertyProtoPath, options),
  user: protoLoader.loadSync(userProtoPath, options),
  appointment: protoLoader.loadSync(appointmentProtoPath, options),
  chat: protoLoader.loadSync(chatProtoPath, options),
  notification: protoLoader.loadSync(notificationProtoPath, options)
};

// Charger les définitions
const protoDescriptors = {
  property: grpc.loadPackageDefinition(packageDefinition.property).property,
  user: grpc.loadPackageDefinition(packageDefinition.user).user,
  appointment: grpc.loadPackageDefinition(packageDefinition.appointment).appointment,
  chat: grpc.loadPackageDefinition(packageDefinition.chat).chat,
  notification: grpc.loadPackageDefinition(packageDefinition.notification).notification
};

// Créer les clients
const propertyClient = new protoDescriptors.property.PropertyService(
    'localhost:50051',
    grpc.credentials.createInsecure(),
    {
      'grpc.keepalive_time_ms': 30000,
      'grpc.keepalive_timeout_ms': 10000,
      'grpc.max_reconnect_backoff_ms': 5000,
      'grpc.initial_reconnect_backoff_ms': 1000
    }
);

const userClient = new protoDescriptors.user.UserService(
    'localhost:50052',
    grpc.credentials.createInsecure(),
    {
      'grpc.keepalive_time_ms': 30000,
      'grpc.keepalive_timeout_ms': 10000,
      'grpc.max_reconnect_backoff_ms': 5000,
      'grpc.initial_reconnect_backoff_ms': 1000
    }
);

const appointmentClient = new protoDescriptors.appointment.AppointmentService(
    'localhost:50053',
    grpc.credentials.createInsecure(),
    {
      'grpc.keepalive_time_ms': 30000,
      'grpc.keepalive_timeout_ms': 10000,
      'grpc.max_reconnect_backoff_ms': 5000,
      'grpc.initial_reconnect_backoff_ms': 1000
    }
);

const chatClient = new protoDescriptors.chat.ChatService(
    'localhost:50054',
    grpc.credentials.createInsecure(),
    {
      'grpc.keepalive_time_ms': 30000,
      'grpc.keepalive_timeout_ms': 10000,
      'grpc.max_reconnect_backoff_ms': 5000,
      'grpc.initial_reconnect_backoff_ms': 1000
    }
);

const notificationClient = new protoDescriptors.notification.NotificationService(
    'localhost:50055',
    grpc.credentials.createInsecure(),
    {
      'grpc.keepalive_time_ms': 30000,
      'grpc.keepalive_timeout_ms': 10000,
      'grpc.max_reconnect_backoff_ms': 5000,
      'grpc.initial_reconnect_backoff_ms': 1000
    }
);

// Check connection to user service
userClient.waitForReady(Date.now() + 5000, (error) => {
  if (error) {
    console.error('User service is not available:', error);
  } else {
    console.log('User service is ready');
  }
});

// Add JWT to handle missing tokens
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Créer les versions promisifiées des méthodes
const propertyService = {};
const userService = {};
const appointmentService = {};
const chatService = {};
const notificationService = {};

// Add token generation helper to supplement missing tokens from user service
function generateUserToken(user) {
  if (!user || !user.id) {
    console.error('Cannot generate token for invalid user', user);
    return null;
  }
  
  try {
    return jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
  } catch (error) {
    console.error('Error generating token:', error);
    return null;
  }
}

// Promisifier les méthodes pour chaque service
Object.keys(propertyClient.__proto__).forEach(method => {
  if (typeof propertyClient[method] === 'function' && method !== 'constructor') {
    propertyService[`${method}Async`] = promisify(propertyClient[method].bind(propertyClient));
  }
});

Object.keys(userClient.__proto__).forEach(method => {
  if (typeof userClient[method] === 'function' && method !== 'constructor') {
    const originalMethod = promisify(userClient[method].bind(userClient));
    
    // Add enhanced error handling and logging for critical methods
    if (method === 'createUser' || method === 'authenticate') {
      userService[`${method}Async`] = async function(...args) {
        try {
          console.log(`Calling user service ${method} with args:`, JSON.stringify(args));
          const result = await originalMethod(...args);
          console.log(`Result from ${method}:`, JSON.stringify(result));
          
          // For createUser, make sure there's a token
          if (method === 'createUser' && result && result.user && !result.token) {
            console.log('Token missing from createUser response, generating one');
            result.token = generateUserToken(result.user);
            console.log('Generated token:', result.token ? 'success' : 'failed');
          }
          
          // For authenticate, make sure there's a token
          if (method === 'authenticate' && result && result.user && !result.token) {
            console.log('Token missing from authenticate response, generating one');
            result.token = generateUserToken(result.user);
            console.log('Generated token:', result.token ? 'success' : 'failed');
          }
          
          return result;
        } catch (error) {
          console.error(`Error in ${method}:`, error);
          
          // Check if it's a connection error and service might not be running
          if (error.code === 14 || error.details?.includes('UNAVAILABLE')) {
            console.error(`User service appears to be unavailable. Check if it's running on port 50052`);
          }
          
          throw error;
        }
      };
    } else {
      userService[`${method}Async`] = originalMethod;
    }
  }
});

Object.keys(appointmentClient.__proto__).forEach(method => {
  if (typeof appointmentClient[method] === 'function' && method !== 'constructor') {
    appointmentService[`${method}Async`] = promisify(appointmentClient[method].bind(appointmentClient));
  }
});

Object.keys(chatClient.__proto__).forEach(method => {
  if (typeof chatClient[method] === 'function' && method !== 'constructor') {
    chatService[`${method}Async`] = promisify(chatClient[method].bind(chatClient));
  }
});

Object.keys(notificationClient.__proto__).forEach(method => {
  if (typeof notificationClient[method] === 'function' && method !== 'constructor') {
    notificationService[`${method}Async`] = promisify(notificationClient[method].bind(notificationClient));
  }
});

// S'assurer que AskAI est disponible avec la bonne casse
if (!chatService.AskAIAsync && chatClient.AskAI) {
  chatService.AskAIAsync = promisify(chatClient.AskAI.bind(chatClient));
}

// S'assurer que les méthodes du service de notification sont disponibles
const notificationMethods = [
  'SendNotification',
  'SendBulkNotification',
  'GetUserNotifications',
  'MarkNotificationAsRead',
  'UpdateNotificationSettings'
];

notificationMethods.forEach(method => {
  if (!notificationService[`${method}Async`] && notificationClient[method]) {
    notificationService[`${method}Async`] = promisify(notificationClient[method].bind(notificationClient));
  }
});

// S'assurer que les méthodes de statut utilisateur sont disponibles avec la bonne casse
const chatStatusMethods = [
  'UpdateUserStatus',
  'GetUserStatus',
  'GetOnlineUsers',
  'UpdateTypingStatus',
  'GetTypingUsers'
];

chatStatusMethods.forEach(method => {
  if (!chatService[`${method}Async`] && chatClient[method]) {
    chatService[`${method}Async`] = promisify(chatClient[method].bind(chatClient));
  }
});

const appointmentMethods = [
  'RespondToAppointment',
  'AcceptReschedule',
  'DeclineReschedule',
  'AddFeedback',
  'CompleteAppointment',
  'SendAppointmentReminder',
  'GetAppointmentStats'
];

appointmentMethods.forEach(method => {
  if (!appointmentService[`${method}Async`] && appointmentClient[method]) {
    appointmentService[`${method}Async`] = promisify(appointmentClient[method].bind(appointmentClient));
  }
});

module.exports = {
  propertyService,
  userService,
  appointmentService,
  chatService,
  notificationService,
  // Clients bruts
  propertyClient,
  userClient,
  appointmentClient,
  chatClient,
  notificationClient
};