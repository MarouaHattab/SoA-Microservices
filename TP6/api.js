const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = 3000;

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/kafka_messages', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('API connectée à MongoDB'))
.catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Définir le schéma pour les messages (doit être identique à celui du consumer)
const messageSchema = new mongoose.Schema({
  value: String,
  timestamp: { type: Date, default: Date.now }
});

// Créer le modèle
const Message = mongoose.model('Message', messageSchema);

// Middleware pour parser le JSON
app.use(express.json());

// Route pour obtenir tous les messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

// Route pour obtenir un message spécifique par ID
app.get('/api/messages/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du message' });
  }
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`API REST démarrée sur http://localhost:${port}`);
});