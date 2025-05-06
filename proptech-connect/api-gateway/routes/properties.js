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

module.exports = router;