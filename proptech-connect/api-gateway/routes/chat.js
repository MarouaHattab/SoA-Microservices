// api-gateway/routes/chat.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const grpcClients = require('../grpc-clients');

// Middleware d'authentification pour toutes les routes
router.use(authenticateJWT);

// Obtenir les conversations de l'utilisateur
router.get('/conversations', async (req, res) => {
  try {
    const result = await grpcClients.chatService.GetConversationsAsync({
      user_id: req.user.id
    });
    
    res.json(result.conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ message: error.message });
  }
});

// Obtenir les messages d'une conversation
router.get('/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const result = await grpcClients.chatService.GetMessagesAsync({
      conversation_id: conversationId,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ message: error.message });
  }
});

// Envoyer un message
router.post('/messages', async (req, res) => {
  try {
    const { conversation_id, content, receiver_id } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    if (!conversation_id && !receiver_id) {
      return res.status(400).json({ message: 'Either conversation_id or receiver_id is required' });
    }
    
    const result = await grpcClients.chatService.SendMessageAsync({
      sender_id: req.user.id,
      content,
      conversation_id,
      receiver_id
    });
    
    res.json(result.message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: error.message });
  }
});

// Poser une question à l'IA
router.post('/ai', async (req, res) => {
  try {
    const { query, conversation_id } = req.body;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    const result = await grpcClients.chatService.AskAIAsync({
      user_id: req.user.id,
      query,
      conversation_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ message: error.message });
  }
});

// Créer un groupe de chat
router.post('/groups', async (req, res) => {
  try {
    const { group_name, member_ids } = req.body;
    
    if (!group_name || group_name.trim() === '') {
      return res.status(400).json({ message: 'Group name is required' });
    }
    
    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ message: 'At least one member is required' });
    }
    
    const result = await grpcClients.chatService.CreateGroupChatAsync({
      creator_id: req.user.id,
      group_name,
      member_ids
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error creating group chat:', error);
    res.status(500).json({ message: error.message });
  }
});

// Ajouter un utilisateur à un groupe
router.post('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const result = await grpcClients.chatService.AddUserToGroupAsync({
      group_id: groupId,
      user_id,
      admin_id: req.user.id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error adding user to group:', error);
    res.status(500).json({ message: error.message });
  }
});

// Supprimer un utilisateur d'un groupe
router.delete('/groups/:groupId/members/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    const result = await grpcClients.chatService.RemoveUserFromGroupAsync({
      group_id: groupId,
      user_id: userId,
      admin_id: req.user.id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error removing user from group:', error);
    res.status(500).json({ message: error.message });
  }
});

// Obtenir les membres d'un groupe
router.get('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const result = await grpcClients.chatService.GetGroupMembersAsync({
      group_id: groupId
    });
    
    res.json(result.members);
  } catch (error) {
    console.error('Error getting group members:', error);
    res.status(500).json({ message: error.message });
  }
});

// Obtenir les groupes d'un utilisateur
router.get('/groups', async (req, res) => {
  try {
    const result = await grpcClients.chatService.GetUserGroupsAsync({
      user_id: req.user.id
    });
    
    res.json(result.groups);
  } catch (error) {
    console.error('Error getting user groups:', error);
    res.status(500).json({ message: error.message });
  }
});
// api-gateway/routes/chat.js

// Mettre à jour le statut utilisateur (en ligne, hors ligne, etc.)
router.post('/status', async (req, res) => {
  try {
    const { status, device_info } = req.body;
    
    if (!status || !['online', 'offline', 'away', 'busy'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const result = await grpcClients.chatService.UpdateUserStatusAsync({
      user_id: req.user.id,
      status,
      device_info: device_info || req.headers['user-agent']
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: error.message });
  }
});

// Obtenir le statut d'un utilisateur
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await grpcClients.chatService.GetUserStatusAsync({
      user_id: userId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting user status:', error);
    res.status(500).json({ message: error.message });
  }
});

// Obtenir la liste des utilisateurs en ligne
router.get('/online-users', async (req, res) => {
  try {
    const result = await grpcClients.chatService.GetOnlineUsersAsync({});
    
    res.json(result.users);
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour le statut de saisie
router.post('/typing', async (req, res) => {
  try {
    const { conversation_id, is_typing } = req.body;
    
    if (!conversation_id) {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }
    
    if (typeof is_typing !== 'boolean') {
      return res.status(400).json({ message: 'is_typing must be a boolean' });
    }
    
    const result = await grpcClients.chatService.UpdateTypingStatusAsync({
      user_id: req.user.id,
      conversation_id,
      is_typing
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error updating typing status:', error);
    res.status(500).json({ message: error.message });
  }
});

// Obtenir la liste des utilisateurs en train de taper
router.get('/typing/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const result = await grpcClients.chatService.GetTypingUsersAsync({
      conversation_id: conversationId
    });
    
    res.json(result.typing_user_ids);
  } catch (error) {
    console.error('Error getting typing users:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;