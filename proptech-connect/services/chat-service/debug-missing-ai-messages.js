// debug-missing-ai-messages.js
require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proptech-chat';
console.log('Using MongoDB URI:', MONGODB_URI);

// Define schemas
const messageSchema = new mongoose.Schema({
  sender_id: { type: String, required: true },
  sender_role: { type: String, enum: ['buyer', 'seller', 'agent', 'admin', 'system'], required: true },
  sender_name: { type: String, required: true },
  receiver_id: { type: String, default: '' },
  content: { type: String },
  conversation_id: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  is_ai: { type: Boolean, default: false },
  created_at: { type: String, required: true },
  updated_at: { type: String }
});

const conversationSchema = new mongoose.Schema({
  participants: [String],
  participant_roles: [String],
  is_group: { type: Boolean, default: false },
  group_name: { type: String },
  creator_id: { type: String },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
});

// Override the models only if they're not already defined
let Message, Conversation;
try {
  Message = mongoose.model('Message');
} catch (e) {
  Message = mongoose.model('Message', messageSchema);
}

try {
  Conversation = mongoose.model('Conversation');
} catch (e) {
  Conversation = mongoose.model('Conversation', conversationSchema);
}

async function debug() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // The conversation ID you've been using
    const conversationId = '6825453e57ed264e894ff968';
    
    // 1. Check if the conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      console.log(`Conversation with ID ${conversationId} NOT FOUND!`);
    } else {
      console.log(`Conversation found:`);
      console.log(`- ID: ${conversation._id}`);
      console.log(`- Participants: ${conversation.participants.join(', ')}`);
      console.log(`- Updated At: ${conversation.updated_at}`);
      
      // 2. Look for ANY messages with this conversation ID
      const allMessages = await Message.find();
      console.log(`\nTotal messages in database: ${allMessages.length}`);
      
      // 3. Check messages for this conversation with string comparison
      const messagesInConversation = allMessages.filter(m => 
        m.conversation_id.toString() === conversationId.toString()
      );
      
      console.log(`Messages where conversation_id === "${conversationId}": ${messagesInConversation.length}`);
      
      // 4. Check specifically for AI messages in the whole collection
      const aiMessages = allMessages.filter(m => m.is_ai === true);
      console.log(`\nTotal AI messages in database: ${aiMessages.length}`);
      
      if (aiMessages.length > 0) {
        console.log(`\nAI messages details:`);
        aiMessages.forEach((message, index) => {
          console.log(`\nAI Message #${index + 1}:`);
          console.log(`- ID: ${message._id}`);
          console.log(`- Sender ID: ${message.sender_id}`);
          console.log(`- Conversation ID: ${message.conversation_id}`);
          console.log(`- Is AI: ${message.is_ai}`);
          console.log(`- Conversation ID Match: ${message.conversation_id.toString() === conversationId.toString()}`);
          console.log(`- Created At: ${message.created_at}`);
        });
      } else {
        console.log('No AI messages found in the entire database.');
        
        // 5. Look for messages with sender_id = 'AI'
        const senderAiMessages = allMessages.filter(m => m.sender_id === 'AI');
        console.log(`\nMessages with sender_id='AI': ${senderAiMessages.length}`);
        
        if (senderAiMessages.length > 0) {
          console.log(`\nSender='AI' messages details:`);
          senderAiMessages.forEach((message, index) => {
            console.log(`\nMessage #${index + 1}:`);
            console.log(`- ID: ${message._id}`);
            console.log(`- Sender ID: ${message.sender_id}`);
            console.log(`- Conversation ID: ${message.conversation_id}`);
            console.log(`- Is AI: ${message.is_ai}`);
            console.log(`- Created At: ${message.created_at}`);
          });
        }
      }
      
      // 6. Create a test AI message to see if there's any issue
      console.log('\nCreating a test AI message...');
      const testMessage = new Message({
        sender_id: 'AI',
        sender_role: 'admin',
        sender_name: 'Assistant IA (TEST)',
        receiver_id: conversation.participants[0],
        content: 'This is a test AI message to debug the chat system',
        conversation_id: conversationId,
        is_read: false,
        is_ai: true,
        created_at: new Date().toISOString()
      });
      
      const savedMessage = await testMessage.save();
      console.log(`Test message saved with ID: ${savedMessage._id}`);
      
      // 7. Verify the test message is found
      const afterTestMessages = await Message.find({ conversation_id: conversationId });
      console.log(`\nMessages in conversation after test: ${afterTestMessages.length}`);
      
      // 8. Check if test message appears in normal query
      console.log('\nRecreating the GetMessages query:');
      const messagesFromGetMessages = await Message.find({ conversation_id: conversationId })
        .sort({ created_at: 1 })
        .exec();
      
      console.log(`Query returned ${messagesFromGetMessages.length} messages`);
      console.log('Messages found:');
      messagesFromGetMessages.forEach((message, index) => {
        console.log(`\nMessage #${index + 1}:`);
        console.log(`- ID: ${message._id}`);
        console.log(`- Sender ID: ${message.sender_id}`);
        console.log(`- Is AI: ${message.is_ai}`);
        console.log(`- Created At: ${message.created_at}`);
        console.log(`- Content: ${message.content.substring(0, 30)}...`);
      });
    }
  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debug(); 