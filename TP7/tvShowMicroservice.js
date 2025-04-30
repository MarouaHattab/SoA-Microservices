// tvShowMicroservice.js avec Kafka et MongoDB
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/moviesdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB successfully!');
});

// TVShow Schema
const TVShowSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create TVShow Model
const TVShow = mongoose.model('TVShow', TVShowSchema);

// Configuration Kafka
const kafka = new Kafka({
  clientId: 'tvshow-service',
  brokers: ['localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 3
  }
});

// Créer des instances pour le producteur et le consommateur
let producer = null;
let consumer = null;

// Fonction de connexion à Kafka
const connectKafka = async () => {
  try {
    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'tvshow-service-group' });

    await producer.connect();
    console.log('Kafka Producer connecté avec succès');

    await consumer.connect();
    console.log('Kafka Consumer connecté avec succès');

    // S'abonner au topic des séries TV
    await consumer.subscribe({ 
      topics: ['tvshows_topic'],
      fromBeginning: true 
    });

    // Démarrer la consommation des messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageData = JSON.parse(message.value.toString());
          console.log('Message reçu:', messageData);
          
          // Traiter différentes actions en fonction du message
          if (messageData.source !== 'tvshow-service') {
            console.log('Traitement du message d\'un autre service:', messageData);
          }
        } catch (error) {
          console.error('Erreur lors du traitement du message:', error);
        }
      },
    });
  } catch (error) {
    console.error('Erreur de connexion à Kafka:', error);
  }
};

// Fonction d'envoi de message Kafka
const sendKafkaMessage = async (topic, message) => {
  if (!producer) {
    console.warn('Producteur Kafka non connecté');
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [{ 
        value: JSON.stringify({
          ...message,
          source: 'tvshow-service' // Ajouter la source pour éviter des boucles
        }) 
      }],
    });
    console.log(`Message envoyé au topic ${topic}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi du message au topic ${topic}:`, error);
  }
};

// Charger le fichier tvShow.proto
const tvShowProtoPath = 'tvShow.proto';
const tvShowProtoDefinition = protoLoader.loadSync(tvShowProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const tvShowProto = grpc.loadPackageDefinition(tvShowProtoDefinition).tvShow;

// Convertir un document MongoDB en objet compatible gRPC
const convertToGrpcTVShow = (tvShow) => ({
  id: tvShow.id,
  title: tvShow.title,
  description: tvShow.description
});

// Implémenter le service de séries TV
const tvShowService = {
  getTvshow: async (call, callback) => {
    try {
      const { tv_show_id } = call.request;
      
      // Rechercher la série TV par ID
      const tvShow = await TVShow.findOne({ id: tv_show_id });
      
      // Gérer le cas où la série TV n'est pas trouvée
      if (!tvShow) {
        callback({
          code: grpc.status.NOT_FOUND,
          details: `Série TV avec l'ID ${tv_show_id} non trouvée`
        });
        return;
      }

      // Répondre avec la série TV trouvée
      callback(null, { 
        tv_show: convertToGrpcTVShow(tvShow) 
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de la série TV:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: `Erreur interne: ${error.message}`
      });
    }
  },
  
  searchTvshows: async (call, callback) => {
    try {
      const { query } = call.request;
      let tvShows;

      // Si une requête est fournie, rechercher par titre
      if (query) {
        tvShows = await TVShow.find({ 
          title: { $regex: query, $options: 'i' } 
        });
      } else {
        // Sinon, récupérer toutes les séries TV
        tvShows = await TVShow.find();
      }

      // Convertir les séries TV en format compatible gRPC
      const grpcTVShows = tvShows.map(convertToGrpcTVShow);
      
      callback(null, { tv_shows: grpcTVShows });
    } catch (error) {
      console.error('Erreur lors de la recherche de séries TV:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: `Erreur interne: ${error.message}`
      });
    }
  },
  
  createTvshow: async (call, callback) => {
    try {
      const { id, title, description } = call.request;
      
      // Vérifier si la série TV existe déjà
      const existingTVShow = await TVShow.findOne({ id });
      if (existingTVShow) {
        // Utiliser un code d'erreur gRPC approprié
        callback({
          code: grpc.status.ALREADY_EXISTS,
          details: `Une série TV avec l'ID ${id} existe déjà`
        });
        return;
      }

      // Créer une nouvelle série TV
      const newTVShow = new TVShow({ 
        id, 
        title, 
        description 
      });
      
      // Sauvegarder dans la base de données
      await newTVShow.save();
      
      // Convertir en format gRPC
      const grpcTVShow = convertToGrpcTVShow(newTVShow);
      
      // Publier un message dans Kafka
      sendKafkaMessage('tvshows_topic', {
        action: 'CREATE',
        tv_show: grpcTVShow
      });
      
      // Répondre avec la série TV créée
      callback(null, { tv_show: grpcTVShow });
    } catch (error) {
      console.error('Erreur lors de la création de la série TV:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: `Erreur interne: ${error.message}`
      });
    }
  },
  
  updateTvshow: async (call, callback) => {
    try {
      const { id, title, description } = call.request;
      
      // Rechercher et mettre à jour la série TV
      const updatedTVShow = await TVShow.findOneAndUpdate(
        { id }, 
        { title, description }, 
        { 
          new: true,
          runValidators: true
        }
      );

      // Gérer le cas où la série TV n'est pas trouvée
      if (!updatedTVShow) {
        callback({
          code: grpc.status.NOT_FOUND,
          details: `Série TV avec l'ID ${id} non trouvée`
        });
        return;
      }

      // Convertir en format gRPC
      const grpcTVShow = convertToGrpcTVShow(updatedTVShow);
      
      // Publier un message dans Kafka
      sendKafkaMessage('tvshows_topic', {
        action: 'UPDATE',
        tv_show: grpcTVShow
      });
      
      // Répondre avec la série TV mise à jour
      callback(null, { tv_show: grpcTVShow });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la série TV:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: `Erreur interne: ${error.message}`
      });
    }
  },
  
  deleteTvshow: async (call, callback) => {
    try {
      const { tv_show_id } = call.request;
      
      // Trouver la série TV avant de la supprimer
      const tvShow = await TVShow.findOne({ id: tv_show_id });
      
      // Gérer le cas où la série TV n'est pas trouvée
      if (!tvShow) {
        callback({
          code: grpc.status.NOT_FOUND,
          details: `Série TV avec l'ID ${tv_show_id} non trouvée`
        });
        return;
      }

      // Supprimer la série TV
      await TVShow.deleteOne({ id: tv_show_id });
      
      // Publier un message dans Kafka
      sendKafkaMessage('tvshows_topic', {
        action: 'DELETE',
        tv_show: convertToGrpcTVShow(tvShow)
      });
      
      // Répondre avec succès
      callback(null, { message: `Série TV ${tv_show_id} supprimée avec succès` });
    } catch (error) {
      console.error('Erreur lors de la suppression de la série TV:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: `Erreur interne: ${error.message}`
      });
    }
  }
};

// Créer et démarrer le serveur gRPC
const server = new grpc.Server();
server.addService(tvShowProto.TVShowService.service, tvShowService);
const port = 50052;

// Fonction pour démarrer le serveur
const startServer = async () => {
  try {
    // Se connecter à Kafka
    await connectKafka();
    
    // Démarrer le serveur gRPC
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        console.error('Échec de la liaison du serveur:', err);
        return;
      }
      console.log(`Le serveur gRPC s'exécute sur le port ${port}`);
      server.start();
    });
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
  }
};

// Gestion de la fermeture propre
process.on('SIGINT', async () => {
  try {
    if (producer) await producer.disconnect();
    if (consumer) await consumer.disconnect();
    await mongoose.connection.close();
    server.forceShutdown();
    console.log('Serveur arrêté proprement');
  } catch (error) {
    console.error('Erreur lors de la fermeture:', error);
  }
  process.exit(0);
});

// Démarrer le serveur
startServer();