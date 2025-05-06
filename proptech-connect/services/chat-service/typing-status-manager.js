// chat-service/typing-status-manager.js
class TypingStatusManager {
    constructor() {
      this.typingUsers = new Map(); // conversation_id -> Set<user_id>
      this.typingTimeouts = new Map(); // `${conversation_id}-${user_id}` -> timeout
    }
    
    // Mettre à jour le statut de saisie d'un utilisateur
    updateTypingStatus(conversationId, userId, isTyping) {
      const key = `${conversationId}-${userId}`;
      
      // Supprimer tout timeout existant
      if (this.typingTimeouts.has(key)) {
        clearTimeout(this.typingTimeouts.get(key));
        this.typingTimeouts.delete(key);
      }
      
      // Mettre à jour le statut
      if (isTyping) {
        // Créer l'ensemble d'utilisateurs en train de taper pour cette conversation si nécessaire
        if (!this.typingUsers.has(conversationId)) {
          this.typingUsers.set(conversationId, new Set());
        }
        
        // Ajouter l'utilisateur à l'ensemble
        this.typingUsers.get(conversationId).add(userId);
        
        // Définir un timeout pour supprimer l'utilisateur après 5 secondes
        const timeout = setTimeout(() => {
          this.removeTypingUser(conversationId, userId);
        }, 5000);
        
        this.typingTimeouts.set(key, timeout);
      } else {
        // Supprimer l'utilisateur de l'ensemble
        this.removeTypingUser(conversationId, userId);
      }
      
      return true;
    }
    
    // Supprimer un utilisateur de l'ensemble des utilisateurs en train de taper
    removeTypingUser(conversationId, userId) {
      if (this.typingUsers.has(conversationId)) {
        const typingSet = this.typingUsers.get(conversationId);
        typingSet.delete(userId);
        
        // Supprimer l'ensemble s'il est vide
        if (typingSet.size === 0) {
          this.typingUsers.delete(conversationId);
        }
      }
    }
    
    // Obtenir la liste des utilisateurs en train de taper dans une conversation
    getTypingUsers(conversationId) {
      if (!this.typingUsers.has(conversationId)) {
        return [];
      }
      
      return Array.from(this.typingUsers.get(conversationId));
    }
  }
  
  module.exports = new TypingStatusManager();