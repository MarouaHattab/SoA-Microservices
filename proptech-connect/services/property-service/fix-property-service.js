/**
 * Script to fix property service issues
 * 
 * This script modifies the necessary files to fix:
 * 1. Add to favorites functionality
 * 2. Add property review with category ratings
 * 3. Get user favorites formatting
 * 4. Body parser issue in the API gateway
 */

const fs = require('fs');
const path = require('path');

// Path to the server.js file
const serverFilePath = path.join(__dirname, 'server.js');
const apiGatewayPath = path.join(__dirname, '..', '..', 'api-gateway', 'server.js');

console.log('Reading server.js files...');
let serverContent = fs.readFileSync(serverFilePath, 'utf8');
let apiGatewayContent = fs.readFileSync(apiGatewayPath, 'utf8');

// Fix 1: Update GetUserFavorites method
console.log('Fixing GetUserFavorites method...');
const getUserFavoritesRegex = /GetUserFavorites: async \(call, callback\) => \{[\s\S]*?callback\(null, \{\s*properties,\s*total_count: totalCount,\s*page,\s*limit\s*\}\);[\s\S]*?\}/;
const fixedGetUserFavorites = `GetUserFavorites: async (call, callback) => {
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
}`;

// Fix 2: Update AddReview method to properly handle category_ratings
console.log('Fixing AddReview method...');
const addReviewRegex = /AddReview: async \(call, callback\) => \{[\s\S]*?callback\(null, \{ review: formattedReview \}\);[\s\S]*?\}/;
const fixedAddReview = `AddReview: async (call, callback) => {
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
  }`;

// Fix 4: Update API Gateway to ensure JSON body parser is correctly set up
console.log('Fixing API Gateway body parser setup...');
const expressSetupRegex = /const app = express\(\);([\s\S]*?)\/\/ Routes/;
const updatedExpressSetup = `const app = express();

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Routes`;

// Replace the express setup section
apiGatewayContent = apiGatewayContent.replace(expressSetupRegex, updatedExpressSetup);

// Write updates to API Gateway server.js
console.log('Writing updates to API Gateway server.js...');
fs.writeFileSync(apiGatewayPath, apiGatewayContent, 'utf8');

// Apply the fixes
console.log('Applying fixes to server.js...');
serverContent = serverContent.replace(getUserFavoritesRegex, fixedGetUserFavorites);
serverContent = serverContent.replace(addReviewRegex, fixedAddReview);

// Write the updated content back to the file
console.log('Writing updated server.js file...');
fs.writeFileSync(serverFilePath, serverContent, 'utf8');

console.log('Fixes applied successfully!');
console.log('Please restart the property service to apply the changes.'); 