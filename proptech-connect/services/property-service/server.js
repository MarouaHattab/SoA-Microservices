const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
const Property = require('./models/Property');
const PropertyReview = require('./models/PropertyReview');
const FavoriteCategory = require('./models/FavoriteCategory');
const PropertyFavorite = require('./models/PropertyFavorite');
const ReviewReport = require('./models/ReviewReport');
require('dotenv').config();
const { connectProducer, sendEvent } = require('./kafka-producer');
let kafkaProducer;

// Service pour récupérer les infos utilisateur
const userService = require('./user-service-client');
// Service pour vérifier les rendez-vous
const appointmentService = require('./appointment-service-client');

// Chargement du fichier proto
const PROTO_PATH = '../../proto/property.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const propertyProto = grpc.loadPackageDefinition(packageDefinition).property;

// Implémentation des méthodes du service
const server = new grpc.Server();

server.addService(propertyProto.PropertyService.service, {
  // Récupérer une propriété par ID
  GetProperty: async (call, callback) => {
    try {
      const property = await Property.findById(call.request.id);
      if (!property) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Property not found'
        });
      }
      
      // Format the property response with proper timestamps
      const formattedProperty = {
        id: property._id.toString(),
        title: property.title,
        description: property.description,
        price: property.price,
        location: property.location,
        address: property.address,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
        property_type: property.property_type,
        owner_id: property.owner_id,
        features: property.features || [],
        images: property.images || [],
        created_at: property.createdAt ? property.createdAt.toISOString() : new Date().toISOString(),
        updated_at: property.updatedAt ? property.updatedAt.toISOString() : new Date().toISOString(),
        average_rating: property.average_rating || 0,
        total_ratings: property.total_ratings || 0,
        favorited_by: property.favorited_by || []
      };
      
      callback(null, { property: formattedProperty });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Rechercher des propriétés
  SearchProperties: async (call, callback) => {
    try {
      const { 
        location, min_price, max_price, bedrooms, 
        bathrooms, min_area, property_type, page = 1, limit = 10, owner_id 
      } = call.request;

      let query = {};
      
      if (location) {
        query.location = { $regex: location, $options: 'i' };
      }
      
      if (min_price || max_price) {
        query.price = {};
        if (min_price) query.price.$gte = min_price;
        if (max_price) query.price.$lte = max_price;
      }
      
      if (bedrooms) {
        query.bedrooms = bedrooms;
      }
      
      if (bathrooms) {
        query.bathrooms = bathrooms;
      }
      
      if (min_area) {
        query.area = { $gte: min_area };
      }
      
      if (property_type) {
        query.property_type = property_type;
      }
      
      // Add owner_id filter if provided
      if (owner_id) {
        query.owner_id = owner_id;
        console.log(`Filtering properties by owner_id: ${owner_id}`);
      }

      const skip = (page - 1) * limit;

      const [properties, totalCount] = await Promise.all([
        Property.find(query).skip(skip).limit(limit),
        Property.countDocuments(query)
      ]);

      // Format the properties with proper timestamps
      const formattedProperties = properties.map(property => ({
        id: property._id.toString(),
        title: property.title,
        description: property.description,
        price: property.price,
        location: property.location,
        address: property.address,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
        property_type: property.property_type,
        owner_id: property.owner_id,
        features: property.features || [],
        images: property.images || [],
        created_at: property.createdAt ? property.createdAt.toISOString() : new Date().toISOString(),
        updated_at: property.updatedAt ? property.updatedAt.toISOString() : new Date().toISOString(),
        average_rating: property.average_rating || 0,
        total_ratings: property.total_ratings || 0,
        favorited_by: property.favorited_by || []
      }));

      callback(null, {
        properties: formattedProperties,
        total_count: totalCount,
        page,
        limit
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Créer une nouvelle propriété
  CreateProperty: async (call, callback) => {
    try {
      const propertyData = call.request;
      const newProperty = new Property(propertyData);
      const savedProperty = await newProperty.save();
      
      // Envoyer un événement Kafka pour informer les autres services
      await sendEvent('property-events', 'property-created', {
        property_id: savedProperty._id.toString(),
        owner_id: savedProperty.owner_id,
        price: savedProperty.price,
        location: savedProperty.location,
        timestamp: new Date().toISOString()
      });
      
      // Format the property response with proper timestamps
      const formattedProperty = {
        id: savedProperty._id.toString(),
        title: savedProperty.title,
        description: savedProperty.description,
        price: savedProperty.price,
        location: savedProperty.location,
        address: savedProperty.address,
        bedrooms: savedProperty.bedrooms,
        bathrooms: savedProperty.bathrooms,
        area: savedProperty.area,
        property_type: savedProperty.property_type,
        owner_id: savedProperty.owner_id,
        features: savedProperty.features || [],
        images: savedProperty.images || [],
        created_at: savedProperty.createdAt ? savedProperty.createdAt.toISOString() : new Date().toISOString(),
        updated_at: savedProperty.updatedAt ? savedProperty.updatedAt.toISOString() : new Date().toISOString(),
        average_rating: savedProperty.average_rating || 0,
        total_ratings: savedProperty.total_ratings || 0,
        favorited_by: savedProperty.favorited_by || []
      };
      
      callback(null, { property: formattedProperty });
    } catch (error) {
      console.error('Error in CreateProperty:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Mettre à jour une propriété
  UpdateProperty: async (call, callback) => {
    try {
      const { id, ...propertyData } = call.request;
      
      const updatedProperty = await Property.findByIdAndUpdate(
        id,
        propertyData,
        { new: true }
      );
      
      if (!updatedProperty) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Property not found'
        });
      }
      
      // Envoyer un événement Kafka pour informer les autres services
      await sendEvent('property-events', 'property-updated', {
        property_id: updatedProperty._id.toString(),
        owner_id: updatedProperty.owner_id,
        price: updatedProperty.price,
        location: updatedProperty.location,
        timestamp: new Date().toISOString()
      });
      
      // Format the property response with proper timestamps
      const formattedProperty = {
        id: updatedProperty._id.toString(),
        title: updatedProperty.title,
        description: updatedProperty.description,
        price: updatedProperty.price,
        location: updatedProperty.location,
        address: updatedProperty.address,
        bedrooms: updatedProperty.bedrooms,
        bathrooms: updatedProperty.bathrooms,
        area: updatedProperty.area,
        property_type: updatedProperty.property_type,
        owner_id: updatedProperty.owner_id,
        features: updatedProperty.features || [],
        images: updatedProperty.images || [],
        created_at: updatedProperty.createdAt ? updatedProperty.createdAt.toISOString() : new Date().toISOString(),
        updated_at: updatedProperty.updatedAt ? updatedProperty.updatedAt.toISOString() : new Date().toISOString(),
        average_rating: updatedProperty.average_rating || 0,
        total_ratings: updatedProperty.total_ratings || 0,
        favorited_by: updatedProperty.favorited_by || []
      };
      
      callback(null, { property: formattedProperty });
    } catch (error) {
      console.error('Error in UpdateProperty:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Supprimer une propriété
  DeleteProperty: async (call, callback) => {
    try {
      const deletedProperty = await Property.findByIdAndDelete(call.request.id);
      
      if (!deletedProperty) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Property not found'
        });
      }
      
      // Envoyer un événement Kafka pour informer les autres services
      await sendEvent('property-events', 'property-deleted', {
        property_id: call.request.id,
        timestamp: new Date().toISOString()
      });
      
      callback(null, { 
        success: true,
        message: 'Property deleted successfully'
      });
    } catch (error) {
      console.error('Error in DeleteProperty:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Ajouter une note et un commentaire
  AddReview: async (call, callback) => {
    try {
      console.log('AddReview - Received request:', JSON.stringify(call.request, null, 2));
      
      const { 
        property_id, 
        user_id, 
        user_name, 
        rating, 
        comment,
        category_ratings
      } = call.request;
      
      // Set the reviewer name to the provided name or 'Anonymous'
      const reviewerName = user_name && user_name.trim() !== '' ? user_name : 'Anonymous';
      console.log('Using reviewer name:', reviewerName);

      // Vérifier si l'utilisateur a déjà laissé un avis
      const existingReview = await PropertyReview.findOne({ property_id, user_id });
      if (existingReview) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'User has already reviewed this property'
        });
      }

      // Vérifier si l'utilisateur a effectivement visité la propriété
      let visit_verified = false;
      try {
        const appointments = await appointmentService.getUserPropertyAppointmentsAsync({
          user_id,
          property_id,
          status: 'completed'
        });
        
        visit_verified = appointments && appointments.appointments && appointments.appointments.length > 0;
      } catch (error) {
        console.error('Error checking appointment history:', error);
      }

      // Créer le nouvel avis
      const review = new PropertyReview({
        property_id,
        user_id,
        user_name: reviewerName, // Use the name we determined
        rating,
        comment,
        visit_verified,
        category_ratings: category_ratings ? {
          location: category_ratings.location || rating,
          value: category_ratings.value || rating,
          quality: category_ratings.quality || rating,
          amenities: category_ratings.amenities || rating,
          neighborhood: category_ratings.neighborhood || rating
        } : {
          location: rating,
          value: rating,
          quality: rating,
          amenities: rating,
          neighborhood: rating
        }
      });

      console.log('Creating review with data:', {
        property_id,
        user_id,
        user_name: reviewerName,
        rating,
        comment,
        category_ratings: review.category_ratings
      });

      await review.save();

      // Mettre à jour la note moyenne de la propriété
      await updatePropertyRatings(property_id);

      // Notifier le propriétaire
      try {
        const property = await Property.findById(property_id);
        if (property) {
          await kafkaProducer.send({
            topic: 'notification-events',
            messages: [
              { 
                value: JSON.stringify({
                  event: 'NEW_REVIEW',
                  review_id: review._id.toString(),
                  property_id: property_id,
                  property_title: property.title,
                  user_id: property.owner_id,
                  rating: rating,
                  verified: visit_verified
                }) 
              }
            ]
          });
        }
      } catch (error) {
        console.error('Error notifying property owner about new review:', error);
      }

      // Get the saved review to ensure we have the timestamps
      const savedReview = await PropertyReview.findById(review._id);
      
      // Format the response with properly formatted timestamps
      const formattedReview = {
        id: savedReview._id.toString(),
        property_id: savedReview.property_id.toString(),
        user_id: savedReview.user_id,
        user_name: savedReview.user_name,
        rating: savedReview.rating,
        comment: savedReview.comment,
        created_at: savedReview.createdAt.toISOString(),
        updated_at: savedReview.updatedAt.toISOString(),
        category_ratings: savedReview.category_ratings || {
          location: savedReview.rating,
          value: savedReview.rating,
          quality: savedReview.rating,
          amenities: savedReview.rating,
          neighborhood: savedReview.rating
        }
      };

      console.log('Sending formatted review response:', formattedReview);
      callback(null, { review: formattedReview });
    } catch (error) {
      console.error('Error in AddReview:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Obtenir les avis d'une propriété
  GetPropertyReviews: async (call, callback) => {
    try {
      const { id, verified_only, sort_by = 'date', page = 1, limit = 10 } = call.request;
      
      // Construire la requête
      const query = { 
        property_id: id,
        is_hidden: { $ne: true } // Exclure les avis masqués
      };
      
      // Filtrer par statut de vérification si demandé
      if (verified_only) {
        query.visit_verified = true;
      }
      
      // Déterminer le tri
      let sortOption = {};
      switch (sort_by) {
        case 'rating_high':
          sortOption = { rating: -1 };
          break;
        case 'rating_low':
          sortOption = { rating: 1 };
          break;
        case 'helpful':
          sortOption = { helpful_votes: -1 };
          break;
        case 'date':
        default:
          sortOption = { createdAt: -1 };
      }
      
      // Calculer la pagination
      const skip = (page - 1) * limit;
      
      // Exécuter la requête avec pagination
      const [reviews, totalCount] = await Promise.all([
        PropertyReview.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(limit),
        PropertyReview.countDocuments(query)
      ]);
      
      const property = await Property.findById(id);
      
      // Formater la réponse
      const formattedReviews = reviews.map(review => ({
        id: review._id.toString(),
        property_id: review.property_id.toString(),
        user_id: review.user_id,
        user_name: review.user_name && review.user_name.trim() !== '' ? review.user_name : 'Anonymous',
        rating: review.rating,
        comment: review.comment,
        created_at: review.createdAt ? review.createdAt.toISOString() : new Date().toISOString(),
        updated_at: review.updatedAt ? review.updatedAt.toISOString() : new Date().toISOString(),
        owner_response: review.owner_response || null,
        owner_response_date: review.owner_response_date ? review.owner_response_date.toISOString() : null,
        helpful_votes: review.helpful_votes || 0,
        visit_verified: review.visit_verified || false,
        category_ratings: review.category_ratings || {
          location: review.rating,
          value: review.rating,
          quality: review.rating,
          amenities: review.rating,
          neighborhood: review.rating
        }
      }));
      
      callback(null, {
        reviews: formattedReviews,
        average_rating: property ? property.average_rating : 0,
        total_reviews: totalCount,
        category_ratings: property ? property.category_ratings : null,
        verified_count: await PropertyReview.countDocuments({ 
          property_id: id, 
          visit_verified: true,
          is_hidden: { $ne: true }
        })
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Obtenir un avis spécifique par ID
  GetReview: async (call, callback) => {
    try {
      const { id } = call.request;
      console.log('Getting review by ID:', id);
      
      const review = await PropertyReview.findById(id);
      if (!review) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Review not found'
        });
      }

      // Use the username from the review or default to 'Anonymous'
      const userName = review.user_name && review.user_name.trim() !== '' ? 
        review.user_name : 'Anonymous';
      
      const formattedReview = {
        id: review._id.toString(),
        property_id: review.property_id.toString(),
        user_id: review.user_id,
        user_name: userName,
        rating: review.rating,
        comment: review.comment,
        created_at: review.createdAt.toISOString(),
        updated_at: review.updatedAt.toISOString()
      };
      
      callback(null, { review: formattedReview });
    } catch (error) {
      console.error('Error in GetReview:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Voter sur l'utilité d'un avis
  VoteReviewHelpful: async (call, callback) => {
    try {
      const { review_id, user_id, helpful } = call.request;
      
      // Vérifier que l'avis existe
      const review = await PropertyReview.findById(review_id);
      if (!review) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Review not found'
        });
      }
      
      // Vérifier que l'utilisateur n'est pas l'auteur de l'avis
      if (review.user_id === user_id) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'You cannot vote on your own review'
        });
      }
      
      // Initialiser les tableaux si nécessaire
      review.helpful_voters = review.helpful_voters || [];
      
      // Vérifier si l'utilisateur a déjà voté
      const hasVoted = review.helpful_voters.includes(user_id);
      
      if (helpful) {
        // Ajouter un vote utile
        if (!hasVoted) {
          review.helpful_voters.push(user_id);
          review.helpful_votes = (review.helpful_votes || 0) + 1;
        }
      } else {
        // Retirer un vote utile
        if (hasVoted) {
          review.helpful_voters = review.helpful_voters.filter(id => id !== user_id);
          review.helpful_votes = Math.max(0, (review.helpful_votes || 0) - 1);
        }
      }
      
      await review.save();
      
      callback(null, {
        success: true,
        review: {
          id: review._id.toString(),
          helpful_votes: review.helpful_votes || 0,
          has_voted: review.helpful_voters.includes(user_id)
        }
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Vérifier un avis (pour les administrateurs)
  VerifyReview: async (call, callback) => {
    try {
      const { review_id, admin_id, verified } = call.request;
      
      // Vérifier que l'avis existe
      const review = await PropertyReview.findById(review_id);
      if (!review) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Review not found'
        });
      }
      
      // Vérifier que l'administrateur a les droits
      const admin = await userService.getUserById(admin_id);
      if (!admin || admin.role !== 'admin') {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only administrators can verify reviews'
        });
      }
      
      // Mettre à jour le statut de vérification
      review.visit_verified = verified;
      await review.save();
      
      // Notifier l'auteur de l'avis si son avis est vérifié
      if (verified) {
        try {
          await kafkaProducer.send({
            topic: 'notification-events',
            messages: [
              { 
                value: JSON.stringify({
                  event: 'REVIEW_VERIFIED',
                  review_id: review._id.toString(),
                  user_id: review.user_id,
                  property_id: review.property_id.toString()
                }) 
              }
            ]
          });
        } catch (error) {
          console.error('Error notifying user about verified review:', error);
        }
      }
      
      callback(null, {
        success: true,
        review: {
          id: review._id.toString(),
          visit_verified: review.visit_verified
        }
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Mettre à jour un avis
  UpdateReview: async (call, callback) => {
    try {
      const { review_id, user_id, user_name, rating, comment, category_ratings } = call.request;

      const review = await PropertyReview.findOne({ _id: review_id, user_id });
      if (!review) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Review not found or unauthorized'
        });
      }

      review.rating = rating;
      review.comment = comment;
      
      // Update user_name if provided, using 'Anonymous' if blank
      if (user_name !== undefined) {
        review.user_name = user_name && user_name.trim() !== '' ? user_name : 'Anonymous';
      }
      
      // Mettre à jour les notes par catégorie si fournies
      if (category_ratings) {
        review.category_ratings = {
          location: category_ratings.location || rating,
          value: category_ratings.value || rating,
          quality: category_ratings.quality || rating,
          amenities: category_ratings.amenities || rating,
          neighborhood: category_ratings.neighborhood || rating
        };
      }
      
      await review.save();

      // Mettre à jour la note moyenne de la propriété avec la nouvelle fonction
      await updatePropertyRatings(review.property_id);
      
      // Get the freshly saved review to ensure we have updated timestamps
      const savedReview = await PropertyReview.findById(review._id);
      
      // Format the response with properly formatted timestamps
      const formattedReview = {
        id: savedReview._id.toString(),
        property_id: savedReview.property_id.toString(),
        user_id: savedReview.user_id,
        user_name: savedReview.user_name,
        rating: savedReview.rating,
        comment: savedReview.comment,
        created_at: savedReview.createdAt.toISOString(),
        updated_at: savedReview.updatedAt.toISOString()
      };

      console.log('Sending formatted review response:', formattedReview);
      callback(null, { review: formattedReview });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Supprimer un avis
  DeleteReview: async (call, callback) => {
    try {
      const { review_id, user_id } = call.request;

      const review = await PropertyReview.findOne({ _id: review_id, user_id });
      if (!review) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Review not found or unauthorized'
        });
      }

      const propertyId = review.property_id;
      await review.deleteOne();

      // Mettre à jour la note moyenne de la propriété avec la nouvelle fonction
      await updatePropertyRatings(propertyId);

      callback(null, {
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Ajouter aux favoris
  AddToFavorites: async (call, callback) => {
    try {
      const { property_id, user_id } = call.request;

      const property = await Property.findById(property_id);
      if (!property) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Property not found'
        });
      }

      if (property.favorited_by.includes(user_id)) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'Property already in favorites'
        });
      }

      property.favorited_by.push(user_id);
      await property.save();

      callback(null, {
        success: true,
        message: 'Property added to favorites'
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Retirer des favoris
  RemoveFromFavorites: async (call, callback) => {
    try {
      const { property_id, user_id } = call.request;

      const property = await Property.findById(property_id);
      if (!property) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Property not found'
        });
      }

      property.favorited_by = property.favorited_by.filter(id => id !== user_id);
      await property.save();

      callback(null, {
        success: true,
        message: 'Property removed from favorites'
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Créer une catégorie de favoris
  CreateFavoriteCategory: async (call, callback) => {
    try {
      const { user_id, name, color, icon } = call.request;
      
      // Vérifier si le nom est fourni
      if (!name || name.trim() === '') {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Category name is required'
        });
      }
      
      // Vérifier si une catégorie du même nom existe déjà pour cet utilisateur
      const existingCategory = await FavoriteCategory.findOne({ 
        user_id, 
        name: { $regex: new RegExp(`^${name}$`, 'i') } 
      });
      
      if (existingCategory) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'A category with this name already exists'
        });
      }
      
      // Créer la nouvelle catégorie
      const category = new FavoriteCategory({
        user_id,
        name,
        color: color || '#4a90e2',
        icon: icon || 'star',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      await category.save();
      
      callback(null, { 
        category: {
          id: category._id.toString(),
          user_id: category.user_id,
          name: category.name,
          color: category.color,
          icon: category.icon,
          created_at: category.created_at.toISOString(),
          updated_at: category.updated_at.toISOString()
        }
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Obtenir les catégories de favoris d'un utilisateur
  GetFavoriteCategories: async (call, callback) => {
    try {
      const { user_id } = call.request;
      
      const categories = await FavoriteCategory.find({ user_id })
        .sort({ name: 1 });
      
      const formattedCategories = categories.map(category => ({
        id: category._id.toString(),
        user_id: category.user_id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        created_at: category.created_at.toISOString(),
        updated_at: category.updated_at.toISOString()
      }));
      
      callback(null, { categories: formattedCategories });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Ajouter une propriété aux favoris avec catégories
  AddToFavoritesWithCategories: async (call, callback) => {
    try {
      const { property_id, user_id, category_ids, notes } = call.request;
      
      // Vérifier que la propriété existe
      const property = await Property.findById(property_id);
      if (!property) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Property not found'
        });
      }
      
      // Vérifier si cette propriété est déjà dans les favoris
      let favorite = await PropertyFavorite.findOne({ property_id, user_id });
      
      if (favorite) {
        // Mettre à jour les catégories et notes si elles sont fournies
        if (category_ids || notes) {
          if (category_ids) {
            favorite.categories = category_ids;
          }
          if (notes !== undefined) {
            favorite.notes = notes;
          }
          favorite.updated_at = new Date();
          await favorite.save();
        }
      } else {
        // Créer un nouveau favori
        favorite = new PropertyFavorite({
          property_id,
          user_id,
          categories: category_ids || [],
          notes: notes || '',
          created_at: new Date(),
          updated_at: new Date()
        });
        
        await favorite.save();
        
        // Mettre à jour la liste des favoris dans la propriété
        if (!property.favorited_by.includes(user_id)) {
          property.favorited_by.push(user_id);
          await property.save();
        }
      }
      
      callback(null, {
        success: true,
        message: favorite ? 'Property updated in favorites' : 'Property added to favorites',
        favorite: {
          id: favorite._id.toString(),
          property_id: favorite.property_id,
          user_id: favorite.user_id,
          category_ids: favorite.categories.map(cat => cat.toString()),
          notes: favorite.notes,
          created_at: favorite.created_at.toISOString(),
          updated_at: favorite.updated_at.toISOString()
        }
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Obtenir les favoris d'un utilisateur avec catégories
  GetUserFavoritesWithCategories: async (call, callback) => {
    try {
      const { user_id, category_id, page = 1, limit = 10 } = call.request;
      const skip = (page - 1) * limit;
      
      // Construire la requête de base
      const query = { user_id };
      
      // Filtrer par catégorie si fournie
      if (category_id) {
        query.categories = category_id;
      }
      
      // Récupérer les favoris avec pagination
      const [favorites, totalCount] = await Promise.all([
        PropertyFavorite.find(query)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .populate('categories'),
        PropertyFavorite.countDocuments(query)
      ]);
      
      // Récupérer les détails des propriétés
      const propertyIds = favorites.map(fav => fav.property_id);
      const properties = await Property.find({ _id: { $in: propertyIds } });
      
      // Associer les détails des propriétés aux favoris
      const propertiesMap = properties.reduce((map, prop) => {
        map[prop._id.toString()] = prop;
        return map;
      }, {});
      
      // Formater la réponse
      const formattedFavorites = favorites.map(fav => {
        const property = propertiesMap[fav.property_id];
        
        return {
          id: fav._id.toString(),
          property_id: fav.property_id,
          property: property ? {
            id: property._id.toString(),
            title: property.title,
            price: property.price,
            location: property.location,
            property_type: property.property_type,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            area: property.area,
            image_url: property.images && property.images.length > 0 ? property.images[0] : ''
          } : null,
          categories: fav.categories.map(cat => ({
            id: cat._id.toString(),
            name: cat.name,
            color: cat.color,
            icon: cat.icon
          })),
          notes: fav.notes,
          created_at: fav.created_at.toISOString(),
          updated_at: fav.updated_at.toISOString()
        };
      });
      
      callback(null, {
        favorites: formattedFavorites,
        total_count: totalCount,
        page,
        limit
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Signaler un avis
  ReportReview: async (call, callback) => {
    try {
      const { review_id, reporter_id, reason, details } = call.request;
      
      // Vérifier que l'avis existe
      const review = await PropertyReview.findById(review_id);
      if (!review) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Review not found'
        });
      }
      
      // Vérifier que l'utilisateur n'a pas déjà signalé cet avis
      const existingReport = await ReviewReport.findOne({ 
        review_id, 
        reporter_id 
      });
      
      if (existingReport) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'You have already reported this review'
        });
      }
      
      // Vérifier que l'utilisateur n'est pas l'auteur de l'avis
      if (review.user_id === reporter_id) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'You cannot report your own review'
        });
      }
      
      // Créer le signalement
      const report = new ReviewReport({
        review_id,
        reporter_id,
        reason,
        details: details || '',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      await report.save();
      
      // Notifier les administrateurs
      try {
        // Obtenir les administrateurs
        const adminIds = await userService.getAdminIds();
        
        if (adminIds && adminIds.length > 0) {
          // Publier un événement pour la notification
          await kafkaProducer.send({
            topic: 'notification-events',
            messages: [
              { 
                value: JSON.stringify({
                  event: 'REVIEW_REPORTED',
                  review_id: review._id.toString(),
                  property_id: review.property_id.toString(),
                  report_id: report._id.toString(),
                  admin_ids: adminIds,
                  reason: reason,
                  reporter_id: reporter_id
                }) 
              }
            ]
          });
        }
      } catch (error) {
        console.error('Error notifying admins about review report:', error);
      }
      
      callback(null, {
        report: {
          id: report._id.toString(),
          review_id: report.review_id.toString(),
          reporter_id: report.reporter_id,
          reason: report.reason,
          details: report.details,
          status: report.status,
          created_at: report.created_at.toISOString(),
          updated_at: report.updated_at.toISOString()
        }
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

// Examiner un signalement (pour les administrateurs)
ReviewReport: async (call, callback) => {
  try {
    const { report_id, admin_id, decision, admin_comment } = call.request;
    
    // Vérifier que le signalement existe
    const report = await ReviewReport.findById(report_id);
    if (!report) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Report not found'
      });
    }
    
    // Vérifier que l'administrateur a les droits
    const admin = await userService.getUserById(admin_id);
    if (!admin || admin.role !== 'admin') {
      return callback({
        code: grpc.status.PERMISSION_DENIED,
        message: 'Only administrators can review reports'
      });
    }
    
    // Mettre à jour le statut du signalement
    report.status = decision;
    report.admin_comment = admin_comment || '';
    report.updated_at = new Date();
    await report.save();
    
    // Si le signalement est accepté, masquer l'avis
    if (decision === 'accepted') {
      const review = await PropertyReview.findById(report.review_id);
      if (review) {
        // Ajouter un champ pour indiquer que l'avis est masqué
        review.is_hidden = true;
        review.hidden_reason = 'Reported content';
        await review.save();
        
        // Recalculer la note moyenne de la propriété
        await updatePropertyRatings(review.property_id);
        
        // Notifier l'auteur de l'avis
        try {
          await kafkaProducer.send({
            topic: 'notification-events',
            messages: [
              { 
                value: JSON.stringify({
                  event: 'REVIEW_HIDDEN',
                  review_id: review._id.toString(),
                  property_id: review.property_id.toString(),
                  user_id: review.user_id,
                  reason: 'Your review has been hidden due to a violation of our community guidelines.'
                }) 
              }
            ]
          });
        } catch (error) {
          console.error('Error notifying user about hidden review:', error);
        }
      }
    }
    
    // Notifier le signaleur de la décision
    try {
      await kafkaProducer.send({
        topic: 'notification-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'REPORT_DECISION',
              report_id: report._id.toString(),
              review_id: report.review_id.toString(),
              user_id: report.reporter_id,
              decision: decision,
              message: `Your report has been ${decision === 'accepted' ? 'accepted' : 'rejected'}.`
            }) 
          }
        ]
      });
    } catch (error) {
      console.error('Error notifying reporter about decision:', error);
    }
    
    callback(null, {
      success: true,
      message: `Report ${decision}`,
      report: {
        id: report._id.toString(),
        review_id: report.review_id.toString(),
        reporter_id: report.reporter_id,
        reason: report.reason,
        details: report.details,
        status: report.status,
        admin_comment: report.admin_comment,
        created_at: report.created_at.toISOString(),
        updated_at: report.updated_at.toISOString()
      }
    });
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
},

// Répondre à un avis (pour les propriétaires)
RespondToReview: async (call, callback) => {
  try {
    const { review_id, owner_id, response } = call.request;
    
    // Vérifier que l'avis existe
    const review = await PropertyReview.findById(review_id);
    if (!review) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Review not found'
      });
    }
    
    // Vérifier que la propriété existe
    const property = await Property.findById(review.property_id);
    if (!property) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Property not found'
      });
    }
    
    // Vérifier que l'utilisateur est bien le propriétaire
    if (property.owner_id !== owner_id) {
      return callback({
        code: grpc.status.PERMISSION_DENIED,
        message: 'Only the property owner can respond to reviews'
      });
    }
    
    // Vérifier que la réponse n'est pas vide
    if (!response || response.trim() === '') {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Response cannot be empty'
      });
    }
    
    // Mettre à jour l'avis avec la réponse
    review.owner_response = response;
    review.owner_response_date = new Date();
    await review.save();
    
    // Notifier l'auteur de l'avis
    try {
      await kafkaProducer.send({
        topic: 'notification-events',
        messages: [
          { 
            value: JSON.stringify({
              event: 'REVIEW_RESPONSE',
              review_id: review._id.toString(),
              property_id: review.property_id.toString(),
              user_id: review.user_id,
              property_title: property.title,
              response: response
            }) 
          }
        ]
      });
    } catch (error) {
      console.error('Error notifying user about review response:', error);
    }
    
    callback(null, {
      success: true,
      review: {
        id: review._id.toString(),
        property_id: review.property_id.toString(),
        user_id: review.user_id,
        user_name: review.user_name,
        rating: review.rating,
        comment: review.comment,
        is_hidden: review.is_hidden,
        owner_response: review.owner_response,
        owner_response_date: review.owner_response_date.toISOString(),
        created_at: review.createdAt.toISOString(),
        updated_at: review.updatedAt.toISOString()
      }
    });
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
},

// Obtenir les favoris d'un utilisateur
GetUserFavorites: async (call, callback) => {
  try {
    const { user_id, page = 1, limit = 10 } = call.request;
    const skip = (page - 1) * limit;

    const [properties, totalCount] = await Promise.all([
      Property.find({ favorited_by: user_id })
        .skip(skip)
        .limit(limit),
      Property.countDocuments({ favorited_by: user_id })
    ]);

    // Format the properties with proper timestamps and structure
    const formattedProperties = properties.map(property => ({
      id: property._id.toString(),
      title: property.title,
      description: property.description,
      price: property.price,
      location: property.location,
      address: property.address,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      property_type: property.property_type,
      owner_id: property.owner_id,
      features: property.features || [],
      images: property.images || [],
      created_at: property.createdAt ? property.createdAt.toISOString() : new Date().toISOString(),
      updated_at: property.updatedAt ? property.updatedAt.toISOString() : new Date().toISOString(),
      average_rating: property.average_rating || 0,
      total_ratings: property.total_ratings || 0,
      favorited_by: property.favorited_by || []
    }));

    callback(null, {
      properties: formattedProperties,
      total_count: totalCount,
      page,
      limit
    });
  } catch (error) {
    console.error('Error in GetUserFavorites:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}
});

/**
* Fonction utilitaire pour mettre à jour les notes d'une propriété
* Calcule la note moyenne globale et par catégorie
* @param {string} propertyId - ID de la propriété
*/
async function updatePropertyRatings(propertyId) {
try {
  // Récupérer tous les avis non masqués
  const reviews = await PropertyReview.find({ 
    property_id: propertyId,
    is_hidden: { $ne: true }
  });
  
  if (reviews.length === 0) {
    // Pas d'avis, réinitialiser les notes
    await Property.findByIdAndUpdate(propertyId, {
      average_rating: 0,
      total_ratings: 0,
      category_ratings: {
        location: 0,
        value: 0,
        quality: 0,
        amenities: 0,
        neighborhood: 0
      }
    });
    return;
  }
  
  // Calculer les moyennes de notation globales et par catégorie
  let totalRating = 0;
  let totalCategoryRatings = {
    location: 0,
    value: 0,
    quality: 0,
    amenities: 0,
    neighborhood: 0
  };
  
  reviews.forEach(review => {
    totalRating += review.rating;
    
    // Ajouter les notes par catégorie
    if (review.category_ratings) {
      if (review.category_ratings.location) totalCategoryRatings.location += review.category_ratings.location;
      if (review.category_ratings.value) totalCategoryRatings.value += review.category_ratings.value;
      if (review.category_ratings.quality) totalCategoryRatings.quality += review.category_ratings.quality;
      if (review.category_ratings.amenities) totalCategoryRatings.amenities += review.category_ratings.amenities;
      if (review.category_ratings.neighborhood) totalCategoryRatings.neighborhood += review.category_ratings.neighborhood;
    }
  });
  
  const averageRating = totalRating / reviews.length;
  const categoryRatings = {
    location: totalCategoryRatings.location / reviews.length,
    value: totalCategoryRatings.value / reviews.length,
    quality: totalCategoryRatings.quality / reviews.length,
    amenities: totalCategoryRatings.amenities / reviews.length,
    neighborhood: totalCategoryRatings.neighborhood / reviews.length
  };
  
  // Mettre à jour la propriété
  await Property.findByIdAndUpdate(propertyId, {
    average_rating: averageRating,
    total_ratings: reviews.length,
    category_ratings: categoryRatings
  });
  
} catch (error) {
  console.error('Error updating property ratings:', error);
  throw error;
}
}

// Connexion à MongoDB et démarrage du serveur
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-property';
const PORT = process.env.PORT || 50051;

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
  return connectProducer();
})
.then((producer) => {
  kafkaProducer = producer;
  // Démarrer le serveur gRPC
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      console.error('Failed to bind server:', error);
      return;
    }
    console.log(`Property service running on port ${port}`);
    server.start();
  });
})
.catch(error => {
  console.error('Erreur de démarrage:', error);
});

// Gérer la fermeture propre
process.on('SIGINT', async () => {
console.log('Shutting down property service...');
if (kafkaProducer) {
  await kafkaProducer.disconnect();
}
await mongoose.disconnect();
process.exit(0);
});