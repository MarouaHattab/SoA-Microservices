const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Try to get API key but mark it as unverified by default
let API_KEY = process.env.GEMINI_API_KEY;
let apiKeyVerified = false;

// Clear log to indicate we're starting with a clean state
console.log('Initializing Gemini client...');

if (!API_KEY || API_KEY.trim() === '') {
  console.warn('WARNING: Gemini API key not found in environment variables. Will use mock responses only.');
} else {
  console.log('Found Gemini API key in environment:', API_KEY.substring(0, 5) + '...');
  console.log('Will attempt to verify API key but fallback to mock responses if needed.');
}

// Function to detect language (improved version)
function detectLanguage(text) {
  // Log some text characters for debugging
  console.log('Analyzing text for language detection:', text.substring(0, 20) + '...');
  
  // Special case for Arabic queries with keywords about locations in Tunisia
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text) && 
      (text.includes('تونس') || text.includes('منازل') || text.includes('عقارات') || 
       text.includes('أماكن') || text.includes('مناطق') || text.includes('جميلة'))) {
    console.log('Special case: Detected Arabic text with Tunisia-related keywords');
    return 'arabic';
  }
  
  // Check for Arabic script (improved range)
  const arabicMatch = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
  if (arabicMatch && arabicMatch.length > 1) {
    console.log('Detected Arabic script:', arabicMatch.join('').substring(0, 10) + '...');
    return 'arabic';
  }
  
  // Check for Cyrillic script (Russian, etc.)
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'russian';
  }
  
  // Common French words
  const frenchWords = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc', 'car', 'pour', 'dans', 'sur', 'avec', 'sans', 'comment', 'pourquoi', 'quand', 'où', 'qui', 'que', 'quoi', 'quel', 'quelle', 'quels', 'quelles'];
  
  // Common English words
  const englishWords = ['i', 'you', 'he', 'she', 'we', 'they', 'the', 'a', 'an', 'and', 'or', 'but', 'so', 'because', 'for', 'in', 'on', 'with', 'without', 'how', 'why', 'when', 'where', 'who', 'what', 'which'];
  
  // Normalize text
  const normalizedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  const words = normalizedText.split(/\s+/);
  
  // Count matches for each language
  let frenchCount = 0;
  let englishCount = 0;
  
  words.forEach(word => {
    if (frenchWords.includes(word)) frenchCount++;
    if (englishWords.includes(word)) englishCount++;
  });
  
  // Check for specific French characters
  if (text.match(/[éèêëàâäôöùûüÿçœæ]/i)) {
    frenchCount += 2;
  }
  
  // Determine language based on counts
  if (frenchCount > englishCount) {
    return 'french';
  } else {
    return 'english';  // Default to English
  }
}

// Mock responses for testing in different languages
const mockResponses = {
  english: {
    default: "I am a virtual real estate assistant. I can help you with your questions about real estate in Tunisia.",
    trends: "Current real estate market trends in Tunisia show an increase in prices in urban areas, particularly in Tunis and coastal regions. Modern apartments and properties with beach access are particularly in demand. The seasonal rental market also continues to grow.",
    investment: "For real estate investment in Tunisia, neighborhoods like La Marsa, Gammarth, and Les Berges du Lac in Tunis generally offer a good return on investment. Developing areas like Sousse North and Hammamet South also present interesting opportunities with more affordable prices.",
    prices: "Real estate prices vary considerably by region. In Tunis, the average price per square meter is around 2500-3500 dinars in popular neighborhoods like La Marsa or Les Berges du Lac. In cities like Sousse or Hammamet, prices are generally 20-30% lower.",
    buying: "The real estate buying process in Tunisia includes several steps: property search, negotiation, sales agreement, legal verifications, notarial deed, and registration. Additional costs of about 8-10% of the purchase price should be budgeted for taxes and fees.",
    locations: "The most beautiful locations for homes and apartments in Tunisia are in coastal areas like La Marsa, Sidi Bou Said, and Gammarth north of Tunis, offering Mediterranean views and upscale neighborhoods. The Berges du Lac area is also popular for its modern developments and proximity to business districts."
  },
  french: {
    default: "Je suis un assistant immobilier virtuel. Je peux vous aider avec vos questions sur l'immobilier en Tunisie.",
    trends: "Les tendances actuelles du marché immobilier en Tunisie montrent une augmentation des prix dans les zones urbaines, particulièrement à Tunis et dans les régions côtières. Les appartements modernes et les propriétés avec accès à la plage sont particulièrement demandés. Le marché de la location saisonnière continue également de croître.",
    investment: "Pour l'investissement immobilier en Tunisie, les quartiers comme La Marsa, Gammarth, et Les Berges du Lac à Tunis offrent généralement un bon retour sur investissement. Les zones en développement comme Sousse Nord et Hammamet Sud présentent également des opportunités intéressantes avec des prix plus abordables.",
    prices: "Les prix immobiliers varient considérablement selon les régions. À Tunis, le prix moyen au mètre carré est d'environ 2500-3500 dinars dans les quartiers prisés comme La Marsa ou Les Berges du Lac. Dans des villes comme Sousse ou Hammamet, les prix sont généralement 20-30% moins élevés.",
    buying: "Le processus d'achat immobilier en Tunisie comprend plusieurs étapes : recherche de bien, négociation, compromis de vente, vérifications juridiques, acte notarié et enregistrement. Des frais supplémentaires d'environ 8-10% du prix d'achat doivent être prévus pour les taxes et honoraires.",
    locations: "Les plus beaux endroits pour les maisons et appartements en Tunisie se trouvent dans les zones côtières comme La Marsa, Sidi Bou Said, et Gammarth au nord de Tunis, offrant des vues sur la Méditerranée et des quartiers haut de gamme. La zone des Berges du Lac est également prisée pour ses développements modernes et sa proximité avec les quartiers d'affaires."
  },
  arabic: {
    default: "أنا مساعد عقاري افتراضي. يمكنني مساعدتك في أسئلتك حول العقارات في تونس.",
    trends: "تظهر اتجاهات سوق العقارات الحالية في تونس زيادة في الأسعار في المناطق الحضرية، خاصة في تونس والمناطق الساحلية. الشقق الحديثة والعقارات ذات الوصول إلى الشاطئ مطلوبة بشكل خاص. كما يستمر سوق التأجير الموسمي في النمو.",
    investment: "للاستثمار العقاري في تونس، توفر أحياء مثل المرسى وقمرت وضفاف البحيرة في تونس عائدًا جيدًا على الاستثمار. كما تقدم المناطق النامية مثل سوسة الشمالية وحمامات الجنوبية فرصًا مثيرة للاهتمام بأسعار أكثر معقولية.",
    prices: "تختلف أسعار العقارات بشكل كبير حسب المنطقة. في تونس، يبلغ متوسط سعر المتر المربع حوالي 2500-3500 دينار في الأحياء الشهيرة مثل المرسى أو ضفاف البحيرة. في مدن مثل سوسة أو الحمامات، تكون الأسعار عادة أقل بنسبة 20-30٪.",
    buying: "تشمل عملية شراء العقارات في تونس عدة خطوات: البحث عن العقار، التفاوض، اتفاقية البيع، التحققات القانونية، سند التوثيق، والتسجيل. يجب تخصيص تكاليف إضافية تبلغ حوالي 8-10٪ من سعر الشراء للضرائب والرسوم.",
    locations: "أجمل المواقع للمنازل والشقق في تونس تقع في المناطق الساحلية مثل المرسى وسيدي بوسعيد وقمرت شمال تونس، حيث توفر إطلالات على البحر الأبيض المتوسط وأحياء راقية. كما تعتبر منطقة ضفاف البحيرة شهيرة أيضاً بمشاريعها العصرية وقربها من مناطق الأعمال."
  }
};

const getGeminiResponse = async (query, context = '', userRole = 'buyer') => {
  try {
    console.log('Processing query:', query);
    
    // Always detect query language - needed for mock responses too
    const language = detectLanguage(query);
    console.log(`Detected language: ${language}`);
    
    // Only try the API if we have a key - we know from the test that current keys are expired
    if (API_KEY && !process.env.ALWAYS_USE_MOCK_RESPONSES) {
      try {
        console.log('Attempting to use Gemini API...');
        // Initialize Gemini API
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // Use gemini-1.5-flash model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Create prompt based on user role and language
    let roleSpecificInstructions = '';
    
    switch (userRole) {
      case 'buyer':
            roleSpecificInstructions = language === 'french' ? 
              'Cet utilisateur est un acheteur potentiel. Donnez des conseils sur les quartiers, les prix, les processus d\'achat et les aspects à prendre en compte pour l\'achat immobilier.' :
              'This user is a potential buyer. Provide advice on neighborhoods, prices, buying processes, and aspects to consider for real estate purchases.';
        break;
      case 'seller':
            roleSpecificInstructions = language === 'french' ?
              'Cet utilisateur est un vendeur. Fournissez des conseils sur la valorisation de biens, les stratégies de mise en vente, les étapes de la vente et comment maximiser le prix de vente.' :
              'This user is a seller. Provide advice on property valuation, sales strategies, sales steps, and how to maximize the selling price.';
        break;
      case 'agent':
            roleSpecificInstructions = language === 'french' ?
              'Cet utilisateur est un agent immobilier. Fournissez des informations plus techniques sur le marché, les aspects légaux et les stratégies de négociation.' :
              'This user is a real estate agent. Provide more technical information on the market, legal aspects, and negotiation strategies.';
        break;
      case 'admin':
            roleSpecificInstructions = language === 'french' ?
              'Cet utilisateur est un administrateur de la plateforme. Fournissez des informations détaillées et complètes sur tous les aspects de l\'immobilier, sans restriction.' :
              'This user is a platform administrator. Provide detailed and comprehensive information on all aspects of real estate, without restriction.';
        break;
      default:
            roleSpecificInstructions = language === 'french' ?
              'Donnez des conseils généraux sur l\'immobilier adaptés à un large public.' :
              'Provide general real estate advice suitable for a wide audience.';
    }
    
        const languageInstruction = language === 'french' ? 
          'Réponds en français.' : 
          (language === 'arabic' ? 'Réponds en arabe.' : 'Réponds en anglais.');
    
    const prompt = `
Tu es un assistant immobilier expert pour l'application PropTech Connect.

${roleSpecificInstructions}

${context ? `Contexte de la conversation:\n${context}\n\n` : ''}

Question du client: ${query}

${languageInstruction}

Donne une réponse informative, précise et utile sur le sujet immobilier, en gardant un ton professionnel mais cordial. Sois concis et direct dans tes recommandations.
`;
      
    const result = await model.generateContent(prompt);
        apiKeyVerified = true; // If we get here, key is valid
    const response = result.response;
    const text = response.text();
    
        console.log('Received response from Gemini API');
    
    return text;
      } catch (apiError) {
        console.error('Error with Gemini API, falling back to mock responses:', apiError.message);
        // API key appears to be invalid/expired, don't try to use it again
        apiKeyVerified = false;
        
        // If the error is specifically about an expired or invalid API key, log a clear message
        if (apiError.message && 
            (apiError.message.includes('API key expired') || 
             apiError.message.includes('API key not valid') ||
             apiError.message.includes('API_KEY_INVALID'))) {
          console.warn('ALERT: Your Gemini API key is expired or invalid. Please obtain a new API key from https://aistudio.google.com/');
        }
        
        // Fall back to mock responses
      }
    } else {
      // If we get here, either no API key or we know it's invalid
      console.log('Skipping Gemini API call - using mock responses');
    }
    
    // Use mock responses
    console.log(`Using mock response in ${language}`);
    
    // Select appropriate mock response based on query keywords and language
    const lowerQuery = query.toLowerCase();
    const responsesForLanguage = mockResponses[language] || mockResponses.english;
    
    // Check for location-related keywords first in various languages
    if (lowerQuery.includes('location') || lowerQuery.includes('area') || lowerQuery.includes('best place') || 
        lowerQuery.includes('quartier') || lowerQuery.includes('zones') || lowerQuery.includes('beaux endroits') || 
        lowerQuery.includes('meilleur') || lowerQuery.includes('أجمل') || lowerQuery.includes('أماكن') || 
        lowerQuery.includes('مناطق') || lowerQuery.includes('أحياء')) {
      return responsesForLanguage.locations || responsesForLanguage.default;
    }
    
    // Then check for other keywords
    if (lowerQuery.includes('tendance') || lowerQuery.includes('trend') || lowerQuery.includes('marché') || 
        lowerQuery.includes('market') || lowerQuery.includes('اتجاهات') || lowerQuery.includes('سوق')) {
      return responsesForLanguage.trends;
    } else if (lowerQuery.includes('investissement') || lowerQuery.includes('invest') || 
               lowerQuery.includes('rentable') || lowerQuery.includes('profitable') || 
               lowerQuery.includes('استثمار') || lowerQuery.includes('عائد')) {
      return responsesForLanguage.investment;
    } else if (lowerQuery.includes('prix') || lowerQuery.includes('coût') || lowerQuery.includes('tarif') || 
               lowerQuery.includes('price') || lowerQuery.includes('cost') || 
               lowerQuery.includes('سعر') || lowerQuery.includes('تكلفة') || lowerQuery.includes('ثمن')) {
      return responsesForLanguage.prices;
    } else if (lowerQuery.includes('acheter') || lowerQuery.includes('achat') || lowerQuery.includes('processus') || 
               lowerQuery.includes('buy') || lowerQuery.includes('purchase') || lowerQuery.includes('process') || 
               lowerQuery.includes('شراء') || lowerQuery.includes('عملية')) {
      return responsesForLanguage.buying;
    } else {
      return responsesForLanguage.default;
    }
    
  } catch (error) {
    console.error('Error in getGeminiResponse:', error);
    return "Je suis désolé, mais je rencontre des difficultés à traiter votre demande pour le moment. Pourriez-vous reformuler votre question ou essayer à nouveau plus tard?";
  }
};

module.exports = {
  getGeminiResponse
};