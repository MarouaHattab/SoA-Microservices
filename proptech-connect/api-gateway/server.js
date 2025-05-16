const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
require('dotenv').config();

// Importer les schémas et résolveurs GraphQL
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

// Importer les routes
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const appointmentRoutes = require('./routes/appointments');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const predictorRoutes = require('./routes/predictor');

// Middleware d'authentification
const { authenticateJWT } = require('./middleware/auth');

// Créer l'application Express
const app = express();

// Middleware
app.use(cors());

// Apply body parser for all routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Routes API REST
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/predictor', predictorRoutes);

// Créer le serveur Apollo pour GraphQL
async function startApolloServer() {
  const apolloServer = new ApolloServer({
    introspection: true, // Enable introspection for debugging
    debug: true, // Enable debug mode to get more info on errors
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }),
    formatError: (err) => {
      // Get full details of the error
      console.error('GraphQL Error Details:', JSON.stringify(err, null, 2));
      console.error('GraphQL Error:', err);
      return err;
    },
    plugins: [
      {
        async requestDidStart(ctx) {
          console.log('Request started:', {
            query: ctx.request.query,
            operationName: ctx.request.operationName,
            variables: ctx.request.variables,
          });
          
          return {
            async didEncounterErrors(ctx) {
              console.error('GraphQL encountered errors:', ctx.errors);
            },
            async willSendResponse(ctx) {
              console.log('Response data:', JSON.stringify(ctx.response.data, null, 2));
              if (ctx.response.errors) {
                console.error('Response errors:', JSON.stringify(ctx.response.errors, null, 2));
              }
            }
          };
        }
      }
    ]
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    path: '/graphql',
    bodyParserConfig: false // Let Apollo handle its own body parsing
  });

  // Démarrer le serveur
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}${apolloServer.graphqlPath}`);
  });
}

startApolloServer().catch(error => {
  console.error('Failed to start API Gateway:', error);
});