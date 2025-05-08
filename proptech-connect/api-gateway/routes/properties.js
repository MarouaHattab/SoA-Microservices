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
    console.log('Creating review with user ID:', req.user.id);
    console.log('For property ID:', req.params.id);
    const { rating, comment, user_name, hidden } = req.body;
    const propertyId = req.params.id;
    
    console.log('Request body:', req.body);
    console.log('User from JWT:', req.user);
    
    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating is required and must be between 1 and 5' });
    }
    
    if (!comment || comment.trim() === '') {
      return res.status(400).json({ message: 'Comment is required' });
    }
    
    // First check if the property exists
    const property = await grpcClients.propertyService.getPropertyAsync({ id: propertyId });
    
    if (!property || !property.property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    console.log('Full property response:', JSON.stringify(property, null, 2));
    console.log('Property data type:', typeof property);
    console.log('Property.property data type:', typeof property.property);
    console.log('Property owner ID:', property.property.owner_id);
    console.log('Current user ID:', req.user.id);
    console.log('Current user role:', req.user.role);
    console.log('Are IDs equal?', property.property.owner_id === req.user.id);
    
    // Prevent property owners from reviewing their own properties
    if (property.property && property.property.owner_id && 
        property.property.owner_id === req.user.id && 
        req.user.role !== 'admin') {
      console.log('User is the property owner and not an admin, blocking review');
      return res.status(403).json({ message: 'You cannot review your own property' });
    }
    
    // Check if user has already reviewed this property
    try {
      const existingReviews = await grpcClients.propertyService.getPropertyReviewsAsync({ id: propertyId });
      
      if (existingReviews && existingReviews.reviews) {
        const userReview = existingReviews.reviews.find(review => review.user_id === req.user.id);
        
        if (userReview) {
          return res.status(409).json({
            message: "User has already reviewed this property"
          });
        }
      }
    } catch (reviewError) {
      console.error('Error checking existing reviews:', reviewError);
      // Continue with the process even if there's an error checking existing reviews
    }
    
    // Determine the name based on hidden flag and provided user_name
    let reviewerName;
    
    if (hidden === true) {
      // If hidden is true, always use "Anonymous"
      reviewerName = "Anonymous";
      console.log('Hidden flag is true, using "Anonymous" name');
    } else {
      // If hidden is false or not provided, try to get the real user name
      if (user_name && user_name.trim() !== '') {
        // Use provided user_name if available
        reviewerName = user_name.trim();
      } else {
        // Try to get the user's name from the user service
        try {
          console.log('Fetching user details from user service...');
          const userResponse = await grpcClients.userService.GetUserAsync({ id: req.user.id });
          
          if (userResponse && userResponse.user && userResponse.user.name) {
            reviewerName = userResponse.user.name;
            console.log('Successfully got user name from user service:', reviewerName);
          } else {
            // Default to JWT name or Anonymous
            reviewerName = req.user.name || "Anonymous";
          }
        } catch (userError) {
          console.error('Failed to get user details from user service:', userError);
          // Fallback to JWT name or Anonymous
          reviewerName = req.user.name || "Anonymous";
        }
      }
    }
    
    console.log('Using reviewer name:', reviewerName);
    
    // Create the review using only the properties defined in the AddReviewRequest message
    const reviewData = {
      property_id: propertyId,
      user_id: req.user.id,
      user_name: reviewerName,
      rating: parseInt(rating),
      comment
    };
    
    console.log('Sending review data to property service:', reviewData);
    
    // Added direct try/catch around the gRPC call for better diagnostics
    try {
      const response = await grpcClients.propertyService.addReviewAsync(reviewData);
      
      // Transform the response to use 'name' instead of 'user_name'
      if (response.review) {
        response.review.name = response.review.user_name;
        delete response.review.user_name;
      }
      
      res.status(201).json(response);
    } catch (grpcError) {
      console.error('gRPC specific error:', grpcError);
      return res.status(500).json({ 
        message: grpcError.message,
        details: 'There was a problem communicating with the property service'
      });
    }
  } catch (error) {
    console.error('Error adding review:', error);
    handleGrpcError(error, res);
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    console.log('Fetching reviews for property:', req.params.id);
    const reviews = await grpcClients.propertyService.getPropertyReviewsAsync({ id: req.params.id });
    
    // Ensure proper timestamp formatting in response
    if (reviews && reviews.reviews && Array.isArray(reviews.reviews)) {
      reviews.reviews.forEach(review => {
        // Set default timestamps if missing
        if (!review.created_at || review.created_at === '') {
          review.created_at = new Date().toISOString();
        }
        if (!review.updated_at || review.updated_at === '') {
          review.updated_at = new Date().toISOString();
        }
        
        // Ensure owner_response_date is properly formatted
        if (review.owner_response_date && review.owner_response_date !== '') {
          try {
            // Validate that it's a proper date string
            new Date(review.owner_response_date).toISOString();
          } catch (e) {
            // If not valid, set to current date
            review.owner_response_date = new Date().toISOString();
          }
        }
      });
    }
    
    res.json(reviews);
  } catch (error) {
    console.error('Error getting reviews:', error);
    handleGrpcError(error, res);
  }
});

router.put('/reviews/:reviewId', authenticateJWT, async (req, res) => {
  try {
    console.log('Updating review:', req.params.reviewId);
    const { rating, comment, user_name, hidden } = req.body;
    
    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating is required and must be between 1 and 5' });
    }
    
    if (!comment || comment.trim() === '') {
      return res.status(400).json({ message: 'Comment is required' });
    }
    
    // Create the review data exactly matching the UpdateReviewRequest message
    const reviewData = {
      review_id: req.params.reviewId,
      user_id: req.user.id,
      rating: parseInt(rating),
      comment
    };
    
    // Handle the user_name based on hidden flag
    if (hidden === true) {
      // If hidden is true, always use "Anonymous"
      reviewData.user_name = "Anonymous";
      console.log('Hidden flag is true, using "Anonymous" name');
    } else if (user_name !== undefined || hidden === false) {
      // If user_name provided or hidden explicitly false, try to determine the name
      if (user_name && user_name.trim() !== '') {
        // Use provided user_name if available
        reviewData.user_name = user_name.trim();
      } else if (hidden === false) {
        // If hidden is explicitly false but no user_name, try to get from user service
        try {
          console.log('Fetching user details from user service...');
          const userResponse = await grpcClients.userService.GetUserAsync({ id: req.user.id });
          
          if (userResponse && userResponse.user && userResponse.user.name) {
            reviewData.user_name = userResponse.user.name;
            console.log('Successfully got user name from user service:', reviewData.user_name);
          } else {
            // Default to JWT name or Anonymous
            reviewData.user_name = req.user.name || "Anonymous";
          }
        } catch (userError) {
          console.error('Failed to get user details from user service:', userError);
          // Fallback to JWT name or Anonymous
          reviewData.user_name = req.user.name || "Anonymous";
        }
      }
    }
    
    console.log('Sending review update data:', reviewData);
    
    try {
      const response = await grpcClients.propertyService.updateReviewAsync(reviewData);
      
      // Transform the response to use 'name' instead of 'user_name'
      if (response.review) {
        response.review.name = response.review.user_name;
        delete response.review.user_name;
      }
      
      res.json(response);
    } catch (grpcError) {
      console.error('gRPC specific error in review update:', grpcError);
      return res.status(500).json({ 
        message: grpcError.message,
        details: 'There was a problem communicating with the property service'
      });
    }
  } catch (error) {
    console.error('Error updating review:', error);
    handleGrpcError(error, res);
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
    console.error('Error deleting review:', error);
    handleGrpcError(error, res);
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
    console.error('Error adding to favorites:', error);
    handleGrpcError(error, res);
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
    console.error('Error removing from favorites:', error);
    handleGrpcError(error, res);
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
    console.error('Error getting user favorites:', error);
    handleGrpcError(error, res);
  }
});

// Routes pour les catégories de favoris
router.post('/favorites/categories', authenticateJWT, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    const result = await grpcClients.propertyService.createFavoriteCategoryAsync({
      user_id: req.user.id,
      name,
      color: color || '#000000',
      icon: icon || 'default-icon'
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating favorite category:', error);
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