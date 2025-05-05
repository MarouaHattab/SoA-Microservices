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

module.exports = {
  authenticateJWT
};