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

module.exports = router;