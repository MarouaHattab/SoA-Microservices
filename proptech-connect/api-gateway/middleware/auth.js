const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication token is invalid' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication token is invalid' });
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé. Vous devez être administrateur.' });
  }

  next();
};

module.exports = {
  authenticateJWT,
  isAdmin
};