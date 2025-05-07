const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    phone: String
    createdAt: String!
    updatedAt: String!
  }
  # Nouveaux types pour les rendez-vous
  type AppointmentHistory {
    status: String!
    dateTime: String
    changedBy: ID!
    changedAt: String!
    notes: String
  }

  input AppointmentFilterInput {
    status: String
    fromDate: String
    toDate: String
    page: Int
    limit: Int
  }

  type Appointment {
    id: ID!
    propertyId: ID!
    property: Property
    userId: ID!
    user: User
    agentId: ID!
    agent: User
    dateTime: String!
    status: String!
    notes: String
    ownerResponse: String
    rescheduleProposed: String
    rescheduleReason: String
    rejectionReason: String
    feedback: String
    feedbackRating: Int
    history: [AppointmentHistory]
    createdAt: String!
    updatedAt: String!
  }

  type StatusStat {
    status: String!
    count: Int!
    percentage: Int!
  }

  type DayStat {
    day: String!
    count: Int!
    percentage: Int!
  }

  type AppointmentStats {
    totalAppointments: Int!
    period: String!
    statusDistribution: [StatusStat!]!
    dayDistribution: [DayStat!]!
    startDate: String!
    endDate: String!
  }

  input RespondInput {
    response: String!  # "confirm", "reject", "reschedule"
    reason: String
    proposedDate: String
  }

  input FeedbackInput {
    rating: Int!
    feedback: String
  }

  extend type Query {
    # Nouvelles requêtes
    appointmentStats(period: String!): AppointmentStats!
  }

  extend type Mutation {
    # Nouvelles mutations
    respondToAppointment(id: ID!, input: RespondInput!): Appointment!
    acceptReschedule(id: ID!): Appointment!
    declineReschedule(id: ID!, reason: String): Appointment!
    completeAppointment(id: ID!): Appointment!
    addAppointmentFeedback(id: ID!, input: FeedbackInput!): Appointment!
    sendAppointmentReminder(id: ID!): DeleteResponse!
  }

  type Property {
    id: ID!
    title: String!
    description: String!
    price: Float!
    location: String!
    address: String!
    bedrooms: Int!
    bathrooms: Int!
    area: Float!
    propertyType: String!
    ownerId: ID!
    owner: User
    features: [String]
    images: [String]
    createdAt: String!
    updatedAt: String!
  }

  type Message {
    id: ID!
    conversationId: ID!
    senderId: ID!
    sender: User
    receiverId: ID!
    receiver: User
    content: String!
    isRead: Boolean!
    createdAt: String!
  }

  type Conversation {
    id: ID!
    participants: [User!]!
    lastMessage: Message
    createdAt: String!
    updatedAt: String!
  }

  type Notification {
    id: ID!
    userId: ID!
    type: String!
    message: String!
    relatedId: ID
    isRead: Boolean!
    createdAt: String!
  }

  type AIPropertySuggestion {
    id: ID!
    title: String!
    price: Float!
    location: String!
    propertyType: String!
    imageUrl: String
  }

  type AIResponse {
    response: String!
    suggestedProperties: [AIPropertySuggestion]
  }

  type PropertyRecommendation {
    id: ID!
    title: String!
    price: Float!
    location: String!
    propertyType: String!
    imageUrl: String
    bedrooms: Int
    bathrooms: Int
    area: Float
    matchScore: Float
  }

  type SearchCriteria {
    location: String
    minPrice: Float
    maxPrice: Float
    bedrooms: Int
    bathrooms: Int
    minArea: Float
    propertyType: String
  }

  type AISearchResult {
    response: String!
    suggestedProperties: [AIPropertySuggestion]!
    extractedCriteria: SearchCriteria
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }

  type PropertySearchResult {
    properties: [Property!]!
    totalCount: Int!
    page: Int!
    limit: Int!
  }

  input PropertySearchInput {
    location: String
    minPrice: Float
    maxPrice: Float
    bedrooms: Int
    bathrooms: Int
    minArea: Float
    propertyType: String
    page: Int
    limit: Int
  }

  input PropertyInput {
    title: String!
    description: String!
    price: Float!
    location: String!
    address: String!
    bedrooms: Int!
    bathrooms: Int!
    area: Float!
    propertyType: String!
    features: [String]
    images: [String]
  }

  input AppointmentInput {
    propertyId: ID!
    userId: ID!
    agentId: ID!
    dateTime: String!
    status: String!
    notes: String
  }

  input MessageInput {
    receiverId: ID!
    content: String!
    conversationId: ID
  }

  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users: [User!]!

    # Property queries
    property(id: ID!): Property
    properties: [Property!]!
    searchProperties(input: PropertySearchInput): PropertySearchResult!

    # Appointment queries
    appointment(id: ID!): Appointment
    userAppointments(userId: ID!): [Appointment!]!
    propertyAppointments(propertyId: ID!): [Appointment!]!

    # Chat queries
    conversations: [Conversation!]!
    conversation(id: ID!): Conversation
    messages(conversationId: ID!): [Message!]!

    # Notification queries
    notifications: [Notification!]!

    # AI queries
    askAI(query: String!, conversationId: ID): AIResponse!

    # Nouveaux endpoints AI améliorés
    askRealEstateAI(query: String!, conversationId: ID): AISearchResult!
    getPropertyRecommendations(userId: ID!): [PropertyRecommendation!]!
    extractPropertyCriteria(text: String!): SearchCriteria!
  }

  type Mutation {
    # User mutations
    register(name: String!, email: String!, password: String!, role: String!, phone: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    updateUser(id: ID!, name: String, email: String, password: String, role: String, phone: String): User!
    deleteUser(id: ID!): DeleteResponse!

    # Property mutations
    createProperty(input: PropertyInput!): Property!
    updateProperty(id: ID!, input: PropertyInput!): Property!
    deleteProperty(id: ID!): DeleteResponse!

    # Appointment mutations
    createAppointment(input: AppointmentInput!): Appointment!
    updateAppointment(id: ID!, input: AppointmentInput!): Appointment!
    deleteAppointment(id: ID!): DeleteResponse!

    # Chat mutations
    sendMessage(input: MessageInput!): Message!
    markMessageAsRead(id: ID!): Message!

    # Notification mutations
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: [Notification!]!
  }
`;

module.exports = typeDefs;