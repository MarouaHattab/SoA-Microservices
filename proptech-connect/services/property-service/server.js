const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
const Property = require('./models/Property');
const PropertyReview = require('./models/PropertyReview');
require('dotenv').config();
const { connectProducer, sendEvent } = require('./kafka-producer');
let kafkaProducer;

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
      callback(null, { property });
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
        bathrooms, min_area, property_type, page = 1, limit = 10 
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

      const skip = (page - 1) * limit;

      const [properties, totalCount] = await Promise.all([
        Property.find(query).skip(skip).limit(limit),
        Property.countDocuments(query)
      ]);

      callback(null, {
        properties,
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
      
      callback(null, { property: savedProperty });
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
      
      callback(null, { property: updatedProperty });
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
      const { property_id, user_id, user_name, rating, comment } = call.request;

      // Vérifier si l'utilisateur a déjà laissé un avis
      const existingReview = await PropertyReview.findOne({ property_id, user_id });
      if (existingReview) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'User has already reviewed this property'
        });
      }

      // Créer le nouvel avis
      const review = new PropertyReview({
        property_id,
        user_id,
        user_name,
        rating,
        comment
      });

      await review.save();

      // Mettre à jour la note moyenne de la propriété
      const property = await Property.findById(property_id);
      const allReviews = await PropertyReview.find({ property_id });
      
      const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
      property.average_rating = totalRating / allReviews.length;
      property.total_ratings = allReviews.length;
      
      await property.save();

      callback(null, { review });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Obtenir les avis d'une propriété
  GetPropertyReviews: async (call, callback) => {
    try {
      const property_id = call.request.id;
      const reviews = await PropertyReview.find({ property_id })
        .sort({ created_at: -1 });

      const property = await Property.findById(property_id);
      
      callback(null, {
        reviews,
        average_rating: property.average_rating,
        total_reviews: property.total_ratings
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
      const { review_id, user_id, rating, comment } = call.request;

      const review = await PropertyReview.findOne({ _id: review_id, user_id });
      if (!review) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Review not found or unauthorized'
        });
      }

      review.rating = rating;
      review.comment = comment;
      await review.save();

      // Mettre à jour la note moyenne de la propriété
      const property = await Property.findById(review.property_id);
      const allReviews = await PropertyReview.find({ property_id: review.property_id });
      
      const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
      property.average_rating = totalRating / allReviews.length;
      
      await property.save();

      callback(null, { review });
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

      await review.deleteOne();

      // Mettre à jour la note moyenne de la propriété
      const property = await Property.findById(review.property_id);
      const allReviews = await PropertyReview.find({ property_id: review.property_id });
      
      if (allReviews.length > 0) {
        const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
        property.average_rating = totalRating / allReviews.length;
        property.total_ratings = allReviews.length;
      } else {
        property.average_rating = 0;
        property.total_ratings = 0;
      }
      
      await property.save();

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

      callback(null, {
        properties,
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
  }
});

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