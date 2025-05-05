const express = require('express');
const router = express.Router();
const grpcClients = require('../grpc-clients');
const { authenticateJWT } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticateJWT);

// Récupérer le profil de l'utilisateur connecté
router.get('/me', async (req, res) => {
  try {
    const user = await grpcClients.userService.getUserAsync({ id: req.user.id });
    res.json(user);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Récupérer un utilisateur par ID
router.get('/:id', async (req, res) => {
  try {
    // Seuls les admins peuvent voir les détails complets des autres utilisateurs
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const user = await grpcClients.userService.getUserAsync({ id: req.params.id });
    res.json(user);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Récupérer tous les utilisateurs (admin seulement)
router.get('/', async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const users = await grpcClients.userService.getUsersAsync({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour un utilisateur
router.put('/:id', async (req, res) => {
  try {
    // Vérifier que l'utilisateur modifie son propre profil ou est admin
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const userData = {
      id: req.params.id,
      ...req.body
    };
    
    const user = await grpcClients.userService.updateUserAsync(userData);
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Supprimer un utilisateur
router.delete('/:id', async (req, res) => {
  try {
    // Vérifier que l'utilisateur supprime son propre compte ou est admin
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const result = await grpcClients.userService.deleteUserAsync({ id: req.params.id });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;