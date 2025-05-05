const express = require('express');
const router = express.Router();
const grpcClients = require('../grpc-clients');
const { authenticateJWT } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticateJWT);

// Récupérer tous les rendez-vous d'un utilisateur
router.get('/user/:userId', async (req, res) => {
  try {
    // Vérifier que l'utilisateur consulte ses propres rendez-vous ou est admin
    if (req.params.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'agent') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const appointments = await grpcClients.appointmentService.getUserAppointmentsAsync({ user_id: req.params.userId });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Récupérer tous les rendez-vous pour une propriété
router.get('/property/:propertyId', async (req, res) => {
  try {
    const appointments = await grpcClients.appointmentService.getPropertyAppointmentsAsync({ property_id: req.params.propertyId });
    
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
    res.status(400).json({ message: error.message });
  }
});

// Mettre à jour un rendez-vous
router.put('/:id', async (req, res) => {
  try {
    // Vérifier que le RDV concerne l'utilisateur ou que l'utilisateur est admin/agent
    const appointment = await grpcClients.appointmentService.getAppointmentAsync({ id: req.params.id });
    
    if (appointment.user_id !== req.user.id && appointment.agent_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const updatedAppointment = await grpcClients.appointmentService.updateAppointmentAsync({
      id: req.params.id,
      ...req.body
    });
    
    res.json(updatedAppointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Supprimer un rendez-vous
router.delete('/:id', async (req, res) => {
  try {
    // Vérifier que le RDV concerne l'utilisateur ou que l'utilisateur est admin/agent
    const appointment = await grpcClients.appointmentService.getAppointmentAsync({ id: req.params.id });
    
    if (appointment.user_id !== req.user.id && appointment.agent_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const result = await grpcClients.appointmentService.deleteAppointmentAsync({ id: req.params.id });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;