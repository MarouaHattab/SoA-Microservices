// tests/analytics-service.test.js (suite)
const mongoose = require('mongoose');
const { expect } = require('chai');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createTestClient } = require('apollo-server-testing');
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('../analytics-service/schema');
const resolvers = require('../analytics-service/resolvers');
const Property = require('../analytics-service/models/Property');
const PropertyView = require('../analytics-service/models/PropertyView');

let mongoServer;
let testServer;
let query;

describe('Analytics Service GraphQL Tests', () => {
  before(async function() {
    this.timeout(10000);
    
    // Démarrer une instance MongoDB en mémoire
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connecter à la base de données
    await mongoose.connect(mongoUri);
    
    // Créer un serveur Apollo pour les tests
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ /* mock context if needed */ })
    });
    
    // Créer un client de test
    const testClient = createTestClient(server);
    query = testClient.query;
    
    // Insérer des données de test
    await Property.insertMany([
      {
        title: 'Appartement au centre-ville',
        description: 'Bel appartement rénové',
        price: 250000,
        location: 'Centre-ville',
        property_type: 'Appartement',
        bedrooms: 2,
        bathrooms: 1,
        area: 75,
        created_at: '2024-01-15T12:00:00.000Z'
      },
      {
        title: 'Maison avec jardin',
        description: 'Grande maison familiale',
        price: 450000,
        location: 'Banlieue Nord',
        property_type: 'Maison',
        bedrooms: 4,
        bathrooms: 2,
        area: 150,
        created_at: '2024-02-10T15:30:00.000Z'
      },
      {
        title: 'Studio étudiant',
        description: 'Idéal pour étudiant',
        price: 120000,
        location: 'Quartier Universitaire',
        property_type: 'Studio',
        bedrooms: 1,
        bathrooms: 1,
        area: 30,
        created_at: '2024-03-05T09:45:00.000Z'
      }
    ]);
    
    // Ajouter des données de vues de propriétés
    const properties = await Property.find();
    await PropertyView.insertMany([
      {
        property_id: properties[0]._id,
        user_id: 'user1',
        timestamp: '2024-04-01T10:00:00.000Z'
      },
      {
        property_id: properties[0]._id,
        user_id: 'user2',
        timestamp: '2024-04-02T11:30:00.000Z'
      },
      {
        property_id: properties[1]._id,
        user_id: 'user1',
        timestamp: '2024-04-03T14:20:00.000Z'
      }
    ]);
  });
  
  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });
  
  it('should fetch market overview', async () => {
    const MARKET_OVERVIEW = `
      query {
        getMarketOverview {
          average_price
          median_price
          total_listings
          price_range {
            min
            max
          }
          property_types {
            type
            count
            average_price
          }
          locations {
            location
            count
            average_price
          }
        }
      }
    `;
    
    const { data, errors } = await query({ query: MARKET_OVERVIEW });
    
    expect(errors).to.be.undefined;
    expect(data).to.have.property('getMarketOverview');
    expect(data.getMarketOverview).to.have.property('average_price');
    expect(data.getMarketOverview).to.have.property('total_listings', 3);
    expect(data.getMarketOverview.property_types).to.be.an('array');
    expect(data.getMarketOverview.property_types.length).to.be.at.least(1);
  });
  
  it('should fetch price evolution data', async () => {
    const PRICE_EVOLUTION = `
      query {
        getPriceEvolution(period: "monthly") {
          period
          average_price
          transaction_count
        }
      }
    `;
    
    const { data, errors } = await query({ query: PRICE_EVOLUTION });
    
    expect(errors).to.be.undefined;
    expect(data).to.have.property('getPriceEvolution');
    expect(data.getPriceEvolution).to.be.an('array');
    expect(data.getPriceEvolution.length).to.be.greaterThan(0);
    expect(data.getPriceEvolution[0]).to.have.all.keys('period', 'average_price', 'transaction_count');
  });
  
  it('should fetch most viewed properties', async () => {
    const MOST_VIEWED = `
      query {
        getMostViewedProperties(limit: 2) {
          id
          title
          price
          location
          property_type
          view_count
        }
      }
    `;
    
    const { data, errors } = await query({ query: MOST_VIEWED });
    
    expect(errors).to.be.undefined;
    expect(data).to.have.property('getMostViewedProperties');
    expect(data.getMostViewedProperties).to.be.an('array');
    expect(data.getMostViewedProperties.length).to.equal(2);
    
    // L'appartement au centre-ville devrait avoir le plus de vues
    expect(data.getMostViewedProperties[0].title).to.equal('Appartement au centre-ville');
    expect(data.getMostViewedProperties[0].view_count).to.equal(2);
  });
});