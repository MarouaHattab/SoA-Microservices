const express = require('express');
const router = express.Router();
const grpcClients = require('../grpc-clients');
const { authenticateJWT } = require('../middleware/auth');

// Récupérer toutes les propriétés
router.get('/', async (req, res) => {
  try {
    const { location, min_price, max_price, bedrooms, bathrooms, min_area, property_type, page, limit } = req.query;
    
    const searchParams = {
      location: location || '',
      min_price: min_price ? parseFloat(min_price) : 0,
      max_price: max_price ? parseFloat(max_price) : 0,
      bedrooms: bedrooms ? parseInt(bedrooms) : 0,
      bathrooms: bathrooms ? parseInt(bathrooms) : 0,
      min_area: min_area ? parseFloat(min_area) : 0,
      property_type: property_type || '',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    };
    
    const result = await grpcClients.propertyService.searchPropertiesAsync(searchParams);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Récupérer une propriété par ID
router.get('/:id', async (req, res) => {
  try {
    const property = await grpcClients.propertyService.getPropertyAsync({ id: req.params.id });
    res.json(property);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Créer une nouvelle propriété
router.post('/', authenticateJWT, async (req, res) => {
  try {
    // Ajouter l'ID du propriétaire
    const propertyData = {
      ...req.body,
      owner_id: req.user.id
    };
    
    const property = await grpcClients.propertyService.createPropertyAsync(propertyData);
    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mettre à jour une propriété
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    // Vérifier que la propriété appartient à l'utilisateur ou que l'utilisateur est admin
    const property = await grpcClients.propertyService.getPropertyAsync({ id: req.params.id });
    
    if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const updatedProperty = await grpcClients.propertyService.updatePropertyAsync({
      id: req.params.id,
      ...req.body
    });
    
    res.json(updatedProperty);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Supprimer une propriété
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    // Vérifier que la propriété appartient à l'utilisateur ou que l'utilisateur est admin
    const property = await grpcClients.propertyService.getPropertyAsync({ id: req.params.id });
    
    if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const result = await grpcClients.propertyService.deletePropertyAsync({ id: req.params.id });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Routes pour les avis et commentaires
router.post('/:id/reviews', authenticateJWT, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const reviewData = {
      property_id: req.params.id,
      user_id: req.user.id,
      user_name: req.user.name,
      rating,
      comment
    };
    
    const review = await grpcClients.propertyService.addReviewAsync(reviewData);
    res.status(201).json(review);
  } catch (error) {
    if (error.code === 6) { // ALREADY_EXISTS
      res.status(409).json({ message: 'You have already reviewed this property' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await grpcClients.propertyService.getPropertyReviewsAsync({ id: req.params.id });
    res.json(reviews);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/reviews/:reviewId', authenticateJWT, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const reviewData = {
      review_id: req.params.reviewId,
      user_id: req.user.id,
      rating,
      comment
    };
    
    const review = await grpcClients.propertyService.updateReviewAsync(reviewData);
    res.json(review);
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      res.status(404).json({ message: 'Review not found or unauthorized' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

router.delete('/reviews/:reviewId', authenticateJWT, async (req, res) => {
  try {
    const result = await grpcClients.propertyService.deleteReviewAsync({
      review_id: req.params.reviewId,
      user_id: req.user.id
    });
    res.json(result);
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      res.status(404).json({ message: 'Review not found or unauthorized' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

// Routes pour les favoris
router.post('/:id/favorites', authenticateJWT, async (req, res) => {
  try {
    const result = await grpcClients.propertyService.addToFavoritesAsync({
      property_id: req.params.id,
      user_id: req.user.id
    });
    res.json(result);
  } catch (error) {
    if (error.code === 6) { // ALREADY_EXISTS
      res.status(409).json({ message: 'Property already in favorites' });
    } else if (error.code === 5) { // NOT_FOUND
      res.status(404).json({ message: 'Property not found' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

router.delete('/:id/favorites', authenticateJWT, async (req, res) => {
  try {
    const result = await grpcClients.propertyService.removeFromFavoritesAsync({
      property_id: req.params.id,
      user_id: req.user.id
    });
    res.json(result);
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      res.status(404).json({ message: 'Property not found' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

router.get('/user/favorites', authenticateJWT, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await grpcClients.propertyService.getUserFavoritesAsync({
      user_id: req.user.id,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// Mettre à jour le fichier routes/properties.js dans l'API Gateway

// Routes pour les catégories de favoris
router.post('/favorites/categories', authenticateJWT, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    
    const result = await grpcClients.propertyService.createFavoriteCategoryAsync({
      user_id: req.user.id,
      name,
      color,
      icon
    });
    
    res.status(201).json(result);
  } catch (error) {
    handleGrpcError(error, res);
  }
});

router.get('/favorites/categories', authenticateJWT, async (req, res) => {
  try {
    const result = await grpcClients.propertyService.getFavoriteCategoriesAsync({
      user_id: req.user.id
    });
    
    res.json(result);
  } catch (error) {
    handleGrpcError(error, res);
  }
});

// Mettre à jour la route d'ajout aux favoris pour prendre en compte les catégories
router.post('/:id/favorites', authenticateJWT, async (req, res) => {
  try {
    const { category_ids, notes } = req.body;
    
    const result = await grpcClients.propertyService.addToFavoritesWithCategoriesAsync({
      property_id: req.params.id,
      user_id: req.user.id,
      category_ids,
      notes
    });
    
    res.json(result);
  } catch (error) {
    handleGrpcError(error, res);
  }
});

// Mettre à jour la route de récupération des favoris pour inclure les informations de catégorie
router.get('/user/favorites', authenticateJWT, async (req, res) => {
  try {
    const { category_id, page, limit } = req.query;
    
    const result = await grpcClients.propertyService.getUserFavoritesWithCategoriesAsync({
      user_id: req.user.id,
      category_id,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    });
    
    res.json(result);
  } catch (error) {
    handleGrpcError(error, res);
  }
});

// Routes pour le signalement d'avis
router.post('/reviews/:reviewId/report', authenticateJWT, async (req, res) => {
  try {
    const { reason, details } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }
    
    const result = await grpcClients.propertyService.reportReviewAsync({
      review_id: req.params.reviewId,
      reporter_id: req.user.id,
      reason,
      details
    });
    
    res.status(201).json(result);
  } catch (error) {
    handleGrpcError(error, res);
  }
});

// Routes pour l'examen des signalements (admin)
router.post('/reports/:reportId/decision', authenticateJWT, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can review reports' });
    }
    
    const { decision, admin_comment } = req.body;
    
    if (!decision || !['accepted', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'Valid decision (accepted/rejected) is required' });
    }
    
    const result = await grpcClients.propertyService.reviewReportAsync({
      report_id: req.params.reportId,
      admin_id: req.user.id,
      decision,
      admin_comment
    });
    
    res.json(result);
  } catch (error) {
    handleGrpcError(error, res);
  }
});

// Route pour répondre à un avis (pour les propriétaires)
router.post('/reviews/:reviewId/respond', authenticateJWT, async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response || response.trim() === '') {
      return res.status(400).json({ message: 'Response is required' });
    }
    
    const result = await grpcClients.propertyService.respondToReviewAsync({
      review_id: req.params.reviewId,
      owner_id: req.user.id,
      response
    });
    
    res.json(result);
  } catch (error) {
    handleGrpcError(error, res);
  }
});

// Route pour voter sur l'utilité d'un avis
router.post('/reviews/:reviewId/vote', authenticateJWT, async (req, res) => {
  try {
    const { helpful } = req.body;
    
    if (helpful === undefined) {
      return res.status(400).json({ message: 'Helpful parameter is required' });
    }
    
    const result = await grpcClients.propertyService.voteReviewHelpfulAsync({
      review_id: req.params.reviewId,
      user_id: req.user.id,
      helpful: !!helpful
    });
    
    res.json(result);
  } catch (error) {
    handleGrpcError(error, res);
  }
});

// Route pour vérifier un avis (admin)
router.post('/reviews/:reviewId/verify', authenticateJWT, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can verify reviews' });
    }
    
    const { verified } = req.body;
    
    if (verified === undefined) {
      return res.status(400).json({ message: 'Verified parameter is required' });
    }
    
    const result = await grpcClients.propertyService.verifyReviewAsync({
      review_id: req.params.reviewId,
      admin_id: req.user.id,
      verified: !!verified
    });
    
    res.json(result);
  } catch (error) {
    handleGrpcError(error, res);
  }
});

// Fonction utilitaire pour gérer les erreurs gRPC
function handleGrpcError(error, res) {
  if (error.code === 3) { // INVALID_ARGUMENT
    res.status(400).json({ message: error.message });
  } else if (error.code === 5) { // NOT_FOUND
    res.status(404).json({ message: error.message });
  } else if (error.code === 6) { // ALREADY_EXISTS
    res.status(409).json({ message: error.message });
  } else if (error.code === 7) { // PERMISSION_DENIED
    res.status(403).json({ message: error.message });
  } else if (error.code === 9) { // FAILED_PRECONDITION
    res.status(400).json({ message: error.message });
  } else {
    res.status(500).json({ message: error.message });
  }
}

module.exports = router;