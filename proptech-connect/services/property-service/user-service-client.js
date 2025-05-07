// property-service/user-service-client.js
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

module.exports = {
    getUserById
};