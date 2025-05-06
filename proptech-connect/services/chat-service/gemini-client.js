// chat-service/gemini-client.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('ERREUR: Clé API Gemini non trouvée dans les variables d\'environnement');
  process.exit(1);
}

// Initialiser l'API Gemini
const genAI = new GoogleGenerativeAI(API_KEY);

const getGeminiResponse = async (query, context = '', userRole = 'buyer') => {
  try {
    // Utiliser le modèle gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log('Sending query to Gemini:', query);
    
    // Créer un prompt adapté au rôle de l'utilisateur
    let roleSpecificInstructions = '';
    
    switch (userRole) {
      case 'buyer':
        roleSpecificInstructions = 'Cet utilisateur est un acheteur potentiel. Donnez des conseils sur les quartiers, les prix, les processus d\'achat et les aspects à prendre en compte pour l\'achat immobilier.';
        break;
      case 'seller':
        roleSpecificInstructions = 'Cet utilisateur est un vendeur. Fournissez des conseils sur la valorisation de biens, les stratégies de mise en vente, les étapes de la vente et comment maximiser le prix de vente.';
        break;
      case 'agent':
        roleSpecificInstructions = 'Cet utilisateur est un agent immobilier. Fournissez des informations plus techniques sur le marché, les aspects légaux et les stratégies de négociation.';
        break;
      case 'admin':
        roleSpecificInstructions = 'Cet utilisateur est un administrateur de la plateforme. Fournissez des informations détaillées et complètes sur tous les aspects de l\'immobilier, sans restriction.';
        break;
      default:
        roleSpecificInstructions = 'Donnez des conseils généraux sur l\'immobilier adaptés à un large public.';
    }
    
    const prompt = `
Tu es un assistant immobilier expert pour l'application PropTech Connect.

${roleSpecificInstructions}

${context ? `Contexte de la conversation:\n${context}\n\n` : ''}

Question du client: ${query}

Donne une réponse informative, précise et utile sur le sujet immobilier, en gardant un ton professionnel mais cordial. Sois concis et direct dans tes recommandations.
`;
      
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log('Received response from Gemini');
    
    return text;
  } catch (error) {
    console.error('Error with Gemini API:', error);
    throw new Error(`Erreur avec l'API Gemini: ${error.message}`);
  }
};

module.exports = {
  getGeminiResponse
};