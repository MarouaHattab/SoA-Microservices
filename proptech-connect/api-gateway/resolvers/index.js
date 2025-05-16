const jwt = require('jsonwebtoken');
const { AuthenticationError, UserInputError } = require('apollo-server-express');
const grpcClients = require('../grpc-clients');
const propertyResolvers = require('./property-resolvers');
const { getAuthUser } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to convert snake_case to camelCase
function toCamelCase(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  return Object.keys(obj).reduce((camelObj, key) => {
    // Convert key from snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Convert value recursively if it's an object
    const value = obj[key];
    camelObj[camelKey] = toCamelCase(value);
    
    return camelObj;
  }, {});
}

const resolvers = {
  Query: {
    // User queries
    me: (_, __, context) => {
      const user = getAuthUser(context);
      return grpcClients.userService.getUserAsync({ id: user.id })
        .then(result => toCamelCase(result));
    },
    
    user: (_, { id }) => {
      return grpcClients.userService.getUserAsync({ id })
        .then(result => toCamelCase(result));
    },
    
    users: () => {
      return grpcClients.userService.getUsersAsync({})
        .then(result => {
          if (result && result.users) {
            return result.users.map(user => toCamelCase(user));
          }
          return [];
        });
    },
    
    // Property queries - use the dedicated resolver
    ...propertyResolvers.Query,
    
    // Appointment queries
    appointment: (_, { id }) => {
      return grpcClients.appointmentService.getAppointmentAsync({ id })
        .then(result => {
          if (result && result.appointment) {
            return toCamelCase(result.appointment);
          }
          return null;
        });
    },
    
    userAppointments: (_, { userId }) => {
      return grpcClients.appointmentService.getUserAppointmentsAsync({ user_id: userId })
        .then(result => {
          if (result && result.appointments) {
            return result.appointments.map(appointment => toCamelCase(appointment));
          }
          return [];
        });
    },
    
    propertyAppointments: (_, { propertyId }) => {
      return grpcClients.appointmentService.getPropertyAppointmentsAsync({ property_id: propertyId })
        .then(result => {
          if (result && result.appointments) {
            return result.appointments.map(appointment => toCamelCase(appointment));
          }
          return [];
        });
    },
    
    // Nouvelle requête pour les statistiques des rendez-vous
    appointmentStats: async (_, { period }, context) => {
      const user = getAuthUser(context);
      
      // Les utilisateurs normaux ne peuvent voir que leurs propres statistiques
      const userId = user.role === 'buyer' || user.role === 'seller' ? user.id : null;
      
      return grpcClients.appointmentService.getAppointmentStatsAsync({ 
        user_id: userId,
        period
      }).then(result => toCamelCase(result));
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
      console.log(`[DEBUG] Register mutation called with email: ${email}, role: ${role}`);
        
      // Extremely defensive programming - each step in its own try-catch
      try {
        // 1. Check if client is initialized
        if (!grpcClients) {
          console.error('[FATAL] grpcClients is undefined');
          return null; // Return null now that we made the field nullable
        }
        
        if (!grpcClients.userService) {
          console.error('[FATAL] userService client is not initialized');
          return null;
        }
        
        if (!grpcClients.userService.createUserAsync) {
          console.error('[FATAL] createUserAsync method is undefined');
          return null;
        }
        
        // 2. Prepare payload
        const payload = {
          name: name || '',
          email: email || '',
          password: password || '',
          role: role || 'buyer',
          phone: phone || ''
        };
        
        console.log('[DEBUG] About to call userService.createUserAsync with:', JSON.stringify(payload, null, 2));
        
        // 3. Call gRPC method with timeout handling
        let result;
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000);
          });
          
          result = await Promise.race([
            grpcClients.userService.createUserAsync(payload),
            timeoutPromise
          ]);
        } catch (grpcError) {
          console.error('[ERROR] gRPC call failed:', grpcError);
          console.error('[ERROR] Error stack:', grpcError.stack);
          return null;
        }
        
        // 4. Validate response
        console.log('[DEBUG] gRPC call succeeded, result:', result ? JSON.stringify(result, null, 2) : 'null');
        
        if (!result) {
          console.error('[ERROR] gRPC call returned null result');
          return null;
        }
        
        // Even if we have a result, user might be missing
        if (!result.user) {
          console.error('[ERROR] gRPC response missing user object:', result);
          return null;
        }
        
        // 5. Create properly structured response
        try {
          const user = toCamelCase(result.user);
          const token = result.token || jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '1d' }
          );
          
          console.log('[DEBUG] Successfully created response:', { 
            hasUser: !!user, 
            hasToken: !!token,
            userId: user.id
          });
          
          return { 
            user, 
            token 
          };
        } catch (formatError) {
          console.error('[ERROR] Error formatting response:', formatError);
          console.error('[ERROR] Error stack:', formatError.stack);
          return null;
        }
      } catch (unexpectedError) {
        // This is our ultimate fallback for any unhandled errors
        console.error('[FATAL] Unhandled error in register mutation:', unexpectedError);
        console.error('[FATAL] Stack trace:', unexpectedError.stack);
        return null;
      }
    },
    
    login: async (_, { email, password }) => {
      try {
        console.log(`Attempting to log in user with email: ${email}`);
        
        const result = await grpcClients.userService.authenticateAsync({
          email, password
        });
        
        console.log('Authentication service response:', JSON.stringify(result));
        
        // Handle potential missing fields in response
        if (!result) {
          console.error('Invalid authentication response from service');
          throw new Error('Authentication failed: Invalid service response');
        }
        
        // Transform response to camelCase
        const camelCaseAuth = toCamelCase(result);
        
        // Generate token if not provided
        if (!camelCaseAuth.token && camelCaseAuth.user) {
          camelCaseAuth.token = jwt.sign(
            { id: camelCaseAuth.user.id, email: camelCaseAuth.user.email, role: camelCaseAuth.user.role },
            JWT_SECRET,
            { expiresIn: '1d' }
          );
        }
        
        // Validate that required fields exist
        if (!camelCaseAuth.token || !camelCaseAuth.user) {
          console.error('Missing required fields in authentication response:', Object.keys(camelCaseAuth));
          throw new Error('Invalid authentication response from service');
        }
        
        return camelCaseAuth;
      } catch (error) {
        // Log the error for debugging
        console.error(`Authentication error for ${email}: ${error.message}`);
        
        // Throw as AuthenticationError with better message
        throw new AuthenticationError('Invalid email or password');
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
    
    // Property mutations - use the dedicated resolver
    ...propertyResolvers.Mutation,
    
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
  
  // Type resolvers
  Property: propertyResolvers.Property,
  
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