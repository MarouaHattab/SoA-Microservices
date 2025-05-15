const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('apollo-server-express');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateJWT = (req, res, next) => {
  console.log('AUTH MIDDLEWARE - Request path:', req.path);
  console.log('AUTH MIDDLEWARE - Request method:', req.method);
  
  const authHeader = req.headers.authorization;
  console.log('AUTH MIDDLEWARE - Auth header present:', !!authHeader);

  if (!authHeader) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }

  const token = authHeader.split('Bearer ')[1];
  console.log('AUTH MIDDLEWARE - Token extracted:', !!token);
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token is invalid' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    console.log('AUTH MIDDLEWARE - Token verified, payload:', JSON.stringify(user));
    req.user = user;
    next();
  } catch (error) {
    console.error('AUTH MIDDLEWARE - Token verification error:', error.message);
    return res.status(401).json({ message: 'Authentication token is invalid' });
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé. Vous devez être administrateur.' });
  }

  next();
};

// Function to get and validate user from GraphQL context
const getAuthUser = (context) => {
  // Allow unauthenticated access for some queries (public operations)
  if (!context || !context.req || !context.req.headers) {
    return null;
  }
  
  const authHeader = context.req.headers.authorization;
  if (!authHeader) {
    throw new AuthenticationError('Authentication token is required');
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    throw new AuthenticationError('Authentication token is invalid');
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return user;
  } catch (error) {
    throw new AuthenticationError('Authentication token is invalid');
  }
};

module.exports = {
  authenticateJWT,
  isAdmin,
  getAuthUser
};