// chat-service/user-service-client.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

// Charger le fichier proto du service utilisateur
const USER_PROTO_PATH = path.join(__dirname, '../../proto/user.proto');
const packageDefinition = protoLoader.loadSync(USER_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// Créer le client gRPC
const userClient = new userProto.UserService(
  process.env.USER_SERVICE_URL || 'localhost:50052',
  grpc.credentials.createInsecure()
);

// Promisifier les méthodes du client
const getUser = promisify(userClient.GetUser.bind(userClient));

// Fonction pour récupérer les informations d'un utilisateur
async function getUserById(userId) {
  try {
    const response = await getUser({ id: userId });
    return response.user;
  } catch (error) {
    console.error(`Error getting user ${userId}:`, error);
    // Retourner un utilisateur par défaut si le service est indisponible
    return {
      id: userId,
      username: 'Utilisateur',
      name: 'Utilisateur',
      role: 'buyer'
    };
  }
}
async function getAdminIds() {
  try {
    // Appeler le service utilisateur pour obtenir tous les utilisateurs
    const response = await getUsers({});
    
    // Filtrer les administrateurs et récupérer leurs IDs
    const adminIds = response.users
      .filter(user => user.role === 'admin')
      .map(admin => admin.id);
    
    return adminIds;
  } catch (error) {
    console.error('Error getting admin IDs:', error);
    return []; // Retourner un tableau vide en cas d'erreur
  }
}

module.exports = {
  getUserById
};