const express = require('express');
const router = express.Router();
const grpcClients = require('../grpc-clients');

// Endpoint d'inscription
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    
    const { user, token } = await grpcClients.userService.createUserAsync({
      name, email, password, role, phone
    });
    
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Endpoint de connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const auth = await grpcClients.userService.authenticateAsync({
      email, password
    });
    
    res.json(auth);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

module.exports = router;