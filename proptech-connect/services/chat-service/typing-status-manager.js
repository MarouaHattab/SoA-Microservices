// chat-service/typing-status-manager.js
class TypingStatusManager {
    constructor() {
      this.typingUsers = new Map(); // conversation_id -> Set<user_id>
      this.typingTimeouts = new Map(); // `${conversation_id}-${user_id}` -> timeout
      this.TYPING_TIMEOUT = 30000; // Increase timeout to 30 seconds for better UX
      console.log('TypingStatusManager initialized');
    }
    
    // Mettre à jour le statut de saisie d'un utilisateur
    updateTypingStatus(conversationId, userId, isTyping) {
      const key = `${conversationId}-${userId}`;
      console.log(`Updating typing status: ${userId} in ${conversationId} to ${isTyping}`);
      
      // Supprimer tout timeout existant
      if (this.typingTimeouts.has(key)) {
        console.log(`Clearing existing timeout for ${key}`);
        clearTimeout(this.typingTimeouts.get(key));
        this.typingTimeouts.delete(key);
      }
      
      // Mettre à jour le statut
      if (isTyping) {
        // Créer l'ensemble d'utilisateurs en train de taper pour cette conversation si nécessaire
        if (!this.typingUsers.has(conversationId)) {
          console.log(`Creating new typing set for conversation ${conversationId}`);
          this.typingUsers.set(conversationId, new Set());
        }
        
        // Ajouter l'utilisateur à l'ensemble
        this.typingUsers.get(conversationId).add(userId);
        console.log(`Added ${userId} to typing users for ${conversationId}`);
        
        // Définir un timeout pour supprimer l'utilisateur après 30 secondes (increased from 5)
        const timeout = setTimeout(() => {
          console.log(`Timeout expired for ${userId} in ${conversationId}`);
          this.removeTypingUser(conversationId, userId);
        }, this.TYPING_TIMEOUT);
        
        this.typingTimeouts.set(key, timeout);
        console.log(`Set timeout for ${key}`);
      } else {
        // Supprimer l'utilisateur de l'ensemble
        console.log(`Removing ${userId} from typing users for ${conversationId}`);
        this.removeTypingUser(conversationId, userId);
      }
      
      // Log current state after update
      if (this.typingUsers.has(conversationId)) {
        console.log(`Current typing users for ${conversationId}:`, 
          Array.from(this.typingUsers.get(conversationId)));
      } else {
        console.log(`No typing users for ${conversationId}`);
      }
      
      return true;
    }
    
    // Supprimer un utilisateur de l'ensemble des utilisateurs en train de taper
    removeTypingUser(conversationId, userId) {
      console.log(`Removing typing user: ${userId} from ${conversationId}`);
      if (this.typingUsers.has(conversationId)) {
        const typingSet = this.typingUsers.get(conversationId);
        typingSet.delete(userId);
        console.log(`User ${userId} removed from typing set`);
        
        // Supprimer l'ensemble s'il est vide
        if (typingSet.size === 0) {
          console.log(`No more typing users for ${conversationId}, removing set`);
          this.typingUsers.delete(conversationId);
        }
      } else {
        console.log(`No typing set exists for ${conversationId}`);
      }
    }
    
    // Obtenir la liste des utilisateurs en train de taper dans une conversation
    getTypingUsers(conversationId) {
      console.log(`Getting typing users for ${conversationId}`);
      if (!this.typingUsers.has(conversationId)) {
        console.log(`No typing users for ${conversationId}`);
        return [];
      }
      
      const users = Array.from(this.typingUsers.get(conversationId));
      console.log(`Found ${users.length} typing users:`, users);
      return users;
    }
    
    // Dump the entire state for debugging
    dumpState() {
      console.log('=== TypingStatusManager State Dump ===');
      console.log(`typingUsers map size: ${this.typingUsers.size}`);
      console.log(`typingTimeouts map size: ${this.typingTimeouts.size}`);
      
      console.log('\nTyping users by conversation:');
      for (const [convId, usersSet] of this.typingUsers.entries()) {
        console.log(`- Conversation ${convId}: ${Array.from(usersSet).join(', ')}`);
      }
      
      console.log('\nActive timeouts:');
      for (const key of this.typingTimeouts.keys()) {
        console.log(`- ${key}`);
      }
      console.log('======================================');
    }
  }
  
  // Create a singleton instance
  const instance = new TypingStatusManager();
  console.log('TypingStatusManager singleton created');
  
  module.exports = instance;