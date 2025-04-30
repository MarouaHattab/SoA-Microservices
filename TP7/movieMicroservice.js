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

// Movie Schema
const MovieSchema = new mongoose.Schema({
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

// Create Movie Model
const Movie = mongoose.model('Movie', MovieSchema);

// Configuration Kafka
const kafka = new Kafka({
  clientId: 'movie-service',
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
    consumer = kafka.consumer({ groupId: 'movie-service-group' });

    await producer.connect();
    console.log('Kafka Producer connecté avec succès');

    await consumer.connect();
    console.log('Kafka Consumer connecté avec succès');

    // S'abonner au topic des films
    await consumer.subscribe({ 
      topics: ['movies_topic'],
      fromBeginning: true 
    });

    // Démarrer la consommation des messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageData = JSON.parse(message.value.toString());
          console.log('Message reçu:', messageData);
          
          // Traiter différentes actions en fonction du message
          // Exemple: Si d'autres services mettent à jour un film, synchroniser notre base locale
          if (messageData.source !== 'movie-service') {
            // Le message vient d'un autre service, évite une boucle de mise à jour
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
          source: 'movie-service' // Ajouter la source pour éviter des boucles
        }) 
      }],
    });
    console.log(`Message envoyé au topic ${topic}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi du message au topic ${topic}:`, error);
  }
};

// Charger le fichier movie.proto
const movieProtoPath = 'movie.proto';
const movieProtoDefinition = protoLoader.loadSync(movieProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const movieProto = grpc.loadPackageDefinition(movieProtoDefinition).movie;

// Convertir un document MongoDB en objet compatible gRPC
const convertToGrpcMovie = (movie) => ({
  id: movie.id,
  title: movie.title,
  description: movie.description
});

// Implémenter le service movie
const movieService = {
  getMovie: async (call, callback) => {
    try {
      const { movie_id } = call.request;
      
      // Rechercher le film par ID
      const movie = await Movie.findOne({ id: movie_id });
      
      // Gérer le cas où le film n'est pas trouvé
      if (!movie) {
        callback({
          code: grpc.status.NOT_FOUND,
          details: `Film avec l'ID ${movie_id} non trouvé`
        });
        return;
      }

      // Répondre avec le film trouvé
      callback(null, { 
        movie: convertToGrpcMovie(movie) 
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du film:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: `Erreur interne: ${error.message}`
      });
    }
  },
  
  searchMovies: async (call, callback) => {
    try {
      const { query } = call.request;
      let movies;

      // Si une requête est fournie, rechercher par titre
      if (query) {
        movies = await Movie.find({ 
          title: { $regex: query, $options: 'i' } 
        });
      } else {
        // Sinon, récupérer tous les films
        movies = await Movie.find();
      }

      // Convertir les films en format compatible gRPC
      const grpcMovies = movies.map(convertToGrpcMovie);
      
      callback(null, { movies: grpcMovies });
    } catch (error) {
      console.error('Erreur lors de la recherche de films:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: `Erreur interne: ${error.message}`
      });
    }
  },
  
  createMovie: async (call, callback) => {
    try {
      const { id, title, description } = call.request;
      
      // Vérifier si le film existe déjà
      const existingMovie = await Movie.findOne({ id });
      if (existingMovie) {
        // Utiliser un code d'erreur gRPC approprié
        callback({
          code: grpc.status.ALREADY_EXISTS,
          details: `Un film avec l'ID ${id} existe déjà`
        });
        return;
      }

      // Créer un nouveau film
      const newMovie = new Movie({ 
        id, 
        title, 
        description 
      });
      
      // Sauvegarder dans la base de données
      await newMovie.save();

      // Convertir en format gRPC
      const grpcMovie = convertToGrpcMovie(newMovie);
      
      // Publier un message dans Kafka
      sendKafkaMessage('movies_topic', {
        action: 'CREATE',
        movie: grpcMovie
      });
      
      // Répondre avec le film créé
      callback(null, { movie: grpcMovie });
    } catch (error) {
      console.error('Erreur lors de la création du film:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: `Erreur interne: ${error.message}`
      });
    }
  },
  
  updateMovie: async (call, callback) => {
    try {
      const { id, title, description } = call.request;
      
      // Rechercher et mettre à jour le film
      const updatedMovie = await Movie.findOneAndUpdate(
        { id }, 
        { title, description }, 
        { 
          new: true,
          runValidators: true
        }
      );

      // Gérer le cas où le film n'est pas trouvé
      if (!updatedMovie) {
        callback({
          code: grpc.status.NOT_FOUND,
          details: `Film avec l'ID ${id} non trouvé`
        });
        return;
      }

      // Convertir en format gRPC
      const grpcMovie = convertToGrpcMovie(updatedMovie);

      // Publier un message dans Kafka
      sendKafkaMessage('movies_topic', {
        action: 'UPDATE',
        movie: grpcMovie
      });
      
      // Répondre avec le film mis à jour
      callback(null, { movie: grpcMovie });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du film:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: `Erreur interne: ${error.message}`
      });
    }
  },
  
  deleteMovie: async (call, callback) => {
    try {
      const { movie_id } = call.request;
      
      // Trouver le film avant de le supprimer
      const movie = await Movie.findOne({ id: movie_id });
      
      // Gérer le cas où le film n'est pas trouvé
      if (!movie) {
        callback({
          code: grpc.status.NOT_FOUND,
          details: `Film avec l'ID ${movie_id} non trouvé`
        });
        return;
      }

      // Supprimer le film
      await Movie.deleteOne({ id: movie_id });

      // Publier un message dans Kafka
      sendKafkaMessage('movies_topic', {
        action: 'DELETE',
        movie: convertToGrpcMovie(movie)
      });
      
      // Répondre avec succès
      callback(null, { message: `Film ${movie_id} supprimé avec succès` });
    } catch (error) {
      console.error('Erreur lors de la suppression du film:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: `Erreur interne: ${error.message}`
      });
    }
  }
};

// Créer et démarrer le serveur gRPC
const server = new grpc.Server();
server.addService(movieProto.MovieService.service, movieService);
const port = 50051;

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