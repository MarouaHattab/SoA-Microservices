const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticateJWT);

// Récupérer toutes les notifications de l'utilisateur connecté
router.get('/', async (req, res) => {
  try {
    // Dans un système réel, vous interrogeriez la base de données
    // Ici, on simule des notifications
    const notifications = [
      {
        id: '1',
        userId: req.user.id,
        type: 'new_property',
        message: 'Une nouvelle propriété correspondant à vos critères a été ajoutée.',
        relatedId: '123',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        userId: req.user.id,
        type: 'appointment_reminder',
        message: 'Rappel: vous avez une visite prévue demain à 14h.',
        relatedId: '456',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Marquer une notification comme lue
router.put('/:id/read', async (req, res) => {
  try {
    // Dans un système réel, vous mettriez à jour la base de données
    // Ici, on simule une réponse
    res.json({
      id: req.params.id,
      userId: req.user.id,
      isRead: true,
      message: 'Notification marquée comme lue'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Marquer toutes les notifications comme lues
router.put('/read-all', async (req, res) => {
  try {
    // Dans un système réel, vous mettriez à jour la base de données
    // Ici, on simule une réponse
    res.json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;