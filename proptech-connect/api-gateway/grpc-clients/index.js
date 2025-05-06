const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

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
  grpc.credentials.createInsecure()
);

const userClient = new protoDescriptors.user.UserService(
  'localhost:50052', 
  grpc.credentials.createInsecure()
);

const appointmentClient = new protoDescriptors.appointment.AppointmentService(
  'localhost:50053', 
  grpc.credentials.createInsecure()
);

const chatClient = new protoDescriptors.chat.ChatService(
  'localhost:50054', 
  grpc.credentials.createInsecure()
);

const notificationClient = new protoDescriptors.notification.NotificationService(
  'localhost:50055', 
  grpc.credentials.createInsecure()
);

// Créer des versions promisifiées des méthodes
const propertyService = {};
const userService = {};
const appointmentService = {};
const chatService = {};
const notificationService = {};

// Promisifier les méthodes pour chaque service
Object.keys(propertyClient.__proto__).forEach(method => {
  if (typeof propertyClient[method] === 'function' && method !== 'constructor') {
    propertyService[`${method}Async`] = promisify(propertyClient[method].bind(propertyClient));
  }
});

Object.keys(userClient.__proto__).forEach(method => {
  if (typeof userClient[method] === 'function' && method !== 'constructor') {
    userService[`${method}Async`] = promisify(userClient[method].bind(userClient));
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