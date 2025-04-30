// apiGateway.js avec Kafka et MongoDB
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');

// MongoDB Connection (pour la mise en cache ou le suivi des données si nécessaire)
mongoose.connect('mongodb://localhost:27017/moviesdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB successfully!');
});

// Charger les fichiers proto pour les films et les séries TV
const movieProtoPath = 'movie.proto';
const tvShowProtoPath = 'tvShow.proto';
const resolvers = require('./resolvers');
const typeDefs = require('./schema');

// Créer une nouvelle application Express
const app = express();

// Configuration Kafka
const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: ['localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 3
  }
});

// Variables globales pour le producteur et le consommateur
let producer = null;
let consumer = null;

// Fonction de connexion à Kafka
const connectKafka = async () => {
  try {
    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'api-gateway-group' });

    await producer.connect();
    console.log('Kafka Producer connecté avec succès');

    await consumer.connect();
    console.log('Kafka Consumer connecté avec succès');

    // Configurer les topics à écouter
    await consumer.subscribe({ 
      topics: ['movies_topic', 'tvshows_topic'],
      fromBeginning: true 
    });

    // Démarrer la consommation des messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageData = JSON.parse(message.value.toString());
          console.log({
            topic,
            partition,
            message: messageData
          });
          
          // Ici, vous pouvez implémenter une logique pour traiter les messages
          // Par exemple, mettre à jour un cache, notifier les clients connectés, etc.
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
          source: 'api-gateway'
        }) 
      }],
    });
    console.log(`Message envoyé au topic ${topic}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi du message au topic ${topic}:`, error);
  }
};

// Charger les définitions de proto
const movieProtoDefinition = protoLoader.loadSync(movieProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const tvShowProtoDefinition = protoLoader.loadSync(tvShowProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const movieProto = grpc.loadPackageDefinition(movieProtoDefinition).movie;
const tvShowProto = grpc.loadPackageDefinition(tvShowProtoDefinition).tvShow;

// Créer une instance ApolloServer avec le schéma et les résolveurs importés
const server = new ApolloServer({ typeDefs, resolvers });

// Middleware et configuration
app.use(cors());
app.use(bodyParser.json());

// Fonction pour créer un client gRPC pour le service de films
const createMovieClient = () => {
  return new movieProto.MovieService('localhost:50051', grpc.credentials.createInsecure());
};

// Fonction pour créer un client gRPC pour le service de séries TV
const createTVShowClient = () => {
  return new tvShowProto.TVShowService('localhost:50052', grpc.credentials.createInsecure());
};

// Routes REST pour les films
app.get('/movies', (req, res) => {
  const client = createMovieClient();
  const query = req.query.query || '';
  
  client.searchMovies({ query }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response.movies);
    }
  });
});

app.get('/movies/:id', (req, res) => {
  const client = createMovieClient();
  const id = req.params.id;
  
  client.getMovie({ movie_id: id }, (err, response) => {
    if (err) {
      if (err.code === grpc.status.NOT_FOUND) {
        res.status(404).json({ message: `Film avec l'ID ${id} non trouvé` });
      } else {
        res.status(500).send(err);
      }
    } else {
      res.json(response.movie);
    }
  });
});

app.post('/movies', async (req, res) => {
  try {
    const client = createMovieClient();
    const { id, title, description } = req.body;

    client.createMovie({ id, title, description }, async (err, response) => {
      if (err) {
        // Vérifier si c'est une erreur "déjà existant"
        if (err.code === grpc.status.ALREADY_EXISTS) {
          res.status(409).json({ message: 'Un film avec cet ID existe déjà' });
        } else {
          res.status(500).send(err);
        }
      } else {
        // Envoyer un message Kafka
        await sendKafkaMessage('movies_topic', {
          action: 'CREATE',
          movie: response.movie
        });
        
        res.status(201).json(response.movie);
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création du film:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

app.put('/movies/:id', async (req, res) => {
  try {
    const client = createMovieClient();
    const id = req.params.id;
    const { title, description } = req.body;

    client.updateMovie({ id, title, description }, async (err, response) => {
      if (err) {
        if (err.code === grpc.status.NOT_FOUND) {
          res.status(404).json({ message: `Film avec l'ID ${id} non trouvé` });
        } else {
          res.status(500).send(err);
        }
      } else {
        // Envoyer un message Kafka
        await sendKafkaMessage('movies_topic', {
          action: 'UPDATE',
          movie: response.movie
        });
        
        res.json(response.movie);
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du film:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

app.delete('/movies/:id', async (req, res) => {
  try {
    const client = createMovieClient();
    const id = req.params.id;

    client.deleteMovie({ movie_id: id }, async (err, response) => {
      if (err) {
        if (err.code === grpc.status.NOT_FOUND) {
          res.status(404).json({ message: `Film avec l'ID ${id} non trouvé` });
        } else {
          res.status(500).send(err);
        }
      } else {
        // Envoyer un message Kafka
        await sendKafkaMessage('movies_topic', {
          action: 'DELETE',
          movieId: id
        });
        
        res.json({ message: response.message });
      }
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du film:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// Routes REST pour les séries TV
app.get('/tvshows', (req, res) => {
  const client = createTVShowClient();
  const query = req.query.query || '';
  
  client.searchTvshows({ query }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response.tv_shows);
    }
  });
});

app.get('/tvshows/:id', (req, res) => {
  const client = createTVShowClient();
  const id = req.params.id;
  
  client.getTvshow({ tv_show_id: id }, (err, response) => {
    if (err) {
      if (err.code === grpc.status.NOT_FOUND) {
        res.status(404).json({ message: `Série TV avec l'ID ${id} non trouvée` });
      } else {
        res.status(500).send(err);
      }
    } else {
      res.json(response.tv_show);
    }
  });
});

app.post('/tvshows', async (req, res) => {
  try {
    const client = createTVShowClient();
    const { id, title, description } = req.body;

    client.createTvshow({ id, title, description }, async (err, response) => {
      if (err) {
        if (err.code === grpc.status.ALREADY_EXISTS) {
          res.status(409).json({ message: 'Une série TV avec cet ID existe déjà' });
        } else {
          res.status(500).send(err);
        }
      } else {
        // Envoyer un message Kafka
        await sendKafkaMessage('tvshows_topic', {
          action: 'CREATE',
          tv_show: response.tv_show
        });
        
        res.status(201).json(response.tv_show);
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création de la série TV:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

app.put('/tvshows/:id', async (req, res) => {
  try {
    const client = createTVShowClient();
    const id = req.params.id;
    const { title, description } = req.body;

    client.updateTvshow({ id, title, description }, async (err, response) => {
      if (err) {
        if (err.code === grpc.status.NOT_FOUND) {
          res.status(404).json({ message: `Série TV avec l'ID ${id} non trouvée` });
        } else {
          res.status(500).send(err);
        }
      } else {
        // Envoyer un message Kafka
        await sendKafkaMessage('tvshows_topic', {
          action: 'UPDATE',
          tv_show: response.tv_show
        });
        
        res.json(response.tv_show);
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la série TV:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

app.delete('/tvshows/:id', async (req, res) => {
  try {
    const client = createTVShowClient();
    const id = req.params.id;

    client.deleteTvshow({ tv_show_id: id }, async (err, response) => {
      if (err) {
        if (err.code === grpc.status.NOT_FOUND) {
          res.status(404).json({ message: `Série TV avec l'ID ${id} non trouvée` });
        } else {
          res.status(500).send(err);
        }
      } else {
        // Envoyer un message Kafka
        await sendKafkaMessage('tvshows_topic', {
          action: 'DELETE',
          tvShowId: id
        });
        
        res.json({ message: response.message });
      }
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la série TV:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// Route GraphQL
server.start().then(() => {
  app.use(
    '/graphql',
    expressMiddleware(server),
  );
});

// Démarrer le serveur
const startServer = async () => {
  // Essayer de se connecter à Kafka
  await connectKafka();

  // Démarrer l'application Express
  const port = 3000;
  app.listen(port, () => {
    console.log(`API Gateway en cours d'exécution sur le port ${port}`);
    console.log(`API REST disponible sur http://localhost:${port}/`);
    console.log(`API GraphQL disponible sur http://localhost:${port}/graphql`);
  });
};

// Gestion de la fermeture propre
process.on('SIGINT', async () => {
  try {
    if (producer) await producer.disconnect();
    if (consumer) await consumer.disconnect();
    await mongoose.connection.close();
    console.log('Connexions fermées proprement');
  } catch (error) {
    console.error('Erreur lors de la fermeture des connexions:', error);
  }
  process.exit(0);
});

// Lancer le serveur
startServer().catch(console.error);