const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticateJWT);

// Autres routes existantes pour les conversations et messages...

// Version simulée du service IA
// Route pour l'IA
router.post('/ai', authenticateJWT, async (req, res) => {
    try {
      const { query, conversation_id } = req.body;
      
      const grpcClients = require('../grpc-clients');
      
      // Essayer d'abord d'utiliser la méthode promisifiée
      if (grpcClients.chatService && grpcClients.chatService.AskAIAsync) {
        const result = await grpcClients.chatService.AskAIAsync({
          user_id: req.user.id,
          query,
          conversation_id
        });
        
        return res.json(result);
      }
      
      // Sinon utiliser le client brut
      if (grpcClients.chatClient && grpcClients.chatClient.AskAI) {
        grpcClients.chatClient.AskAI({
          user_id: req.user.id,
          query,
          conversation_id
        }, (err, response) => {
          if (err) {
            console.error('Erreur AI:', err);
            return res.status(500).json({ message: err.message });
          }
          
          res.json(response);
        });
      } else {
        throw new Error('Service AI non disponible');
      }
    } catch (error) {
      console.error('Error in AI chat:', error);
      res.status(500).json({ message: error.message });
    }
  });
module.exports = router;