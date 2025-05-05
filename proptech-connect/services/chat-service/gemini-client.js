const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('ERREUR: Clé API Gemini non trouvée dans les variables d\'environnement');
  process.exit(1);
}

// Initialiser l'API Gemini
const genAI = new GoogleGenerativeAI(API_KEY);

const getGeminiResponse = async (query, context = '') => {
  try {
    // Utiliser le modèle gemini-1.5-flash qui a fonctionné dans vos tests
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log('Sending query to Gemini:', query);
    
    const prompt = `
Tu es un assistant immobilier expert pour l'application PropTech Connect.

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