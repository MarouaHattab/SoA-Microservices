const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

// Chemins corrects vers les fichiers proto
const propertyProtoPath = path.join(__dirname, '../../proto/property.proto');
const userProtoPath = path.join(__dirname, '../../proto/user.proto');
const appointmentProtoPath = path.join(__dirname, '../../proto/appointment.proto');
const chatProtoPath = path.join(__dirname, '../../proto/chat.proto');

console.log('Chat proto path:', chatProtoPath);

const packageDefinition = {
  property: protoLoader.loadSync(propertyProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }),
  user: protoLoader.loadSync(userProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }),
  appointment: protoLoader.loadSync(appointmentProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }),
  chat: protoLoader.loadSync(chatProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })
};

// Charger les définitions
const protoDescriptors = {
  property: grpc.loadPackageDefinition(packageDefinition.property).property,
  user: grpc.loadPackageDefinition(packageDefinition.user).user,
  appointment: grpc.loadPackageDefinition(packageDefinition.appointment).appointment,
  chat: grpc.loadPackageDefinition(packageDefinition.chat).chat
};

// Vérifier les services et méthodes
console.log('Chat service descriptor:', Object.keys(protoDescriptors.chat));
console.log('Chat service methods:', Object.keys(protoDescriptors.chat.ChatService.service));

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

// Vérifier les méthodes disponibles dans les clients
console.log('Chat client methods:', Object.getOwnPropertyNames(chatClient.__proto__));

// Créer des versions promisifiées des méthodes
const propertyService = {};
const userService = {};
const appointmentService = {};
const chatService = {};

// Promisifier les méthodes du service Property
Object.keys(propertyClient.__proto__).forEach(method => {
  if (typeof propertyClient[method] === 'function' && method !== 'constructor') {
    propertyService[`${method}Async`] = promisify(propertyClient[method].bind(propertyClient));
  }
});

// Promisifier les méthodes du service User
Object.keys(userClient.__proto__).forEach(method => {
  if (typeof userClient[method] === 'function' && method !== 'constructor') {
    userService[`${method}Async`] = promisify(userClient[method].bind(userClient));
  }
});

// Promisifier les méthodes du service Appointment
Object.keys(appointmentClient.__proto__).forEach(method => {
  if (typeof appointmentClient[method] === 'function' && method !== 'constructor') {
    appointmentService[`${method}Async`] = promisify(appointmentClient[method].bind(appointmentClient));
  }
});

// Promisifier les méthodes du service Chat
Object.keys(chatClient.__proto__).forEach(method => {
  if (typeof chatClient[method] === 'function' && method !== 'constructor') {
    chatService[`${method}Async`] = promisify(chatClient[method].bind(chatClient));
  }
});

// Ajouter manuellement la méthode AskAI avec la bonne casse
if (!chatService.AskAIAsync && chatClient.AskAI) {
  console.log('Ajout manuel de AskAIAsync');
  chatService.AskAIAsync = promisify(chatClient.AskAI.bind(chatClient));
}

console.log('User service methods:', Object.keys(userService));
console.log('Property service methods:', Object.keys(propertyService));
console.log('Appointment service methods:', Object.keys(appointmentService));
console.log('Chat service methods:', Object.keys(chatService));

// Si la méthode AskAI n'est toujours pas disponible, créer une version spéciale
if (!chatService.AskAIAsync) {
  console.log('La méthode AskAIAsync n\'est pas disponible, création d\'une version de secours');
  chatService.AskAIAsync = async (params) => {
    return new Promise((resolve, reject) => {
      try {
        chatClient.AskAI(params, (err, response) => {
          if (err) {
            console.error('Erreur AskAI:', err);
            reject(err);
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        console.error('Exception dans AskAI:', error);
        reject(error);
      }
    });
  };
}

// Exporter à la fois les services promisifiés et les clients bruts
module.exports = {
  propertyService,
  userService,
  appointmentService,
  chatService,
  // Clients bruts
  propertyClient,
  userClient,
  appointmentClient,
  chatClient
};