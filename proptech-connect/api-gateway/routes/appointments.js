// api-gateway/routes/appointments.js
const express = require('express');
const router = express.Router();
const grpcClients = require('../grpc-clients');
const { authenticateJWT } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticateJWT);

// Récupérer tous les rendez-vous d'un utilisateur
router.get('/user/:userId', async (req, res) => {
  try {
    // Vérifier que l'utilisateur consulte ses propres rendez-vous ou est admin/agent
    if (req.params.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'agent') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Extraire les paramètres de filtrage et pagination
    const { status, from_date, to_date, page, limit } = req.query;
    
    const appointments = await grpcClients.appointmentService.getUserAppointmentsAsync({ 
      user_id: req.params.userId,
      status,
      from_date,
      to_date,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Récupérer tous les rendez-vous pour une propriété
router.get('/property/:propertyId', async (req, res) => {
  try {
    // Extraire les paramètres de filtrage et pagination
    const { status, from_date, to_date, page, limit } = req.query;
    
    const appointments = await grpcClients.appointmentService.getPropertyAppointmentsAsync({ 
      property_id: req.params.propertyId,
      status,
      from_date,
      to_date,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    
    // Filtrer les rendez-vous selon les permissions
    if (req.user.role !== 'admin' && req.user.role !== 'agent') {
      // Les utilisateurs normaux ne peuvent voir que leurs propres rendez-vous
      appointments.appointments = appointments.appointments.filter(appointment => 
        appointment.user_id === req.user.id
      );
    }
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Récupérer un rendez-vous par ID
router.get('/:id', async (req, res) => {
  try {
    const appointment = await grpcClients.appointmentService.getAppointmentAsync({ id: req.params.id });
    
    // Vérifier les autorisations
    if (appointment.user_id !== req.user.id && appointment.agent_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(appointment);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Créer un nouveau rendez-vous
router.post('/', async (req, res) => {
  try {
    const appointmentData = {
      ...req.body
    };
    
    // S'assurer que l'utilisateur crée un RDV pour lui-même
    if (appointmentData.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'agent') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const appointment = await grpcClients.appointmentService.createAppointmentAsync(appointmentData);
    res.status(201).json(appointment);
  } catch (error) {
    if (error.code === 3) { // INVALID_ARGUMENT
      return res.status(400).json({ message: error.message });
    } else if (error.code === 6) { // ALREADY_EXISTS
      return res.status(409).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
});

// Mettre à jour un rendez-vous
router.put('/:id', async (req, res) => {
  try {
    // Vérifier que le RDV existe et concerne l'utilisateur
    const appointment = await grpcClients.appointmentService.getAppointmentAsync({ id: req.params.id });
    
    if (appointment.user_id !== req.user.id && appointment.agent_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const updatedAppointment = await grpcClients.appointmentService.updateAppointmentAsync({
      id: req.params.id,
      ...req.body,
      changed_by: req.user.id
    });
    
    res.json(updatedAppointment);
  } catch (error) {
    if (error.code === 3) { // INVALID_ARGUMENT
      return res.status(400).json({ message: error.message });
    } else if (error.code === 6) { // ALREADY_EXISTS
      return res.status(409).json({ message: error.message });
    } else if (error.code === 5) { // NOT_FOUND
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
});

// Répondre à un rendez-vous (confirmer, rejeter, proposer un report)
router.post('/:id/respond', async (req, res) => {
  try {
    const { response, reason, proposed_date } = req.body;
    
    // Vérifier que la réponse est valide
    if (!['confirm', 'reject', 'reschedule'].includes(response)) {
      return res.status(400).json({ message: 'Invalid response type. Must be "confirm", "reject", or "reschedule"' });
    }
    
    const result = await grpcClients.appointmentService.respondToAppointmentAsync({
      id: req.params.id,
      response,
      reason,
      proposed_date,
      responder_id: req.user.id
    });
    
    res.json(result);
  } catch (error) {
    if (error.code === 3) { // INVALID_ARGUMENT
      return res.status(400).json({ message: error.message });
    } else if (error.code === 5) { // NOT_FOUND
      return res.status(404).json({ message: error.message });
    } else if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({ message: error.message });
    } else if (error.code === 9) { // FAILED_PRECONDITION
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Accepter une proposition de report
router.post('/:id/accept-reschedule', async (req, res) => {
  try {
    const result = await grpcClients.appointmentService.acceptRescheduleAsync({
      id: req.params.id,
      user_id: req.user.id
    });
    
    res.json(result);
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      return res.status(404).json({ message: error.message });
    } else if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({ message: error.message });
    } else if (error.code === 9) { // FAILED_PRECONDITION
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Refuser une proposition de report
router.post('/:id/decline-reschedule', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const result = await grpcClients.appointmentService.declineRescheduleAsync({
      id: req.params.id,
      user_id: req.user.id,
      reason
    });
    
    res.json(result);
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      return res.status(404).json({ message: error.message });
    } else if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({ message: error.message });
    } else if (error.code === 9) { // FAILED_PRECONDITION
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Marquer un rendez-vous comme terminé
router.post('/:id/complete', async (req, res) => {
  try {
    const result = await grpcClients.appointmentService.completeAppointmentAsync({
      id: req.params.id,
      completed_by: req.user.id
    });
    
    res.json(result);
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      return res.status(404).json({ message: error.message });
    } else if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({ message: error.message });
    } else if (error.code === 9) { // FAILED_PRECONDITION
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Ajouter un retour (feedback) sur un rendez-vous
router.post('/:id/feedback', async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating is required and must be between 1 and 5' });
    }
    
    const result = await grpcClients.appointmentService.addFeedbackAsync({
      id: req.params.id,
      user_id: req.user.id,
      rating,
      feedback
    });
    
    res.json(result);
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      return res.status(404).json({ message: error.message });
    } else if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({ message: error.message });
    } else if (error.code === 9) { // FAILED_PRECONDITION
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Envoyer un rappel de rendez-vous
router.post('/:id/reminder', async (req, res) => {
  try {
    // Vérifier les permissions (seul l'agent ou un admin peut envoyer des rappels manuels)
    const appointment = await grpcClients.appointmentService.getAppointmentAsync({ id: req.params.id });
    
    if (appointment.agent_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const result = await grpcClients.appointmentService.sendAppointmentReminderAsync({
      id: req.params.id
    });
    
    res.json(result);
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      return res.status(404).json({ message: error.message });
    } else if (error.code === 6) { // ALREADY_EXISTS
      return res.status(409).json({ message: error.message });
    } else if (error.code === 9) { // FAILED_PRECONDITION
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Supprimer un rendez-vous
router.delete('/:id', async (req, res) => {
  try {
    const result = await grpcClients.appointmentService.deleteAppointmentAsync({ 
      id: req.params.id,
      user_id: req.user.id
    });
    
    res.json(result);
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      return res.status(404).json({ message: error.message });
    } else if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({ message: error.message });
    } else if (error.code === 9) { // FAILED_PRECONDITION
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Obtenir les statistiques des rendez-vous
router.get('/stats/:period', async (req, res) => {
  try {
    const { period } = req.params;
    
    // Vérifier que la période est valide
    if (!['week', 'month', 'quarter', 'year'].includes(period)) {
      return res.status(400).json({ message: 'Invalid period. Must be "week", "month", "quarter", or "year"' });
    }
    
    // Les utilisateurs normaux ne peuvent voir que leurs propres statistiques
    // Les agents/admins peuvent voir toutes les statistiques
    const user_id = req.user.role === 'buyer' || req.user.role === 'seller' ? req.user.id : null;
    
    const stats = await grpcClients.appointmentService.getAppointmentStatsAsync({
      user_id,
      period
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;