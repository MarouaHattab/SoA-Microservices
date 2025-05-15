/**
 * Fix for GraphQL login mutation returning Cannot return null for non-nullable field
 * 
 * This script provides two approaches to fix the issue:
 * 1. Make the login field nullable in the schema
 * 2. Ensure proper error handling in the resolver
 */

const fs = require('fs');
const path = require('path');

// Path to schema file
const schemaPath = path.join(__dirname, 'schema/index.js');

// Option 1: Make login mutation nullable
function fixSchemaDefinition() {
  console.log('Fixing schema definition...');
  
  try {
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Replace login mutation definition from non-nullable to nullable
    const updatedContent = schemaContent.replace(
      /login\(email: String!, password: String!\): AuthPayload!/g,
      'login(email: String!, password: String!): AuthPayload'
    );
    
    if (updatedContent === schemaContent) {
      console.log('No changes made - login mutation pattern not found');
    } else {
      fs.writeFileSync(schemaPath, updatedContent);
      console.log('Successfully updated schema: login mutation is now nullable');
    }
  } catch (error) {
    console.error('Error updating schema:', error);
  }
}

// Option 2: Fix resolver to handle errors better
function fixResolverImplementation() {
  console.log('Creating resolver implementation fix...');
  
  const resolverFix = `
// Improved login resolver implementation
const resolvers = {
  Mutation: {
    login: async (_, { email, password }) => {
      try {
        // Call gRPC service
        const auth = await grpcClients.userService.authenticateAsync({
          email, password
        });
        
        // Transform response to camelCase
        const camelCaseAuth = toCamelCase(auth);
        
        // Validate that required fields exist
        if (!camelCaseAuth.token || !camelCaseAuth.user) {
          console.error('Missing required fields in authentication response:', 
            Object.keys(camelCaseAuth));
          throw new Error('Invalid authentication response from service');
        }
        
        return camelCaseAuth;
      } catch (error) {
        // Log the error for debugging
        console.error(\`Authentication error for \${email}: \${error.message}\`);
        
        // Throw as AuthenticationError with better message
        throw new AuthenticationError('Invalid email or password');
      }
    },
    // Other mutations...
  }
};
`;

  console.log('Resolver implementation fix created. To apply this fix:');
  console.log('1. Update your resolvers.js file with the provided implementation');
  console.log('2. Make sure to include the toCamelCase function');
  console.log('3. Restart your API Gateway server');
  
  // Write the fix to a file for reference
  fs.writeFileSync(path.join(__dirname, 'login-resolver-fix.js'), resolverFix);
  console.log('Fix saved to login-resolver-fix.js');
}

// Apply both fixes
function applyFixes() {
  console.log('=== APPLYING LOGIN MUTATION FIXES ===');
  
  // Fix 1: Make the field nullable in schema
  fixSchemaDefinition();
  
  // Fix 2: Improve resolver implementation
  fixResolverImplementation();
  
  console.log('\n=== NEXT STEPS ===');
  console.log('1. Restart your API Gateway server');
  console.log('2. Test the login mutation again');
  console.log('3. If still having issues, check that your gRPC User Service is running correctly');
  console.log('4. Try registering a new user first if no valid credentials exist');
}

// Execute fixes
applyFixes(); 