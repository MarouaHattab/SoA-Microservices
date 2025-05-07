const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const bodyParser = require('body-parser');
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

// Middleware d'authentification
const { authenticateJWT } = require('./middleware/auth');

// Créer l'application Express
const app = express();

// Middleware
app.use(cors());

// Apply body parser only for non-GraphQL routes
app.use((req, res, next) => {
  if (req.path === '/graphql') {
    return next();
  }
  bodyParser.json({ limit: '50mb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === '/graphql') {
    return next();
  }
  bodyParser.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
});

// Routes API REST
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

// Créer le serveur Apollo pour GraphQL
async function startApolloServer() {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }),
    formatError: (err) => {
      console.error('GraphQL Error:', err);
      return err;
    }
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