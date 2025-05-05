// test-gemini-latest.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyA8BTLy228TBDJ_XJq6Qhdh7jXfR3BfUho';
const genAI = new GoogleGenerativeAI(API_KEY);

async function testGeminiModels() {
  const modelNames = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-pro-latest"
  ];

  for (const modelName of modelNames) {
    try {
      console.log(`Essai avec le modèle: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Qu'est-ce que l'immobilier proptech?");
      console.log(`Succès avec ${modelName}`);
      console.log('Réponse:', result.response.text().substring(0, 100) + '...');
      console.log('-----------------------------------');
    } catch (error) {
      console.error(`Erreur avec ${modelName}:`, error.message);
      console.log('-----------------------------------');
    }
  }
}

testGeminiModels();