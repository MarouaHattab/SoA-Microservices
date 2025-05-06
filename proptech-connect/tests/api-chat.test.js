// tests/api-chat.test.js
const request = require('supertest');
const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const app = require('../api-gateway/app');

// Créer un token JWT valide pour les tests
const createToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Chat API Integration Tests', () => {
  let token;
  let conversationId;
  let groupId;
  
  before(() => {
    // Générer un token pour les tests
    token = createToken('test-user-1', 'buyer');
  });
  
  it('should create a conversation by sending a message', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: 'Hello, this is a test from API',
        receiver_id: 'test-user-2'
      });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id');
    expect(res.body).to.have.property('conversation_id');
    expect(res.body).to.have.property('content', 'Hello, this is a test from API');
    
    // Stocker l'ID de conversation pour les tests suivants
    conversationId = res.body.conversation_id;
  });
  
  it('should get user conversations', async () => {
    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.be.at.least(1);
    
    const conversation = res.body.find(c => c.id === conversationId);
    expect(conversation).to.exist;
    expect(conversation.participants).to.include('test-user-1');
  });
  
  it('should get messages from a conversation', async () => {
    const res = await request(app)
      .get(`/api/chat/messages/${conversationId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('messages');
    expect(res.body.messages).to.be.an('array');
    expect(res.body.messages.length).to.be.at.least(1);
    expect(res.body.messages[0]).to.have.property('content', 'Hello, this is a test from API');
  });
  
  it('should create a group chat', async () => {
    const res = await request(app)
      .post('/api/chat/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        group_name: 'API Test Group',
        member_ids: ['test-user-2', 'test-user-3']
      });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id');
    expect(res.body).to.have.property('name', 'API Test Group');
    expect(res.body).to.have.property('creator_id', 'test-user-1');
    expect(res.body).to.have.property('member_count', 3);
    
    // Stocker l'ID du groupe pour les tests suivants
    groupId = res.body.id;
  });
  
  it('should get user groups', async () => {
    const res = await request(app)
      .get('/api/chat/groups')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.be.at.least(1);
    
    const group = res.body.find(g => g.id === groupId);
    expect(group).to.exist;
    expect(group).to.have.property('name', 'API Test Group');
  });
  
  it('should get group members', async () => {
    const res = await request(app)
      .get(`/api/chat/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.equal(3);
    
    const memberIds = res.body.map(m => m.user_id);
    expect(memberIds).to.include('test-user-1');
    expect(memberIds).to.include('test-user-2');
    expect(memberIds).to.include('test-user-3');
  });
  
  it('should add a user to a group', async () => {
    const res = await request(app)
      .post(`/api/chat/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        user_id: 'test-user-4'
      });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id', groupId);
    expect(res.body).to.have.property('member_count', 4);
  });
  
  it('should remove a user from a group', async () => {
    const res = await request(app)
      .delete(`/api/chat/groups/${groupId}/members/test-user-3`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id', groupId);
    expect(res.body).to.have.property('member_count', 3);
  });
  
  it('should ask AI and get a response', async () => {
    const res = await request(app)
      .post('/api/chat/ai')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'Quelles sont les étapes pour acheter un bien immobilier?',
        conversation_id: conversationId
      });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('response');
    expect(res.body.response).to.be.a('string');
    expect(res.body.response.length).to.be.greaterThan(50);
    expect(res.body).to.have.property('suggested_properties');
  });
});