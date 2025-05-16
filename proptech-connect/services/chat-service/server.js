// chat-service/server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
const path = require('path');
require('dotenv').config();

console.log('Démarrage du service de chat amélioré...');
console.log('Variables d\'environnement chargées:', {
  MONGODB_URI: process.env.MONGODB_URI ? 'Défini' : 'Non défini',
  PORT: process.env.PORT ? process.env.PORT : 'Non défini',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Défini' : 'Non défini',
  KAFKA_BROKER: process.env.KAFKA_BROKER ? 'Défini' : 'Non défini'
});

// Configuration Kafka
const kafka = new Kafka({
  clientId: 'chat-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'chat-group' });

// Chemins des fichiers proto
const PROTO_PATH = path.join(__dirname, '../../proto/chat.proto');

// Charger les modèles Mongoose
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const GroupMember = require('./models/GroupMember');
const typingStatusManager = require('./typing-status-manager');
const UserStatus = require('./models/UserStatus');
const AdminNotification = require('./models/AdminNotification');
// Service utilisateur pour obtenir les informations des utilisateurs
const userService = require('./user-service-client');

// Charger le service depuis le fichier proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;

// Fonction pour obtenir les infos utilisateur (nom et rôle)
async function getUserInfo(userId) {
  try {
    const userInfo = await userService.getUserById(userId);
    return {
      name: userInfo.name || userInfo.username || 'Utilisateur',
      role: userInfo.role || 'buyer'
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération des infos utilisateur ${userId}:`, error);
    return {
      name: 'Utilisateur',
      role: 'buyer'
    };
  }
}

// Implémentation du service
const chatService = {
  // Envoyer un message
  SendMessage: async (call, callback) => {
    try {
      const { sender_id, content, conversation_id, receiver_id } = call.request;
      console.log(`Message de ${sender_id} dans conversation ${conversation_id || 'nouvelle'}`);
      
      // Obtenir les informations de l'expéditeur
      const senderInfo = await getUserInfo(sender_id);
      
      let actualConversationId = conversation_id;
      
      // Si aucune conversation n'est spécifiée, créer une nouvelle conversation
      if (!actualConversationId && receiver_id) {
        // Check if user is messaging themselves
        const isSelfMessage = sender_id === receiver_id;
        console.log(`Self message: ${isSelfMessage}`);
        
        // Vérifier si une conversation existe déjà entre ces utilisateurs
        const existingConversation = await Conversation.findOne({
          is_group: false,
          participants: { $all: [sender_id, receiver_id] },
          ...(isSelfMessage ? { participants: { $size: 1 } } : {})
        });
        
        if (existingConversation) {
          actualConversationId = existingConversation._id.toString();
          console.log(`Utilisation d'une conversation existante: ${actualConversationId}`);
        } else {
          // Obtenir les informations du destinataire
          const receiverInfo = await getUserInfo(receiver_id);
          
          // Créer une nouvelle conversation
          const newConversation = new Conversation({
            participants: isSelfMessage ? [sender_id] : [sender_id, receiver_id],
            participant_roles: isSelfMessage ? [senderInfo.role] : [senderInfo.role, receiverInfo.role],
            is_group: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          const savedConversation = await newConversation.save();
          actualConversationId = savedConversation._id.toString();
          console.log(`Nouvelle conversation créée: ${actualConversationId}`);
        }
      }
      
      // Vérifier que l'expéditeur est membre de la conversation
      const conversation = await Conversation.findById(actualConversationId);
      if (!conversation) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Conversation not found'
        });
      }
      
      if (!conversation.participants.includes(sender_id)) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'User is not a participant in this conversation'
        });
      }
      
      // Créer le nouveau message
      const newMessage = new Message({
        sender_id,
        sender_role: senderInfo.role,
        sender_name: senderInfo.name,
        receiver_id: conversation.is_group ? 
                    // For group conversations, include all participants except the sender
                    conversation.participants.filter(p => p !== sender_id).join(',') : 
                    // For one-on-one conversations, use the existing logic
                    (conversation.participants.length === 1 || sender_id === receiver_id ? sender_id : 
                    conversation.participants.find(p => p !== sender_id) || ''),
        content,
        conversation_id: actualConversationId,
        is_read: false,
        is_ai: false,
        created_at: new Date().toISOString()
      });
      
      const savedMessage = await newMessage.save();
      
      // Mettre à jour la date de mise à jour de la conversation
      await Conversation.findByIdAndUpdate(actualConversationId, {
        updated_at: new Date().toISOString()
      });
      
      // Produire un événement Kafka pour les notifications
      await producer.send({
        topic: 'chat-events',
        messages: [
          { 
            key: 'new-message',
            value: JSON.stringify({
              message_id: savedMessage._id.toString(),
              sender_id: savedMessage.sender_id,
              sender_name: savedMessage.sender_name,
              conversation_id: savedMessage.conversation_id,
              is_group: conversation.is_group,
              group_name: conversation.group_name,
              content_preview: savedMessage.content.substring(0, 50),
              created_at: savedMessage.created_at
            }) 
          }
        ]
      });
      
      callback(null, {
        message: {
          id: savedMessage._id.toString(),
          sender_id: savedMessage.sender_id,
          sender_role: savedMessage.sender_role,
          sender_name: savedMessage.sender_name,
          receiver_id: savedMessage.receiver_id,
          content: savedMessage.content,
          conversation_id: savedMessage.conversation_id,
          is_read: savedMessage.is_read,
          is_ai: savedMessage.is_ai,
          created_at: savedMessage.created_at
        }
      });
    } catch (error) {
      console.error('Error in SendMessage:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Récupérer les messages d'une conversation
  GetMessages: async (call, callback) => {
    try {
      const { conversation_id, page = 1, limit = 50 } = call.request;
      console.log(`Getting messages for conversation: ${conversation_id}`);
      
      // Vérifier que la conversation existe
      const conversation = await Conversation.findById(conversation_id);
      if (!conversation) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Conversation not found'
        });
      }
      
      const skip = (page - 1) * limit;
      
      const [messages, totalCount] = await Promise.all([
        Message.find({ conversation_id })
          .sort({ created_at: 1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        Message.countDocuments({ conversation_id })
      ]);
      
      const result = messages.map(message => ({
        id: message._id.toString(),
        sender_id: message.sender_id,
        sender_role: message.sender_role,
        sender_name: message.sender_name,
        receiver_id: message.receiver_id,
        content: message.content,
        conversation_id: message.conversation_id,
        is_read: message.is_read,
        is_ai: message.is_ai || false,
        created_at: message.created_at
      }));
      
      callback(null, { 
        messages: result,
        total_count: totalCount,
        page,
        limit
      });
    } catch (error) {
      console.error('Error in GetMessages:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Récupérer les conversations d'un utilisateur
  GetConversations: async (call, callback) => {
    try {
      const { user_id } = call.request;
      console.log(`Getting conversations for user: ${user_id}`);
      
      const conversations = await Conversation.find({
        participants: user_id
      }).sort({ updated_at: -1 });
      
      const result = [];
      
      for (const conversation of conversations) {
        const lastMessage = await Message.findOne({ conversation_id: conversation._id })
          .sort({ created_at: -1 })
          .exec();
        
        // Pour les conversations de groupe, récupérer le nombre de membres
        let memberCount = conversation.participants.length;
        if (conversation.is_group) {
          memberCount = await GroupMember.countDocuments({ conversation_id: conversation._id });
        }
        
        result.push({
          id: conversation._id.toString(),
          participants: conversation.participants,
          participant_roles: conversation.participant_roles,
          is_group: conversation.is_group || false,
          group_name: conversation.group_name || '',
          last_message: lastMessage ? {
            id: lastMessage._id.toString(),
            sender_id: lastMessage.sender_id,
            sender_role: lastMessage.sender_role,
            sender_name: lastMessage.sender_name,
            content: lastMessage.content,
            is_read: lastMessage.is_read,
            created_at: lastMessage.created_at
          } : null,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at
        });
      }
      
      callback(null, { conversations: result });
    } catch (error) {
      console.error('Error in GetConversations:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Créer un groupe de chat
  CreateGroupChat: async (call, callback) => {
    try {
      const { creator_id, group_name, member_ids } = call.request;
      
      if (!group_name || !creator_id) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Group name and creator ID are required'
        });
      }
      
      // S'assurer que le créateur est inclus dans les membres
      const allMemberIds = Array.from(new Set([creator_id, ...member_ids]));
      
      // Obtenir les informations du créateur
      const creatorInfo = await getUserInfo(creator_id);
      
      // Créer la conversation de groupe
      const newGroup = new Conversation({
        participants: allMemberIds,
        participant_roles: allMemberIds.map(id => id === creator_id ? creatorInfo.role : 'unknown'),
        is_group: true,
        group_name,
        creator_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      const savedGroup = await newGroup.save();
      
      // Ajouter chaque membre au groupe
      const groupMembers = [];
      for (const memberId of allMemberIds) {
        const memberInfo = await getUserInfo(memberId);
        
        const groupMember = new GroupMember({
          conversation_id: savedGroup._id,
          user_id: memberId,
          user_name: memberInfo.name,
          user_role: memberInfo.role,
          joined_at: new Date().toISOString()
        });
        
        await groupMember.save();
        groupMembers.push(groupMember);
      }
      
      // Créer un message système pour annoncer la création du groupe
      const systemMessage = new Message({
        sender_id: creator_id,
        sender_role: creatorInfo.role,
        sender_name: creatorInfo.name,
        content: `${creatorInfo.name} a créé le groupe "${group_name}"`,
        conversation_id: savedGroup._id,
        is_read: false,
        is_ai: false,
        created_at: new Date().toISOString()
      });
      
      await systemMessage.save();
      
      // Produire un événement Kafka
      await producer.send({
        topic: 'chat-events',
        messages: [
          { 
            key: 'group-created',
            value: JSON.stringify({
              group_id: savedGroup._id.toString(),
              group_name: savedGroup.group_name,
              creator_id: savedGroup.creator_id,
              member_count: allMemberIds.length,
              created_at: savedGroup.created_at
            }) 
          }
        ]
      });
      
      callback(null, {
        id: savedGroup._id.toString(),
        name: savedGroup.group_name,
        creator_id: savedGroup.creator_id,
        member_count: allMemberIds.length,
        created_at: savedGroup.created_at,
        updated_at: savedGroup.updated_at
      });
    } catch (error) {
      console.error('Error in CreateGroupChat:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Ajouter un utilisateur à un groupe
  AddUserToGroup: async (call, callback) => {
    try {
      const { group_id, user_id, admin_id } = call.request;
      
      // Vérifier que le groupe existe
      const group = await Conversation.findById(group_id);
      if (!group || !group.is_group) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Group not found'
        });
      }
      
      // Vérifier que l'admin est membre du groupe
      const isAdmin = group.creator_id === admin_id || 
                      (await GroupMember.findOne({ conversation_id: group_id, user_id: admin_id, user_role: 'admin' }));
      
      if (!isAdmin) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only group admin can add members'
        });
      }
      
      // Vérifier si l'utilisateur est déjà membre
      const existingMember = await GroupMember.findOne({ 
        conversation_id: group_id, 
        user_id: user_id 
      });
      
      if (existingMember) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'User is already a member of this group'
        });
      }
      
      // Obtenir les informations de l'utilisateur
      const userInfo = await getUserInfo(user_id);
      const adminInfo = await getUserInfo(admin_id);
      
      // Ajouter l'utilisateur aux participants de la conversation
      if (!group.participants.includes(user_id)) {
        await Conversation.updateOne(
          { _id: group_id },
          { 
            $push: { 
              participants: user_id,
              participant_roles: userInfo.role
            },
            $set: { updated_at: new Date().toISOString() }
          }
        );
      }
      
      // Ajouter l'utilisateur comme membre du groupe
      const newMember = new GroupMember({
        conversation_id: group_id,
        user_id,
        user_name: userInfo.name,
        user_role: userInfo.role,
        joined_at: new Date().toISOString()
      });
      
      await newMember.save();
      
      // Créer un message système pour annoncer l'ajout du membre
      const systemMessage = new Message({
        sender_id: admin_id,
        sender_role: adminInfo.role,
        sender_name: adminInfo.name,
        content: `${adminInfo.name} a ajouté ${userInfo.name} au groupe`,
        conversation_id: group_id,
        is_read: false,
        is_ai: false,
        created_at: new Date().toISOString()
      });
      
      await systemMessage.save();
      
      // Mettre à jour la date de mise à jour du groupe
      await Conversation.findByIdAndUpdate(group_id, {
        updated_at: new Date().toISOString()
      });
      
      // Produire un événement Kafka
      await producer.send({
        topic: 'chat-events',
        messages: [
          { 
            key: 'member-added',
            value: JSON.stringify({
              group_id: group_id,
              group_name: group.group_name,
              user_id: user_id,
              user_name: userInfo.name,
              added_by: admin_id,
              added_at: new Date().toISOString()
            }) 
          }
        ]
      });
      
      callback(null, {
        id: group._id.toString(),
        name: group.group_name,
        creator_id: group.creator_id,
        member_count: (await GroupMember.countDocuments({ conversation_id: group_id })),
        created_at: group.created_at,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in AddUserToGroup:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Supprimer un utilisateur d'un groupe
  RemoveUserFromGroup: async (call, callback) => {
    try {
      const { group_id, user_id, admin_id } = call.request;
      
      // Vérifier que le groupe existe
      const group = await Conversation.findById(group_id);
      if (!group || !group.is_group) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Group not found'
        });
      }
      
      // Vérifier que l'admin est le créateur du groupe ou un administrateur
      const isAdmin = group.creator_id === admin_id || 
                      (await GroupMember.findOne({ conversation_id: group_id, user_id: admin_id, user_role: 'admin' }));
      
      // Permettre à un utilisateur de quitter le groupe
      const isSelfRemoval = user_id === admin_id;
      
      if (!isAdmin && !isSelfRemoval) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only group admin can remove members'
        });
      }
      
      // Vérifier si l'utilisateur est membre du groupe
      const member = await GroupMember.findOne({ 
        conversation_id: group_id, 
        user_id: user_id 
      });
      
      if (!member) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User is not a member of this group'
        });
      }
      
      // Ne pas permettre la suppression du créateur par quelqu'un d'autre
      if (user_id === group.creator_id && !isSelfRemoval) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Group creator cannot be removed'
        });
      }
      
      // Obtenir les informations de l'utilisateur et de l'admin
      const userInfo = await getUserInfo(user_id);
      const adminInfo = await getUserInfo(admin_id);
      
      // Supprimer l'utilisateur de la liste des membres
      await GroupMember.deleteOne({ conversation_id: group_id, user_id: user_id });
      
      // Créer un message système
      const actionText = isSelfRemoval ? 
        `${userInfo.name} a quitté le groupe` : 
        `${adminInfo.name} a retiré ${userInfo.name} du groupe`;
      
      const systemMessage = new Message({
        sender_id: admin_id,
        sender_role: adminInfo.role,
        sender_name: adminInfo.name,
        content: actionText,
        conversation_id: group_id,
        is_read: false,
        is_ai: false,
        created_at: new Date().toISOString()
      });
      
      await systemMessage.save();
      
      // Mettre à jour la date de mise à jour du groupe
      await Conversation.findByIdAndUpdate(group_id, {
        updated_at: new Date().toISOString()
      });
      
      // Produire un événement Kafka
      await producer.send({
        topic: 'chat-events',
        messages: [
          { 
            key: 'member-removed',
            value: JSON.stringify({
              group_id: group_id,
              group_name: group.group_name,
              user_id: user_id,
              user_name: userInfo.name,
              removed_by: admin_id,
              is_self_removal: isSelfRemoval,
              removed_at: new Date().toISOString()
            }) 
          }
        ]
      });
      
      callback(null, {
        id: group._id.toString(),
        name: group.group_name,
        creator_id: group.creator_id,
        member_count: (await GroupMember.countDocuments({ conversation_id: group_id })),
        created_at: group.created_at,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in RemoveUserFromGroup:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Récupérer les membres d'un groupe
  GetGroupMembers: async (call, callback) => {
    try {
      const { group_id } = call.request;
      
      // Vérifier que le groupe existe
      const group = await Conversation.findById(group_id);
      if (!group || !group.is_group) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Group not found'
        });
      }
      
      // Récupérer tous les membres du groupe
      const members = await GroupMember.find({ conversation_id: group_id })
        .sort({ joined_at: 1 });
      
      const result = members.map(member => ({
        user_id: member.user_id,
        user_name: member.user_name,
        user_role: member.user_role,
        joined_at: member.joined_at
      }));
      
      callback(null, { members: result });
    } catch (error) {
      console.error('Error in GetGroupMembers:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Récupérer les groupes d'un utilisateur
  GetUserGroups: async (call, callback) => {
    try {
      const { user_id } = call.request;
      
      // Trouver les groupes dont l'utilisateur est membre
      const memberGroups = await GroupMember.find({ user_id });
      const groupIds = memberGroups.map(m => m.conversation_id);
      
      // Récupérer les informations des groupes
      const groups = await Conversation.find({
        _id: { $in: groupIds },
        is_group: true
      });
      
      const result = [];
      
      for (const group of groups) {
        const memberCount = await GroupMember.countDocuments({ conversation_id: group._id });
        
        result.push({
          id: group._id.toString(),
          name: group.group_name,
          creator_id: group.creator_id,
          member_count: memberCount,
          created_at: group.created_at,
          updated_at: group.updated_at
        });
      }
      
      callback(null, { groups: result });
    } catch (error) {
      console.error('Error in GetUserGroups:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },
  
  // Poser une question à l'IA
  AskAI: async (call, callback) => {
    try {
      const { user_id, query, conversation_id } = call.request;
      
      console.log(`User ${user_id} asking AI: ${query}`);
      
      // Obtenir le contexte de la conversation si conversation_id est fourni
      let context = '';
      if (conversation_id) {
        try {
          // Récupérer les messages précédents (maximum 5 derniers)
          const messages = await Message.find({ conversation_id })
            .sort({ created_at: -1 })
            .limit(5)
            .exec();
          
          if (messages && messages.length > 0) {
            context = messages.reverse().map(m => 
              `${m.sender_id === 'AI' ? 'Assistant' : `${m.sender_name} (${m.sender_role})`}: ${m.content}`
            ).join('\n');
          }
        } catch (err) {
          console.error('Error retrieving conversation context:', err);
        }
      }
      
      // Obtenir les informations de l'utilisateur
      const userInfo = await getUserInfo(user_id);
      
      // Enregistrer la question de l'utilisateur en tant que message si conversation_id est fourni
      if (conversation_id) {
        try {
          const userQueryMessage = new Message({
            sender_id: user_id,
            sender_role: userInfo.role,
            sender_name: userInfo.name,
            receiver_id: 'AI',
            content: query,
            conversation_id,
            is_read: true,
            is_ai: false,
            created_at: new Date().toISOString()
          });
          
          await userQueryMessage.save();
          console.log('User query saved to conversation');
        } catch (dbError) {
          console.error('Error saving user query to database:', dbError);
        }
      }
      
      // Appeler l'API Gemini
      const geminiClient = require('./gemini-client');
      let aiResponse;
      try {
        aiResponse = await geminiClient.getGeminiResponse(query, context, userInfo.role);
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
        // Utiliser une réponse de secours en cas d'échec
        aiResponse = "Je suis désolé, mais je rencontre des difficultés à traiter votre demande pour le moment. Pourriez-vous reformuler votre question ou essayer à nouveau plus tard?";
      }
      
      console.log('AI Response:', aiResponse.substring(0, 100) + '...');
      
      // Enregistrer la réponse en tant que message si conversation_id est fourni
      if (conversation_id) {
        try {
          const newMessage = new Message({
            sender_id: 'AI',
            sender_role: 'admin',
            sender_name: 'Assistant IA',
            receiver_id: user_id,
            content: aiResponse,
            conversation_id,
            is_read: false,
            is_ai: true,
            created_at: new Date().toISOString()
          });
          
          await newMessage.save();
          console.log('AI response saved to conversation');
          
          // Mettre à jour la date de mise à jour de la conversation
          await Conversation.findByIdAndUpdate(conversation_id, {
            updated_at: new Date().toISOString()
          });
        } catch (dbError) {
          console.error('Error saving AI response to database:', dbError);
        }
      }
      
      callback(null, {
        response: aiResponse
      });
    } catch (error) {
      console.error('Error in AskAI:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: `Error processing AI request: ${error.message}`
      });
    }
  },
  
  // Mettre à jour le statut d'un utilisateur
  UpdateUserStatus: async (call, callback) => {
    try {
      const { user_id, status, device_info } = call.request;
      
      if (!['online', 'offline', 'away', 'busy'].includes(status)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Invalid status value'
        });
      }
      
      // Mettre à jour ou créer un statut utilisateur
      const userStatus = await UserStatus.findOneAndUpdate(
        { user_id },
        { 
          status, 
          device_info,
          last_active: new Date(),
          updated_at: new Date()
        },
        { upsert: true, new: true }
      );
      
      // Produire un événement Kafka pour le changement de statut
      await producer.send({
        topic: 'user-status-events',
        messages: [
          { 
            key: user_id,
            value: JSON.stringify({
              user_id,
              status,
              last_active: userStatus.last_active.toISOString()
            })
          }
        ]
      });
      
      callback(null, {
        user_id,
        status,
        last_active: userStatus.last_active.toISOString()
      });
    } catch (error) {
      console.error('Error in UpdateUserStatus:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Obtenir le statut d'un utilisateur
  GetUserStatus: async (call, callback) => {
    try {
      const { user_id } = call.request;
      
      const userStatus = await UserStatus.findOne({ user_id });
      
      if (!userStatus) {
        return callback(null, {
          user_id,
          status: 'offline',
          last_active: new Date(0).toISOString()
        });
      }
      
      callback(null, {
        user_id,
        status: userStatus.status,
        last_active: userStatus.last_active.toISOString()
      });
    } catch (error) {
      console.error('Error in GetUserStatus:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Obtenir la liste des utilisateurs en ligne
  GetOnlineUsers: async (call, callback) => {
    try {
      // Obtenir les utilisateurs en ligne (statut différent de 'offline')
      const onlineUsers = await UserStatus.find({ 
        status: { $ne: 'offline' },
        // Considérer comme offline si inactif depuis plus de 5 minutes
        last_active: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });
      
      const result = onlineUsers.map(user => ({
        user_id: user.user_id,
        status: user.status,
        last_active: user.last_active.toISOString()
      }));
      
      callback(null, { users: result });
    } catch (error) {
      console.error('Error in GetOnlineUsers:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Mettre à jour le statut de saisie
  UpdateTypingStatus: async (call, callback) => {
    try {
      const { user_id, conversation_id, is_typing } = call.request;
      
      console.log(`UpdateTypingStatus: user=${user_id}, conversation=${conversation_id}, is_typing=${is_typing}`);
      
      // Vérifier que la conversation existe
      const conversation = await Conversation.findById(conversation_id);
      if (!conversation) {
        console.error(`Conversation not found: ${conversation_id}`);
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Conversation not found'
        });
      }
      
      // Vérifier que l'utilisateur est membre de la conversation
      if (!conversation.participants.includes(user_id)) {
        console.error(`User ${user_id} is not a participant in conversation ${conversation_id}`);
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'User is not a participant in this conversation'
        });
      }
      
      // Mettre à jour le statut de saisie
      const result = typingStatusManager.updateTypingStatus(conversation_id, user_id, is_typing);
      console.log(`Typing status updated: ${result}`);
      console.log(`Current typing users for ${conversation_id}:`, typingStatusManager.getTypingUsers(conversation_id));
      
      // Produire un événement Kafka pour le changement de statut de saisie
      await producer.send({
        topic: 'chat-events',
        messages: [
          { 
            key: 'typing-status',
            value: JSON.stringify({
              conversation_id,
              user_id,
              is_typing,
              timestamp: new Date().toISOString()
            })
          }
        ]
      });
      
      callback(null, { success: result });
    } catch (error) {
      console.error('Error in UpdateTypingStatus:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  // Obtenir la liste des utilisateurs en train de taper
  GetTypingUsers: async (call, callback) => {
    try {
      const { conversation_id } = call.request;
      
      console.log(`GetTypingUsers: conversation=${conversation_id}`);
      
      // Vérifier que la conversation existe
      const conversation = await Conversation.findById(conversation_id);
      if (!conversation) {
        console.error(`Conversation not found: ${conversation_id}`);
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Conversation not found'
        });
      }
      
      // Obtenir la liste des utilisateurs en train de taper
      const typingUserIds = typingStatusManager.getTypingUsers(conversation_id);
      console.log(`Typing users for ${conversation_id}:`, typingUserIds);
      
      callback(null, { typing_user_ids: typingUserIds });
    } catch (error) {
      console.error('Error in GetTypingUsers:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  }
  
};

// Connexion à MongoDB et Kafka
const PORT = process.env.PORT || 50054;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-chat';

async function startServices() {
  try {
    // Connecter à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connecté à MongoDB');
    
    // Connecter à Kafka
    await producer.connect();
    await consumer.connect();
    console.log('Consumer connected to Kafka');
    
    // S'abonner à TOUS les sujets Kafka pertinents en une seule opération
    await consumer.subscribe({ 
      topics: ['user-events', 'property-events', 'appointment-events'],
      fromBeginning: false 
    });
    console.log('Subscribed to all required topics');
    
    // Traiter les messages Kafka
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const eventData = JSON.parse(message.value.toString());
          const eventKey = message.key ? message.key.toString() : null;
          
          if (topic === 'property-events') {
            console.log(`Received Kafka event from ${topic}: ${eventKey || 'unknown event'}`);
          } else {
            console.log(`Received Kafka event from ${topic}:`, eventData.event || eventKey || 'unknown event');
          }
          
          // Traiter différents types d'événements
          if (topic === 'user-events') {
            // Traiter les événements utilisateur (changements de profil, etc.)
            if (eventData.event === 'USER_UPDATED') {
              // Mettre à jour les informations utilisateur dans les messages et groupes
            }
          } else if (topic === 'property-events') {
            // For property events, the event type is in the message key
            const eventType = eventKey || (eventData.event || '');
            
            switch (eventType) {
              case 'PROPERTY_SOLD':
                if (eventData.buyer_id && eventData.seller_id) {
                  // Créer une conversation entre l'acheteur et le vendeur si elle n'existe pas déjà
                  const existingConversation = await Conversation.findOne({
                    is_group: false,
                    participants: { $all: [eventData.buyer_id, eventData.seller_id] }
                  });
                  
                  if (!existingConversation) {
                    const buyerInfo = await getUserInfo(eventData.buyer_id);
                    const sellerInfo = await getUserInfo(eventData.seller_id);
                    
                    const newConversation = new Conversation({
                      participants: [eventData.buyer_id, eventData.seller_id],
                      participant_roles: [buyerInfo.role, sellerInfo.role],
                      is_group: false,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    });
                    
                    const savedConversation = await newConversation.save();
                    
                    // Créer un message système pour annoncer la vente
                    const systemMessage = new Message({
                      sender_id: 'SYSTEM',
                      sender_role: 'system',
                      sender_name: 'Système',
                      content: `Transaction pour la propriété "${eventData.property_title}" initiée. Utilisez cette conversation pour discuter des détails.`,
                      conversation_id: savedConversation._id,
                      is_read: false,
                      is_ai: false,
                      created_at: new Date().toISOString()
                    });
                    
                    await systemMessage.save();
                  }
                }
                break;
              
              case 'property-created':
                console.log(`New property created: ${eventData.property_id || 'unknown'}`);
                break;
                
              case 'property-updated':
                console.log(`Property updated: ${eventData.property_id || 'unknown'}`);
                break;
                
              case 'property-deleted':
                console.log(`Property deleted: ${eventData.property_id || 'unknown'}`);
                break;
                
              default:
                // Just log the event without showing "unknown event"
                console.log(`Received property event with key: ${eventType}`);
                break;
            }
          } else if (topic === 'appointment-events') {
            // Traiter les événements de rendez-vous
            if (['APPOINTMENT_CREATED', 'APPOINTMENT_UPDATED', 'APPOINTMENT_DELETED'].includes(eventData.event)) {
              try {
                // Vérifier si une conversation existe entre les participants
                const appointment = eventData.appointment;

                if (appointment && appointment.user_id && appointment.agent_id) {
                  const existingConversation = await Conversation.findOne({
                    is_group: false,
                    participants: { $all: [appointment.user_id, appointment.agent_id] }
                  });

                  if (existingConversation) {
                    // Créer un message système pour informer de l'événement de rendez-vous
                    let content = '';

                    switch (eventData.event) {
                      case 'APPOINTMENT_CREATED':
                        content = `Nouveau rendez-vous programmé pour le ${new Date(appointment.date_time).toLocaleString()}`;
                        break;
                      case 'APPOINTMENT_UPDATED':
                        content = `Le rendez-vous du ${new Date(appointment.date_time).toLocaleString()} a été mis à jour. Statut: ${appointment.status}`;
                        break;
                      case 'APPOINTMENT_DELETED':
                        content = `Le rendez-vous a été annulé`;
                        break;
                    }

                    const systemMessage = new Message({
                      sender_id: 'SYSTEM',
                      sender_role: 'system',
                      sender_name: 'Système',
                      receiver_id: null,
                      content,
                      conversation_id: existingConversation._id,
                      is_read: false,
                      is_ai: false,
                      created_at: new Date().toISOString()
                    });

                    await systemMessage.save();

                    // Mettre à jour la date de mise à jour de la conversation
                    await Conversation.findByIdAndUpdate(existingConversation._id, {
                      updated_at: new Date().toISOString()
                    });
                  }
                }
              } catch (error) {
                console.error('Error processing appointment event in chat service:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
    
    console.log('Connected to Kafka');
    
    // Créer et démarrer le serveur gRPC
    const server = new grpc.Server();
    server.addService(chatProto.ChatService.service, chatService);
    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
      if (error) {
        console.error('Failed to start gRPC server:', error);
        return;
      }
      
      server.start();
      console.log(`Service de chat démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur de démarrage des services:', error);
    process.exit(1);
  }
}

// Démarrer les services
startServices();

// Gérer l'arrêt gracieux
process.on('SIGINT', async () => {
  console.log('Arrêt du service de chat...');
  try {
    await consumer.disconnect();
    await producer.disconnect();
    await mongoose.disconnect();
    console.log('Connexions fermées proprement');
  } catch (error) {
    console.error('Erreur lors de la fermeture des connexions:', error);
  }
  process.exit(0);
});
