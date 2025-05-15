const grpcClients = require('../grpc-clients');
const { AuthenticationError, UserInputError } = require('apollo-server-express');
const { getAuthUser } = require('../middleware/auth');

// Helper to convert snake_case to camelCase
function toCamelCase(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  return Object.keys(obj).reduce((camelObj, key) => {
    // Convert key from snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Convert value recursively if it's an object
    const value = obj[key];
    camelObj[camelKey] = toCamelCase(value);
    
    return camelObj;
  }, {});
}

const propertyResolvers = {
  Query: {
    // Get property by ID
    property: async (_, { id }) => {
      try {
        console.log(`Fetching property with ID: ${id}`);
        const response = await grpcClients.propertyService.getPropertyAsync({ id });
        
        if (!response || !response.property) {
          console.log('No property found or invalid response structure');
          return null;
        }
        
        // Convert snake_case keys to camelCase
        return toCamelCase(response.property);
      } catch (error) {
        console.error('Error fetching property:', error);
        throw error;
      }
    },
    
    // Get all properties or search properties
    properties: async (_, args) => {
      try {
        console.log('Fetching properties with args:', args);
        const response = await grpcClients.propertyService.searchPropertiesAsync(args || {});
        
        if (!response || !response.properties) {
          console.log('No properties found or invalid response structure');
          return [];
        }
        
        // Convert each property from snake_case to camelCase
        return response.properties.map(property => toCamelCase(property));
      } catch (error) {
        console.error('Error fetching properties:', error);
        throw error;
      }
    },
    
    // Search properties with criteria
    searchProperties: async (_, { input }) => {
      try {
        console.log('Searching properties with input:', input);
        const response = await grpcClients.propertyService.searchPropertiesAsync(input || {});
        
        if (!response) {
          return { properties: [], totalCount: 0, page: 1, limit: 10 };
        }
        
        // Transform response to match GraphQL schema
        return {
          properties: response.properties ? response.properties.map(p => toCamelCase(p)) : [],
          totalCount: response.total_count || 0,
          page: response.page || 1,
          limit: response.limit || 10
        };
      } catch (error) {
        console.error('Error searching properties:', error);
        throw error;
      }
    },
  },
  
  Mutation: {
    // Create a new property
    createProperty: async (_, { input }, context) => {
      try {
        const user = getAuthUser(context);
        
        // Add the owner ID
        const propertyInput = {
          ...input,
          owner_id: user.id
        };
        
        const response = await grpcClients.propertyService.createPropertyAsync(propertyInput);
        
        if (!response || !response.property) {
          throw new Error('Failed to create property');
        }
        
        return toCamelCase(response.property);
      } catch (error) {
        console.error('Error creating property:', error);
        throw error;
      }
    },
    
    // Update an existing property
    updateProperty: async (_, { id, input }, context) => {
      try {
        const user = getAuthUser(context);
        
        // Check if the property belongs to the user or user is admin
        const propertyResponse = await grpcClients.propertyService.getPropertyAsync({ id });
        
        if (!propertyResponse || !propertyResponse.property) {
          throw new UserInputError('Property not found');
        }
        
        if (propertyResponse.property.owner_id !== user.id && user.role !== 'admin') {
          throw new AuthenticationError('Not authorized to update this property');
        }
        
        // Prepare update data
        const updateData = {
          id,
          ...input
        };
        
        const response = await grpcClients.propertyService.updatePropertyAsync(updateData);
        
        if (!response || !response.property) {
          throw new Error('Failed to update property');
        }
        
        return toCamelCase(response.property);
      } catch (error) {
        console.error('Error updating property:', error);
        throw error;
      }
    },
    
    // Delete a property
    deleteProperty: async (_, { id }, context) => {
      try {
        const user = getAuthUser(context);
        
        // Check if the property belongs to the user or user is admin
        const propertyResponse = await grpcClients.propertyService.getPropertyAsync({ id });
        
        if (!propertyResponse || !propertyResponse.property) {
          throw new UserInputError('Property not found');
        }
        
        if (propertyResponse.property.owner_id !== user.id && user.role !== 'admin') {
          throw new AuthenticationError('Not authorized to delete this property');
        }
        
        const response = await grpcClients.propertyService.deletePropertyAsync({ id });
        
        return {
          success: response.success,
          message: response.message
        };
      } catch (error) {
        console.error('Error deleting property:', error);
        throw error;
      }
    }
  },
  
  // Property field resolvers
  Property: {
    // Resolve the owner field
    owner: async (parent) => {
      if (!parent.ownerId) return null;
      
      try {
        const response = await grpcClients.userService.getUserAsync({ id: parent.ownerId });
        if (!response) return null;
        
        return toCamelCase(response);
      } catch (error) {
        console.error('Error resolving property owner:', error);
        return null;
      }
    }
  }
};

module.exports = propertyResolvers; 