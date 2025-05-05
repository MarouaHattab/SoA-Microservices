const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

console.log('Démarrage du service de chat...');
console.log('Variables d\'environnement chargées:', {
  MONGODB_URI: process.env.MONGODB_URI ? 'Défini' : 'Non défini',
  PORT: process.env.PORT ? process.env.PORT : 'Non défini',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Défini' : 'Non défini'
});

// Chemins des fichiers proto
const PROTO_PATH = path.join(__dirname, '../../proto/chat.proto');

// Charger les modèles Mongoose
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Charger le service depuis le fichier proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;

// Implémentation du service
const chatService = {
  SendMessage: async (call, callback) => {
    try {
      const { sender_id, receiver_id, content, conversation_id } = call.request;
      console.log(`Sending message from ${sender_id} to ${receiver_id}`);
      
      let actualConversationId = conversation_id;
      
      // Si aucune conversation n'est spécifiée, créer une nouvelle conversation
      if (!actualConversationId) {
        const newConversation = new Conversation({
          participants: [sender_id, receiver_id],
          is_ai_conversation: receiver_id === 'AI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        const savedConversation = await newConversation.save();
        actualConversationId = savedConversation._id.toString();
        console.log(`Created new conversation: ${actualConversationId}`);
      }
      
      // Créer le nouveau message
      const newMessage = new Message({
        conversation_id: actualConversationId,
        sender_id,
        receiver_id,
        content,
        is_read: false,
        is_ai: false,
        created_at: new Date().toISOString()
      });
      
      const savedMessage = await newMessage.save();
      
      // Mettre à jour la date de mise à jour de la conversation
      await Conversation.findByIdAndUpdate(actualConversationId, {
        updated_at: new Date().toISOString()
      });
      
      callback(null, {
        message: {
          id: savedMessage._id.toString(),
          conversation_id: savedMessage.conversation_id,
          sender_id: savedMessage.sender_id,
          receiver_id: savedMessage.receiver_id,
          content: savedMessage.content,
          is_read: savedMessage.is_read,
          created_at: savedMessage.created_at
        }
      });
    } catch (error) {
      console.error('Error in SendMessage:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  GetMessages: async (call, callback) => {
    try {
      const { conversation_id } = call.request;
      console.log(`Getting messages for conversation: ${conversation_id}`);
      
      const messages = await Message.find({ conversation_id })
        .sort({ created_at: 1 })
        .exec();
      
      const result = messages.map(message => ({
        id: message._id.toString(),
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        content: message.content,
        is_read: message.is_read,
        is_ai: message.is_ai || false,
        created_at: message.created_at
      }));
      
      callback(null, { messages: result });
    } catch (error) {
      console.error('Error in GetMessages:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  GetConversations: async (call, callback) => {
    try {
      const { user_id } = call.request;
      console.log(`Getting conversations for user: ${user_id}`);
      
      const conversations = await Conversation.find({
        participants: user_id
      }).sort({ updated_at: -1 });
      
      const result = [];
      
      for (const conversation of conversations) {
        const lastMessage = await Message.findOne({ conversation_id: conversation._id })
          .sort({ created_at: -1 })
          .exec();
        
        result.push({
          id: conversation._id.toString(),
          participants: conversation.participants,
          last_message: lastMessage ? {
            id: lastMessage._id.toString(),
            content: lastMessage.content,
            sender_id: lastMessage.sender_id,
            is_read: lastMessage.is_read,
            created_at: lastMessage.created_at
          } : null,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at
        });
      }
      
      callback(null, { conversations: result });
    } catch (error) {
      console.error('Error in GetConversations:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  AskAI: async (call, callback) => {
    try {
      const { user_id, query, conversation_id } = call.request;
      
      console.log(`User ${user_id} asking AI: ${query}`);
      
      // Obtenir le contexte de la conversation si conversation_id est fourni
      let context = '';
      if (conversation_id) {
        try {
          // Récupérer les messages précédents (maximum 5 derniers)
          const messages = await Message.find({ conversation_id })
            .sort({ created_at: -1 })
            .limit(5)
            .exec();
          
          if (messages && messages.length > 0) {
            context = messages.reverse().map(m => 
              `${m.sender_id === 'AI' ? 'Assistant' : 'Utilisateur'}: ${m.content}`
            ).join('\n');
          }
        } catch (err) {
          console.error('Error retrieving conversation context:', err);
        }
      }
      
      // Appeler l'API Gemini
      const geminiClient = require('./gemini-client');
      let aiResponse;
      try {
        aiResponse = await geminiClient.getGeminiResponse(query, context);
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
        // Utiliser une réponse de secours en cas d'échec
        aiResponse = "Je suis désolé, mais je rencontre des difficultés à traiter votre demande pour le moment. Pourriez-vous reformuler votre question ou essayer à nouveau plus tard?";
      }
      
      console.log('AI Response:', aiResponse.substring(0, 100) + '...');
      
      // Rechercher des propriétés pertinentes à suggérer
      const propertySuggestions = await require('./property-suggestions').findRelevantProperties(query);
      
      // Enregistrer la réponse en tant que message si conversation_id est fourni
      if (conversation_id) {
        try {
          const newMessage = new Message({
            conversation_id,
            sender_id: 'AI',
            receiver_id: user_id,
            content: aiResponse,
            is_read: false,
            is_ai: true,
            created_at: new Date().toISOString()
          });
          
          await newMessage.save();
          console.log('AI response saved to conversation');
        } catch (dbError) {
          console.error('Error saving AI response to database:', dbError);
        }
      }
      
      callback(null, {
        response: aiResponse,
        suggested_properties: propertySuggestions || []
      });
    } catch (error) {
      console.error('Error in AskAI:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: `Error processing AI request: ${error.message}`
      });
    }
  }
};

// Connect to MongoDB
const PORT = process.env.PORT || 50054;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-chat';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connecté à MongoDB');
    
    // Create and start gRPC server
    const server = new grpc.Server();
    server.addService(chatProto.ChatService.service, chatService);
    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
      if (error) {
        console.error('Failed to start gRPC server:', error);
        return;
      }
      
      server.start();
      console.log(`Service de chat démarré sur le port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Erreur de connexion à MongoDB:', error);
  });