const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateJWT } = require('../middleware/auth');



// Get cities list - require authentication
router.get('/cities', authenticateJWT, async (req, res) => {
  try {
    const response = await axios.get(`${PREDICTOR_SERVICE_URL}/api/cities`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ 
      message: 'Error fetching cities',
      error: error.response ? error.response.data : error.message
    });
  }
});

// Get neighborhoods for a city - require authentication
router.get('/neighborhoods', authenticateJWT, async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) {
      return res.status(400).json({ message: 'City parameter is required' });
    }
    
    const response = await axios.get(`${PREDICTOR_SERVICE_URL}/api/neighborhoods?city=${encodeURIComponent(city)}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching neighborhoods:', error);
    res.status(500).json({ 
      message: 'Error fetching neighborhoods',
      error: error.response ? error.response.data : error.message
    });
  }
});

// Get feature importance - require authentication
router.get('/feature-importance', authenticateJWT, async (req, res) => {
  try {
    const response = await axios.get(`${PREDICTOR_SERVICE_URL}/api/feature_importance`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching feature importance:', error);
    res.status(500).json({ 
      message: 'Error fetching feature importance',
      error: error.response ? error.response.data : error.message
    });
  }
});

// Make property price prediction - require authentication
router.post('/predict', authenticateJWT, async (req, res) => {
  try {
    // Add user info to logs
    console.log(`User ${req.user.id} (${req.user.email}) requested property prediction`);
    
    const { 
      is_house, bedrooms, bathrooms, total_rooms, living_area, 
      land_area, city, neighborhood, amenities 
    } = req.body;
    
    // Validation
    if (bedrooms === undefined || bathrooms === undefined || !city || !neighborhood) {
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide bedrooms, bathrooms, city, and neighborhood.' 
      });
    }
    
    // Format the data for the predictor service
    const predictorData = {
      is_house: is_house || 0,
      bedrooms: bedrooms,
      bathrooms: bathrooms,
      total_rooms: total_rooms || (bedrooms + bathrooms + 1), // Default calculation if not provided
      living_area: living_area || 0,
      land_area: land_area || 0,
      city: city,
      neighborhood: neighborhood,
      amenities: amenities || {}
    };
    
    const response = await axios.post(`${PREDICTOR_SERVICE_URL}/api/predict`, predictorData);
    
    // Enhance response with user information if needed
    const enhancedResponse = {
      ...response.data,
      requestedBy: {
        userId: req.user.id,
        role: req.user.role
      }
    };
    
    res.json(enhancedResponse);
  } catch (error) {
    console.error('Error making prediction:', error);
    res.status(500).json({ 
      message: 'Error making prediction',
      error: error.response ? error.response.data : error.message
    });
  }
});

module.exports = router; 