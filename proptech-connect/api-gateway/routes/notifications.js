// api-gateway/routes/notifications.js
const express = require('express');
const router = express.Router();
const { authenticateJWT, isAdmin } = require('../middleware/auth');
const grpcClients = require('../grpc-clients');

// Middleware d'authentification pour toutes les routes
router.use(authenticateJWT);

// Récupérer toutes les notifications de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const { unread_only, page, limit } = req.query;
    
    const result = await grpcClients.notificationService.GetUserNotificationsAsync({
      user_id: req.user.id,
      unread_only: unread_only === 'true',
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: error.message });
  }
});

// Marquer une notification comme lue
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const result = await grpcClients.notificationService.MarkNotificationAsReadAsync({
      notification_id: notificationId,
      user_id: req.user.id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour les paramètres de notification
router.put('/settings', async (req, res) => {
  try {
    const { email_enabled, push_enabled, in_app_enabled, muted_types } = req.body;
    
    const result = await grpcClients.notificationService.UpdateNotificationSettingsAsync({
      user_id: req.user.id,
      email_enabled,
      push_enabled,
      in_app_enabled,
      muted_types
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ message: error.message });
  }
});

// Routes pour les administrateurs

// Envoyer une notification à un utilisateur spécifique
router.post('/admin/send', isAdmin, async (req, res) => {
  try {
    const { recipient_id, title, content, type, link, priority, requires_action } = req.body;
    
    if (!recipient_id || !title || !content) {
      return res.status(400).json({ message: 'Recipient ID, title, and content are required' });
    }
    
    const result = await grpcClients.notificationService.SendNotificationAsync({
      sender_id: req.user.id,
      recipient_id,
      title,
      content,
      type,
      link,
      priority,
      requires_action
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: error.message });
  }
});

// Envoyer une notification à plusieurs utilisateurs
router.post('/admin/send-bulk', isAdmin, async (req, res) => {
  try {
    const { recipient_ids, title, content, type, link, priority, requires_action } = req.body;
    
    if (!recipient_ids || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return res.status(400).json({ message: 'Recipient IDs must be a non-empty array' });
    }
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    
    const result = await grpcClients.notificationService.SendBulkNotificationAsync({
      sender_id: req.user.id,
      recipient_ids,
      title,
      content,
      type,
      link,
      priority,
      requires_action
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error sending bulk notification:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;