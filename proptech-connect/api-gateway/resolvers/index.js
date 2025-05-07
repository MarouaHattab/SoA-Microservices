const jwt = require('jsonwebtoken');
const { AuthenticationError, UserInputError } = require('apollo-server-express');
const grpcClients = require('../grpc-clients');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const getAuthUser = (context) => {
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

const resolvers = {
  Query: {
    // User queries
    me: (_, __, context) => {
      const user = getAuthUser(context);
      return grpcClients.userService.getUserAsync({ id: user.id });
    },
    
    user: (_, { id }) => {
      return grpcClients.userService.getUserAsync({ id });
    },
    
    users: () => {
      return grpcClients.userService.getUsersAsync({});
    },
    
    // Property queries
    property: (_, { id }) => {
      return grpcClients.propertyService.getPropertyAsync({ id });
    },
    
    properties: () => {
      return grpcClients.propertyService.searchPropertiesAsync({});
    },
    
    searchProperties: (_, { input }) => {
      return grpcClients.propertyService.searchPropertiesAsync(input);
    },
    
    // Appointment queries
    appointment: (_, { id }) => {
      return grpcClients.appointmentService.getAppointmentAsync({ id });
    },
    
    userAppointments: (_, { userId }) => {
      return grpcClients.appointmentService.getUserAppointmentsAsync({ user_id: userId });
    },
    
    propertyAppointments: (_, { propertyId }) => {
      return grpcClients.appointmentService.getPropertyAppointmentsAsync({ property_id: propertyId });
    },
    
    // Nouvelle requête pour les statistiques des rendez-vous
    appointmentStats: async (_, { period }, context) => {
      const user = getAuthUser(context);
      
      // Les utilisateurs normaux ne peuvent voir que leurs propres statistiques
      const userId = user.role === 'buyer' || user.role === 'seller' ? user.id : null;
      
      return grpcClients.appointmentService.getAppointmentStatsAsync({ 
        user_id: userId,
        period
      });
    },
    
    // Chat queries
    conversations: (_, __, context) => {
      const user = getAuthUser(context);
      return grpcClients.chatService.getConversationsAsync({ user_id: user.id });
    },
    
    conversation: (_, { id }) => {
      return grpcClients.chatService.getConversationAsync({ id });
    },
    
    messages: (_, { conversationId }) => {
      return grpcClients.chatService.getMessagesAsync({ conversation_id: conversationId });
    },
    
    // Notification queries (simulation, seraient normalement récupérés depuis MongoDB)
    notifications: (_, __, context) => {
      const user = getAuthUser(context);
      // Simuler des notifications, dans un système réel, on interrogerait la base de données
      return [
        {
          id: '1',
          userId: user.id,
          type: 'new_property',
          message: 'Une nouvelle propriété correspondant à vos critères a été ajoutée.',
          relatedId: '123',
          isRead: false,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          userId: user.id,
          type: 'appointment_reminder',
          message: 'Rappel: vous avez une visite prévue demain à 14h.',
          relatedId: '456',
          isRead: true,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];
    },
    
    // AI queries
    askAI: (_, { query, conversationId }, context) => {
      const user = getAuthUser(context);
      return grpcClients.chatService.askAIAsync({ 
        user_id: user.id, 
        query,
        conversation_id: conversationId
      });
    }
  },
  
  Mutation: {
    // User mutations
    register: async (_, { name, email, password, role, phone }) => {
      try {
        const { user, token } = await grpcClients.userService.createUserAsync({
          name, email, password, role, phone
        });
        
        return { user, token };
      } catch (error) {
        throw new UserInputError(error.message);
      }
    },
    
    login: async (_, { email, password }) => {
      try {
        const auth = await grpcClients.userService.authenticateAsync({
          email, password
        });
        
        return auth;
      } catch (error) {
        throw new AuthenticationError(error.message);
      }
    },
    
    updateUser: async (_, { id, ...userData }, context) => {
      const user = getAuthUser(context);
      
      // Vérifier que l'utilisateur modifie son propre profil ou est admin
      if (user.id !== id && user.role !== 'admin') {
        throw new AuthenticationError('Not authorized');
      }
      
      return grpcClients.userService.updateUserAsync({
        id, ...userData
      });
    },
    
    deleteUser: async (_, { id }, context) => {
      const user = getAuthUser(context);
      
      // Vérifier que l'utilisateur supprime son propre compte ou est admin
      if (user.id !== id && user.role !== 'admin') {
        throw new AuthenticationError('Not authorized');
      }
      
      return grpcClients.userService.deleteUserAsync({ id });
    },
    
    // Property mutations
    createProperty: async (_, { input }, context) => {
      const user = getAuthUser(context);
      
      // Ajouter l'ID du propriétaire
      input.owner_id = user.id;
      
      return grpcClients.propertyService.createPropertyAsync(input);
    },
    
    updateProperty: async (_, { id, input }, context) => {
      const user = getAuthUser(context);
      
      // Vérifier que la propriété appartient à l'utilisateur ou que l'utilisateur est admin
      const property = await grpcClients.propertyService.getPropertyAsync({ id });
      
      if (property.owner_id !== user.id && user.role !== 'admin') {
        throw new AuthenticationError('Not authorized');
      }
      
      return grpcClients.propertyService.updatePropertyAsync({
        id, ...input
      });
    },
    
    deleteProperty: async (_, { id }, context) => {
      const user = getAuthUser(context);
      
      // Vérifier que la propriété appartient à l'utilisateur ou que l'utilisateur est admin
      const property = await grpcClients.propertyService.getPropertyAsync({ id });
      
      if (property.owner_id !== user.id && user.role !== 'admin') {
        throw new AuthenticationError('Not authorized');
      }
      
      return grpcClients.propertyService.deletePropertyAsync({ id });
    },
    
    // Appointment mutations
    createAppointment: async (_, { input }, context) => {
      const user = getAuthUser(context);
      
      // S'assurer que l'utilisateur crée un RDV pour lui-même
      if (input.userId !== user.id && user.role !== 'admin' && user.role !== 'agent') {
        throw new AuthenticationError('Not authorized');
      }
      
      return grpcClients.appointmentService.createAppointmentAsync(input);
    },
    
    updateAppointment: async (_, { id, input }, context) => {
      const user = getAuthUser(context);
      
      // Vérifier que le RDV concerne l'utilisateur ou que l'utilisateur est admin/agent
      const appointment = await grpcClients.appointmentService.getAppointmentAsync({ id });
      
      if (appointment.user_id !== user.id && appointment.agent_id !== user.id && user.role !== 'admin') {
        throw new AuthenticationError('Not authorized');
      }
      
      return grpcClients.appointmentService.updateAppointmentAsync({
        id, ...input
      });
    },
    
    deleteAppointment: async (_, { id }, context) => {
      const user = getAuthUser(context);
      
      // Vérifier que le RDV concerne l'utilisateur ou que l'utilisateur est admin/agent
      const appointment = await grpcClients.appointmentService.getAppointmentAsync({ id });
      
      if (appointment.user_id !== user.id && appointment.agent_id !== user.id && user.role !== 'admin') {
        throw new AuthenticationError('Not authorized');
      }
      
      return grpcClients.appointmentService.deleteAppointmentAsync({ id });
    },
    
    // Nouvelles mutations pour les rendez-vous
    respondToAppointment: async (_, { id, input }, context) => {
      const user = getAuthUser(context);
      
      return grpcClients.appointmentService.respondToAppointmentAsync({
        id,
        response: input.response,
        reason: input.reason,
        proposed_date: input.proposedDate,
        responder_id: user.id
      });
    },
    
    acceptReschedule: async (_, { id }, context) => {
      const user = getAuthUser(context);
      
      return grpcClients.appointmentService.acceptRescheduleAsync({
        id,
        user_id: user.id
      });
    },
    
    declineReschedule: async (_, { id, reason }, context) => {
      const user = getAuthUser(context);
      
      return grpcClients.appointmentService.declineRescheduleAsync({
        id,
        user_id: user.id,
        reason
      });
    },
    
    completeAppointment: async (_, { id }, context) => {
      const user = getAuthUser(context);
      
      return grpcClients.appointmentService.completeAppointmentAsync({
        id,
        completed_by: user.id
      });
    },
    
    addAppointmentFeedback: async (_, { id, input }, context) => {
      const user = getAuthUser(context);
      
      return grpcClients.appointmentService.addFeedbackAsync({
        id,
        user_id: user.id,
        rating: input.rating,
        feedback: input.feedback
      });
    },
    
    sendAppointmentReminder: async (_, { id }, context) => {
      const user = getAuthUser(context);
      
      // Vérifier les permissions (seul l'agent ou un admin peut envoyer des rappels manuels)
      const appointment = await grpcClients.appointmentService.getAppointmentAsync({ id });
      
      if (appointment.agent_id !== user.id && user.role !== 'admin') {
        throw new AuthenticationError('Not authorized');
      }
      
      return grpcClients.appointmentService.sendAppointmentReminderAsync({
        id
      });
    },
    
    // Chat mutations
    sendMessage: async (_, { input }, context) => {
      const user = getAuthUser(context);
      
      return grpcClients.chatService.sendMessageAsync({
        sender_id: user.id,
        receiver_id: input.receiverId,
        content: input.content,
        conversation_id: input.conversationId
      });
    },
    
    markMessageAsRead: async (_, { id }, context) => {
      // Dans un système réel, on mettrait à jour le message dans la base de données
      return {
        id,
        isRead: true
      };
    },
    
    // Notification mutations
    markNotificationAsRead: async (_, { id }, context) => {
      // Dans un système réel, on mettrait à jour la notification dans la base de données
      return {
        id,
        isRead: true
      };
    },
    
    markAllNotificationsAsRead: async (_, __, context) => {
      const user = getAuthUser(context);
      // Dans un système réel, on mettrait à jour toutes les notifications de l'utilisateur
      return [
        {
          id: '1',
          userId: user.id,
          type: 'new_property',
          message: 'Une nouvelle propriété correspondant à vos critères a été ajoutée.',
          relatedId: '123',
          isRead: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          userId: user.id,
          type: 'appointment_reminder',
          message: 'Rappel: vous avez une visite prévue demain à 14h.',
          relatedId: '456',
          isRead: true,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];
    }
  },
  
  // Résolveurs pour les relations entre types
  Property: {
    owner: async (parent) => {
      if (!parent.ownerId) return null;
      return grpcClients.userService.getUserAsync({ id: parent.ownerId });
    }
  },
  
  Appointment: {
    property: async (parent) => {
      if (!parent.propertyId) return null;
      return grpcClients.propertyService.getPropertyAsync({ id: parent.propertyId });
    },
    user: async (parent) => {
      if (!parent.userId) return null;
      return grpcClients.userService.getUserAsync({ id: parent.userId });
    },
    agent: async (parent) => {
      if (!parent.agentId) return null;
      return grpcClients.userService.getUserAsync({ id: parent.agentId });
    }
  },
  
  Message: {
    sender: async (parent) => {
      if (!parent.senderId) return null;
      return grpcClients.userService.getUserAsync({ id: parent.senderId });
    },
    receiver: async (parent) => {
      if (!parent.receiverId) return null;
      return grpcClients.userService.getUserAsync({ id: parent.receiverId });
    }
  },
  
  Conversation: {
    participants: async (parent) => {
      if (!parent.participants || parent.participants.length === 0) return [];
      
      const users = [];
      for (const participantId of parent.participants) {
        const user = await grpcClients.userService.getUserAsync({ id: participantId });
        if (user) users.push(user);
      }
      
      return users;
    }
  }
};

module.exports = resolvers;