// resolvers.js avec mutations et Kafka
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Charger les fichiers proto pour les films et les séries TV
const movieProtoPath = 'movie.proto';
const tvShowProtoPath = 'tvShow.proto';
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

// Fonction pour créer un client gRPC pour le service de films
const createMovieClient = () => {
  return new movieProto.MovieService('localhost:50051', grpc.credentials.createInsecure());
};

// Fonction pour créer un client gRPC pour le service de séries TV
const createTVShowClient = () => {
  return new tvShowProto.TVShowService('localhost:50052', grpc.credentials.createInsecure());
};

// Définir les résolveurs pour les requêtes et mutations GraphQL
const resolvers = {
  // Requêtes
  Query: {
    // Récupérer un film par ID
    movie: (_, { id }) => {
      const client = createMovieClient();
      return new Promise((resolve, reject) => {
        client.getMovie({ movie_id: id }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.movie);
          }
        });
      });
    },
    
    // Récupérer tous les films ou rechercher des films
    movies: (_, { query = "" }) => {
      const client = createMovieClient();
      return new Promise((resolve, reject) => {
        client.searchMovies({ query }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.movies);
          }
        });
      });
    },
    
    // Récupérer une série TV par ID
    tvShow: (_, { id }) => {
      const client = createTVShowClient();
      return new Promise((resolve, reject) => {
        client.getTvshow({ tv_show_id: id }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.tv_show);
          }
        });
      });
    },
    
    // Récupérer toutes les séries TV ou rechercher des séries TV
    tvShows: (_, { query = "" }) => {
      const client = createTVShowClient();
      return new Promise((resolve, reject) => {
        client.searchTvshows({ query }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.tv_shows);
          }
        });
      });
    },
  },
  
  // Mutations
  Mutation: {
    // Créer un film
    createMovie: (_, { id, title, description }) => {
      const client = createMovieClient();
      return new Promise((resolve, reject) => {
        client.createMovie({ id, title, description }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.movie);
          }
        });
      });
    },
    
    // Mettre à jour un film
    updateMovie: (_, { id, title, description }) => {
      const client = createMovieClient();
      return new Promise((resolve, reject) => {
        client.updateMovie({ id, title, description }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.movie);
          }
        });
      });
    },
    
    // Supprimer un film
    deleteMovie: (_, { id }) => {
      const client = createMovieClient();
      return new Promise((resolve, reject) => {
        client.deleteMovie({ movie_id: id }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              success: true, 
              message: response.message
            });
          }
        });
      });
    },
    
    // Créer une série TV
    createTVShow: (_, { id, title, description }) => {
      const client = createTVShowClient();
      return new Promise((resolve, reject) => {
        client.createTvshow({ id, title, description }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.tv_show);
          }
        });
      });
    },
    
    // Mettre à jour une série TV
    updateTVShow: (_, { id, title, description }) => {
      const client = createTVShowClient();
      return new Promise((resolve, reject) => {
        client.updateTvshow({ id, title, description }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.tv_show);
          }
        });
      });
    },
    
    // Supprimer une série TV
    deleteTVShow: (_, { id }) => {
      const client = createTVShowClient();
      return new Promise((resolve, reject) => {
        client.deleteTvshow({ tv_show_id: id }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              success: true, 
              message: response.message
            });
          }
        });
      });
    },
  },
};

module.exports = resolvers;