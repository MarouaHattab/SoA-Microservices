
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
        console.error(`Authentication error for ${email}: ${error.message}`);
        
        // Throw as AuthenticationError with better message
        throw new AuthenticationError('Invalid email or password');
      }
    },
    // Other mutations...
  }
};
