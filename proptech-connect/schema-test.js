const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const axios = require('axios');

// The schema to test
const typeDefs = require('./schema');

// Simple mock resolvers
const resolvers = {
  Query: {
    // User queries
    me: () => mockUsers[0],
    user: (_, { id }) => mockUsers.find(user => user.id === id),
    users: () => mockUsers,
    
    // Property queries
    property: (_, { id }) => mockProperties.find(prop => prop.id === id),
    properties: () => mockProperties,
    
    // Appointment queries
    appointment: (_, { id }) => mockAppointments.find(app => app.id === id),
    userAppointments: (_, { userId }) => mockAppointments.filter(app => app.userId === userId),
    propertyAppointments: (_, { propertyId }) => mockAppointments.filter(app => app.propertyId === propertyId),
    appointmentStats: (_, { period }) => mockAppointmentStats,
  },
  
  Mutation: {
    // Test appointment mutations
    respondToAppointment: (_, { id, input }) => {
      const appointment = mockAppointments.find(app => app.id === id);
      if (appointment) {
        appointment.status = input.response === "confirm" ? "confirmed" : 
                             input.response === "reject" ? "rejected" : "reschedule_proposed";
        appointment.ownerResponse = input.response;
        appointment.updatedAt = new Date().toISOString();
        
        if (input.response === "reschedule") {
          appointment.rescheduleProposed = input.proposedDate;
          appointment.rescheduleReason = input.reason;
        } else if (input.response === "reject") {
          appointment.rejectionReason = input.reason;
        }
        
        // Add to history
        if (!appointment.history) appointment.history = [];
        appointment.history.push({
          status: appointment.status,
          dateTime: new Date().toISOString(),
          changedBy: "user1",
          changedAt: new Date().toISOString(),
          notes: input.reason || "Response updated"
        });
      }
      return appointment;
    },
    
    addAppointmentFeedback: (_, { id, input }) => {
      const appointment = mockAppointments.find(app => app.id === id);
      if (appointment) {
        appointment.feedback = input.feedback;
        appointment.feedbackRating = input.rating;
        appointment.updatedAt = new Date().toISOString();
      }
      return appointment;
    }
  },
  
  // Type resolvers
  Appointment: {
    property: (parent) => mockProperties.find(prop => prop.id === parent.propertyId),
    user: (parent) => mockUsers.find(user => user.id === parent.userId),
    agent: (parent) => mockUsers.find(user => user.id === parent.agentId),
  },
  
  Property: {
    owner: (parent) => mockUsers.find(user => user.id === parent.ownerId),
  }
};

// Mock data
const mockUsers = [
  {
    id: "user1",
    name: "John Doe",
    email: "john@example.com",
    role: "buyer",
    phone: "+1234567890",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z"
  },
  {
    id: "user2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "agent",
    phone: "+0987654321",
    createdAt: "2023-01-02T00:00:00Z",
    updatedAt: "2023-01-02T00:00:00Z"
  },
  {
    id: "user3",
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "owner",
    phone: "+1122334455",
    createdAt: "2023-01-03T00:00:00Z",
    updatedAt: "2023-01-03T00:00:00Z"
  }
];

const mockProperties = [
  {
    id: "prop1",
    title: "Modern Apartment",
    description: "A beautiful modern apartment",
    price: 250000,
    location: "New York",
    address: "123 Main St, NY",
    bedrooms: 2,
    bathrooms: 1,
    area: 1000,
    propertyType: "apartment",
    ownerId: "user3",
    features: ["balcony", "parking"],
    images: ["https://example.com/img1.jpg"],
    createdAt: "2023-02-01T00:00:00Z",
    updatedAt: "2023-02-01T00:00:00Z"
  },
  {
    id: "prop2",
    title: "Suburban House",
    description: "A spacious suburban house",
    price: 500000,
    location: "Boston",
    address: "456 Oak St, Boston",
    bedrooms: 4,
    bathrooms: 2.5,
    area: 2500,
    propertyType: "house",
    ownerId: "user3",
    features: ["garden", "garage", "basement"],
    images: ["https://example.com/img2.jpg"],
    createdAt: "2023-02-02T00:00:00Z",
    updatedAt: "2023-02-02T00:00:00Z"
  }
];

const mockAppointments = [
  {
    id: "app1",
    propertyId: "prop1",
    userId: "user1",
    agentId: "user2",
    dateTime: "2023-03-01T10:00:00Z",
    status: "pending",
    notes: "First viewing",
    createdAt: "2023-02-15T00:00:00Z",
    updatedAt: "2023-02-15T00:00:00Z",
    history: [
      {
        status: "created",
        dateTime: "2023-02-15T00:00:00Z",
        changedBy: "user1",
        changedAt: "2023-02-15T00:00:00Z",
        notes: "Appointment created"
      }
    ]
  },
  {
    id: "app2",
    propertyId: "prop2",
    userId: "user1",
    agentId: "user2",
    dateTime: "2023-03-02T15:00:00Z",
    status: "confirmed",
    notes: "Second property",
    createdAt: "2023-02-16T00:00:00Z",
    updatedAt: "2023-02-17T00:00:00Z",
    history: [
      {
        status: "created",
        dateTime: "2023-02-16T00:00:00Z",
        changedBy: "user1",
        changedAt: "2023-02-16T00:00:00Z",
        notes: "Appointment created"
      },
      {
        status: "confirmed",
        dateTime: "2023-02-17T00:00:00Z",
        changedBy: "user3",
        changedAt: "2023-02-17T00:00:00Z",
        notes: "Appointment confirmed"
      }
    ]
  }
];

const mockAppointmentStats = {
  totalAppointments: 2,
  period: "month",
  statusDistribution: [
    { status: "pending", count: 1, percentage: 50 },
    { status: "confirmed", count: 1, percentage: 50 }
  ],
  dayDistribution: [
    { day: "Monday", count: 1, percentage: 50 },
    { day: "Tuesday", count: 1, percentage: 50 }
  ],
  startDate: "2023-03-01T00:00:00Z",
  endDate: "2023-03-31T23:59:59Z"
};

// GraphQL queries to test
const queries = {
  // Get user appointments
  getUserAppointments: `
    query {
      userAppointments(userId: "user1") {
        id
        propertyId
        property {
          title
          location
        }
        userId
        user {
          name
          email
        }
        agentId
        agent {
          name
          email
        }
        dateTime
        status
        notes
        history {
          status
          dateTime
          changedBy
          changedAt
          notes
        }
        createdAt
        updatedAt
      }
    }
  `,
  
  // Get appointment stats
  getAppointmentStats: `
    query {
      appointmentStats(period: "month") {
        totalAppointments
        period
        statusDistribution {
          status
          count
          percentage
        }
        dayDistribution {
          day
          count
          percentage
        }
        startDate
        endDate
      }
    }
  `,

  // Respond to appointment mutation
  respondToAppointment: `
    mutation {
      respondToAppointment(
        id: "app1",
        input: {
          response: "confirm",
          reason: "Looks good to me"
        }
      ) {
        id
        status
        ownerResponse
        history {
          status
          dateTime
          changedBy
          changedAt
          notes
        }
        updatedAt
      }
    }
  `,

  // Add feedback mutation
  addAppointmentFeedback: `
    mutation {
      addAppointmentFeedback(
        id: "app2",
        input: {
          rating: 5,
          feedback: "Great property and agent!"
        }
      ) {
        id
        feedback
        feedbackRating
        updatedAt
      }
    }
  `
};

// Create Express app and Apollo Server
const app = express();
const startServer = async () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    playground: true
  });

  await server.start();
  server.applyMiddleware({ app });

  const PORT = 4000;
  app.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}${server.graphqlPath}`);
    runTests();
  });
};

// Function to execute GraphQL queries
async function executeQuery(queryName) {
  try {
    console.log(`\nExecuting ${queryName}:`);
    console.log(queries[queryName]);
    
    const response = await axios.post('http://localhost:4000/graphql', {
      query: queries[queryName]
    });
    
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run all test queries
async function runTests() {
  try {
    // Run query tests
    await executeQuery('getUserAppointments');
    await executeQuery('getAppointmentStats');
    
    // Run mutation tests
    await executeQuery('respondToAppointment');
    await executeQuery('addAppointmentFeedback');
    
    console.log('\nAll tests completed');
  } catch (error) {
    console.error('Test suite error:', error);
  }
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
}); 