// tests/chat-service.test.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { expect } = require('chai');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let client;
let userId = 'test-user-1';
let userId2 = 'test-user-2';
let conversationId;
let groupId;

const PROTO_PATH = path.join(__dirname, '../../proto/chat.proto');

describe('Chat Service Tests', () => {
  before(async function() {
    this.timeout(10000);
    
    // Démarrer une instance MongoDB en mémoire
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Remplacer l'URL MongoDB dans le processus
    process.env.MONGODB_URI = mongoUri;
    
    // Créer le client gRPC pour les tests
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    
    const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;
    
    client = new chatProto.ChatService(
      'localhost:50054',
      grpc.credentials.createInsecure()
    );
    
    // Simuler les méthodes du service utilisateur
    // (Vous devez adapter cette partie en fonction de votre implémentation)
  });
  
  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });
  
  it('should send a message and create a conversation', (done) => {
    client.SendMessage({
      sender_id: userId,
      content: 'Hello, this is a test message',
      receiver_id: userId2
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('message');
      expect(response.message).to.have.property('sender_id', userId);
      expect(response.message).to.have.property('content', 'Hello, this is a test message');
      expect(response.message).to.have.property('conversation_id');
      
      // Stocker l'ID de conversation pour les tests suivants
      conversationId = response.message.conversation_id;
      done();
    });
  });
  
  it('should get messages from a conversation', (done) => {
    client.GetMessages({
      conversation_id: conversationId,
      page: 1,
      limit: 10
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('messages');
      expect(response.messages).to.be.an('array');
      expect(response.messages.length).to.be.at.least(1);
      expect(response.messages[0]).to.have.property('content', 'Hello, this is a test message');
      expect(response).to.have.property('total_count');
      expect(response).to.have.property('page');
      expect(response).to.have.property('limit');
      done();
    });
  });
  
  it('should get conversations for a user', (done) => {
    client.GetConversations({
      user_id: userId
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('conversations');
      expect(response.conversations).to.be.an('array');
      expect(response.conversations.length).to.be.at.least(1);
      
      const conversation = response.conversations.find(c => c.id === conversationId);
      expect(conversation).to.exist;
      expect(conversation.participants).to.include(userId);
      expect(conversation.participants).to.include(userId2);
      
      done();
    });
  });
  
  it('should create a group chat', (done) => {
    client.CreateGroupChat({
      creator_id: userId,
      group_name: 'Test Group',
      member_ids: [userId2]
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('id');
      expect(response).to.have.property('name', 'Test Group');
      expect(response).to.have.property('creator_id', userId);
      expect(response).to.have.property('member_count', 2); // Créateur + 1 membre
      
      // Stocker l'ID du groupe pour les tests suivants
      groupId = response.id;
      done();
    });
  });
  
  it('should get group members', (done) => {
    client.GetGroupMembers({
      group_id: groupId
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('members');
      expect(response.members).to.be.an('array');
      expect(response.members.length).to.equal(2);
      
      const memberIds = response.members.map(m => m.user_id);
      expect(memberIds).to.include(userId);
      expect(memberIds).to.include(userId2);
      
      done();
    });
  });
  
  it('should add a user to a group', (done) => {
    const newUserId = 'test-user-3';
    
    client.AddUserToGroup({
      group_id: groupId,
      user_id: newUserId,
      admin_id: userId
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('id', groupId);
      expect(response).to.have.property('member_count', 3);
      
      // Vérifier que l'utilisateur a bien été ajouté
      client.GetGroupMembers({
        group_id: groupId
      }, (err, membersResponse) => {
        expect(err).to.be.null;
        expect(membersResponse.members.length).to.equal(3);
        
        const memberIds = membersResponse.members.map(m => m.user_id);
        expect(memberIds).to.include(newUserId);
        
        done();
      });
    });
  });
  
  it('should remove a user from a group', (done) => {
    const userToRemove = userId2;
    
    client.RemoveUserFromGroup({
      group_id: groupId,
      user_id: userToRemove,
      admin_id: userId
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('id', groupId);
      expect(response).to.have.property('member_count', 2);
      
      // Vérifier que l'utilisateur a bien été supprimé
      client.GetGroupMembers({
        group_id: groupId
      }, (err, membersResponse) => {
        expect(err).to.be.null;
        expect(membersResponse.members.length).to.equal(2);
        
        const memberIds = membersResponse.members.map(m => m.user_id);
        expect(memberIds).to.not.include(userToRemove);
        
        done();
      });
    });
  });
  
  it('should get user groups', (done) => {
    client.GetUserGroups({
      user_id: userId
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('groups');
      expect(response.groups).to.be.an('array');
      expect(response.groups.length).to.be.at.least(1);
      
      const group = response.groups.find(g => g.id === groupId);
      expect(group).to.exist;
      expect(group).to.have.property('name', 'Test Group');
      
      done();
    });
  });
  
  it('should ask AI and get a response', (done) => {
    client.AskAI({
      user_id: userId,
      query: 'Quels sont les avantages d\'acheter un appartement en centre-ville?',
      conversation_id: conversationId
    }, (err, response) => {
      expect(err).to.be.null;
      expect(response).to.have.property('response');
      expect(response.response).to.be.a('string');
      expect(response.response.length).to.be.greaterThan(50);
      expect(response).to.have.property('suggested_properties');
      
      // Vérifier que le message AI a été ajouté à la conversation
      client.GetMessages({
        conversation_id: conversationId
      }, (err, messagesResponse) => {
        expect(err).to.be.null;
        
        const aiMessage = messagesResponse.messages.find(m => m.is_ai === true);
        expect(aiMessage).to.exist;
        expect(aiMessage).to.have.property('sender_id', 'AI');
        
        done();
      });
    });
  });
});