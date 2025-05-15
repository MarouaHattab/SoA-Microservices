/**
 * Script to fix the appointment route in the API gateway
 */

const fs = require('fs');
const path = require('path');

// Path to the appointments.js file in the API gateway
const appointmentsRoutePath = path.join(__dirname, 'routes', 'appointments.js');

console.log(`Fixing appointment route at: ${appointmentsRoutePath}`);

// Read the current content of the file
let content;
try {
  content = fs.readFileSync(appointmentsRoutePath, 'utf8');
  console.log('Successfully read appointments.js');
} catch (error) {
  console.error('Error reading file:', error);
  process.exit(1);
}

// The fixed route code
const fixedPostRoute = `// Créer un nouveau rendez-vous
router.post('/', authenticateJWT, async (req, res) => {
  try {
    console.log('Creating appointment with body:', req.body);
    
    // Basic validation
    if (!req.body.property_id) {
      return res.status(400).json({ message: 'property_id is required' });
    }
    
    if (!req.body.date_time) {
      return res.status(400).json({ message: 'date_time is required' });
    }
    
    // Get property details to find the agent_id (owner_id)
    let propertyDetails;
    try {
      propertyDetails = await grpcClients.propertyService.getPropertyAsync({ 
        id: req.body.property_id 
      });
      
      if (!propertyDetails || !propertyDetails.property) {
        return res.status(404).json({ message: 'Property not found' });
      }
      
      console.log('Found property:', propertyDetails.property.title);
    } catch (propertyError) {
      console.error('Error fetching property details:', propertyError);
      return res.status(404).json({ 
        message: 'Property not found or error retrieving property details',
        details: propertyError.message
      });
    }
    
    // Prepare the appointment data with required fields
    const appointmentData = {
      ...req.body,
      user_id: req.user.id,                       // Set from JWT token
      agent_id: propertyDetails.property.owner_id, // Set from property owner
      status: 'pending'                           // Default status for new appointments
    };
    
    console.log('Creating appointment with data:', appointmentData);
    
    const appointment = await grpcClients.appointmentService.createAppointmentAsync(appointmentData);
    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    if (error.code === 3) { // INVALID_ARGUMENT
      return res.status(400).json({ message: error.message });
    } else if (error.code === 6) { // ALREADY_EXISTS
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});`;

// Find the current POST route and replace it
const routeRegex = /\/\/ Créer un nouveau rendez-vous\s*router\.post\('\/'.+?\}\);/s;
const newContent = content.replace(routeRegex, fixedPostRoute);

if (newContent === content) {
  console.error('Could not find the appointment creation route in the file');
  process.exit(1);
}

// Write the updated content back to the file
try {
  fs.writeFileSync(appointmentsRoutePath, newContent);
  console.log('Successfully updated appointments.js');
} catch (error) {
  console.error('Error writing file:', error);
  process.exit(1);
}

console.log('Fix completed successfully! Restart the API gateway to apply changes.');
console.log('You can restart the API gateway by running: node restart-gateway.js'); 