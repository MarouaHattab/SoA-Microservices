// tests/geolocation-service.test.js
const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../geolocation-service/server');
const Location = require('../geolocation-service/models/Location');

let mongoServer;

describe('Geolocation Service API Tests', () => {
  before(async function() {
    this.timeout(10000);
    
    // Démarrer une instance MongoDB en mémoire
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connecter à la base de données
    await mongoose.connect(mongoUri);
    
    // Insérer des données de test
    await Location.insertMany([
      {
        name: 'Centre-ville',
        city: 'Paris',
        postal_code: '75001',
        coordinates: {
          type: 'Point',
          coordinates: [2.3522, 48.8566] // Longitude, Latitude
        },
        features: {
          has_schools: true,
          has_parks: true,
          has_shopping: true,
          has_public_transport: true,
          has_healthcare: true
        },
        stats: {
          average_price: 12000,
          price_evolution: 3.5,
          transaction_volume: 150
        },
        lifestyle_score: 8.5
      },
      {
        name: 'Quartier Est',
        city: 'Lyon',
        postal_code: '69003',
        coordinates: {
          type: 'Point',
          coordinates: [4.8357, 45.7640]
        },
        features: {
          has_schools: true,
          has_parks: false,
          has_shopping: true,
          has_public_transport: true,
          has_healthcare: false
        },
        stats: {
          average_price: 4500,
          price_evolution: 2.1,
          transaction_volume: 90
        },
        lifestyle_score: 7.2
      }
    ]);
  });
  
  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });
  
  it('should get locations by city', async () => {
    const res = await request(app)
      .get('/api/locations')
      .query({ city: 'Paris' });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.equal(1);
    expect(res.body[0].city).to.equal('Paris');
  });
  
  it('should get locations by postal_code', async () => {
    const res = await request(app)
      .get('/api/locations')
      .query({ postal_code: '69003' });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.equal(1);
    expect(res.body[0].postal_code).to.equal('69003');
  });
  
  it('should get locations by features', async () => {
    const res = await request(app)
      .get('/api/locations')
      .query({ features: 'parks,healthcare' });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.equal(1);
    expect(res.body[0].city).to.equal('Paris');
  });
  
  it('should get locations by geo proximity', async () => {
    const res = await request(app)
      .get('/api/locations')
      .query({ 
        lat: 48.8566, 
        lng: 2.3522, 
        radius: 10 
      });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.equal(1);
    expect(res.body[0].name).to.equal('Centre-ville');
  });
  
  it('should get location stats by postal code', async () => {
    const res = await request(app)
      .get('/api/locations/stats/75001');
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('avg_price');
    expect(res.body).to.have.property('avg_evolution');
    expect(res.body).to.have.property('avg_lifestyle');
    expect(res.body.avg_price).to.equal(12000);
  });
  
  it('should return 404 for non-existent postal code stats', async () => {
    const res = await request(app)
      .get('/api/locations/stats/99999');
    
    expect(res.status).to.equal(404);
  });
});