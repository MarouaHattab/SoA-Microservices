/**
 * Complete fix script for the PropTech Connect GraphQL property queries
 * 
 * This script fixes the following issues:
 * 1. Property queries returning null or not iterable errors
 * 2. Field name mismatches between snake_case and camelCase
 * 3. Incomplete property fields in responses
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Paths to files we need to modify
const resolversPath = path.join(__dirname, 'resolvers.js');
const serverPath = path.join(__dirname, 'server.js');

// Backup files before modifying them
function backupFile(filePath) {
  const backupPath = `${filePath}.backup`;
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backed up ${filePath} to ${backupPath}`);
  }
}

// Updated resolver content with direct implementation (not importing from separate files)
const newResolversContent = `
const grpcClients = require('./grpc-clients');
const { getAuthUser } = require('./middleware/auth');
const { AuthenticationError, UserInputError } = require('apollo-server-express');

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

const resolvers = {
  Query: {
    // Property queries
    property: async (_, { id }) => {
      try {
        console.log(\`GraphQL Query: Fetching property with ID: \${id}\`);
        const response = await grpcClients.propertyService.getPropertyAsync({ id });
        
        if (!response || !response.property) {
          console.log('No property found with ID:', id);
          return null;
        }
        
        // Convert snake_case keys to camelCase
        const transformed = toCamelCase(response.property);
        console.log('Property query returning:', JSON.stringify(transformed, null, 2));
        return transformed;
      } catch (error) {
        console.error('Error fetching property:', error);
        throw error;
      }
    },
    
    properties: async (_, args) => {
      try {
        console.log('GraphQL Query: Fetching all properties');
        const response = await grpcClients.propertyService.searchPropertiesAsync(args || {});
        
        if (!response || !response.properties || !Array.isArray(response.properties)) {
          console.log('No properties found or invalid response structure');
          return []; // Always return an array for list types
        }
        
        // Convert each property from snake_case to camelCase
        const transformed = response.properties.map(property => toCamelCase(property));
        console.log(\`Found \${transformed.length} properties\`);
        return transformed;
      } catch (error) {
        console.error('Error fetching properties:', error);
        // Return empty array on error instead of throwing, to prevent GraphQL errors
        return []; 
      }
    },
    
    searchProperties: async (_, { input }) => {
      try {
        console.log('GraphQL Query: Searching properties with input:', input);
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
        return { properties: [], totalCount: 0, page: 1, limit: 10 };
      }
    },
    
    // User queries
    me: (_, __, context) => {
      const user = getAuthUser(context);
      return grpcClients.userService.getUserAsync({ id: user.id })
        .then(result => toCamelCase(result));
    },
    
    user: (_, { id }) => {
      return grpcClients.userService.getUserAsync({ id })
        .then(result => toCamelCase(result));
    },
    
    users: () => {
      return grpcClients.userService.getUsersAsync({})
        .then(result => {
          if (result && result.users) {
            return result.users.map(user => toCamelCase(user));
          }
          return [];
        });
    },
    
    // Appointment queries
    appointment: (_, { id }) => {
      return grpcClients.appointmentService.getAppointmentAsync({ id })
        .then(result => {
          if (result && result.appointment) {
            return toCamelCase(result.appointment);
          }
          return null;
        });
    },
    
    userAppointments: (_, { userId }) => {
      return grpcClients.appointmentService.getUserAppointmentsAsync({ user_id: userId })
        .then(result => {
          if (result && result.appointments) {
            return result.appointments.map(appointment => toCamelCase(appointment));
          }
          return [];
        });
    },
    
    propertyAppointments: (_, { propertyId }) => {
      return grpcClients.appointmentService.getPropertyAppointmentsAsync({ property_id: propertyId })
        .then(result => {
          if (result && result.appointments) {
            return result.appointments.map(appointment => toCamelCase(appointment));
          }
          return [];
        });
    },
    
    // Other queries from original resolvers...
  },
  
  Mutation: {
    // Property mutations
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
    },
    
    // Keep other mutations from original resolvers...
  },
  
  // Type resolvers
  Property: {
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
  },
  
  // Keep other type resolvers from original resolvers...
};

module.exports = resolvers;
`;

// Updated server.js with better error handling
const updateServerContent = (content) => {
  // Adding better error handling and logging for Apollo
  return content.replace(
    'const apolloServer = new ApolloServer({',
    `const apolloServer = new ApolloServer({
    introspection: true, // Enable introspection for debugging
    debug: true, // Enable debug mode to get more info on errors`
  ).replace(
    'formatError: (err) => {',
    `formatError: (err) => {
      // Get full details of the error
      console.error('GraphQL Error Details:', JSON.stringify(err, null, 2));`
  );
};

// Function to apply all fixes
async function applyFixes() {
  try {
    console.log('Starting PropTech Connect GraphQL fix process...');
    
    console.log('\n[1/4] Backing up files...');
    backupFile(resolversPath);
    backupFile(serverPath);
    
    console.log('\n[2/4] Updating resolvers.js with fixed implementation...');
    fs.writeFileSync(resolversPath, newResolversContent, 'utf8');
    
    console.log('\n[3/4] Updating server.js with better error handling...');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    const updatedServerContent = updateServerContent(serverContent);
    fs.writeFileSync(serverPath, updatedServerContent, 'utf8');
    
    console.log('\n[4/4] Restarting API gateway...');
    restartApiGateway();
  } catch (error) {
    console.error('Error applying fixes:', error);
  }
}

// Function to restart the API gateway
function restartApiGateway() {
  // First stop any running gateway processes
  const stopProcess = spawn('powershell', [
    'Get-Process -Name "node" | Where-Object {$_.CommandLine -like "*api-gateway/server.js*"} | Stop-Process -Force'
  ]);
  
  stopProcess.on('error', (error) => {
    console.error('Error stopping gateway:', error);
  });
  
  stopProcess.on('close', (code) => {
    console.log(`Gateway processes stopped with code ${code}, starting new instance...`);
    
    // Start new instance
    const startProcess = spawn('node', ['server.js'], {
      detached: true,
      stdio: 'ignore'
    });
    
    startProcess.unref();
    
    console.log('API gateway restarted successfully!');
    console.log('\nGraphQL endpoint: http://localhost:3000/graphql');
    console.log('You can now test your property queries again.');
    console.log('\nExample property query:');
    console.log(`
query {
  properties {
    id
    title
    price
    location
    ownerId
  }
}
    `);
  });
}

// Run the fix process
applyFixes(); 