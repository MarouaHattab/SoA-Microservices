// chat-service/property-suggestions.js
const { propertyClient } = require('./property-service-client');

// Fonction pour extraire les mots clés d'une requête
function extractKeywords(query) {
  // Mots à ignorer
  const stopWords = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'du', 'de', 'dans', 'sur', 'pour', 'avec', 'sans', 'en', 'à', 'au', 'aux', 'par', 'et', 'ou', 'mais', 'car', 'donc', 'quand', 'que', 'qui', 'quoi', 'dont', 'où'];
  
  // Mots clés immobiliers à rechercher
  const realEstateKeywords = {
    propertyTypes: ['appartement', 'maison', 'villa', 'studio', 'duplex', 'loft', 'penthouse', 'immeuble'],
    features: ['chambre', 'chambres', 'pièce', 'pièces', 'salle de bain', 'salles de bain', 'cuisine', 'terrasse', 'balcon', 'jardin', 'garage', 'parking', 'ascenseur', 'piscine'],
    locations: ['centre-ville', 'banlieue', 'quartier', 'zone'],
    price: ['budget', 'prix', 'coût', 'euros', '€']
  };
  
  // Convertir en minuscules et enlever la ponctuation
  const formattedQuery = query.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  const words = formattedQuery.split(/\s+/);
  
  // Filtrer les mots vides
  const filteredWords = words.filter(word => !stopWords.includes(word) && word.length > 1);
  
  // Rechercher les mots clés immobiliers
  const extractedKeywords = {
    propertyType: null,
    bedrooms: null,
    bathrooms: null,
    location: null,
    minPrice: null,
    maxPrice: null
  };
  
  // Trouver le type de propriété
  for (const word of filteredWords) {
    if (realEstateKeywords.propertyTypes.includes(word)) {
      extractedKeywords.propertyType = word;
      break;
    }
  }
  
  // Trouver le nombre de chambres
  const bedroomRegex = /(\d+)\s*(chambre|chambres)/i;
  const bedroomMatch = query.match(bedroomRegex);
  if (bedroomMatch) {
    extractedKeywords.bedrooms = parseInt(bedroomMatch[1], 10);
  }
  
  // Trouver le nombre de salles de bain
  const bathroomRegex = /(\d+)\s*(salle de bain|salles de bain)/i;
  const bathroomMatch = query.match(bathroomRegex);
  if (bathroomMatch) {
    extractedKeywords.bathrooms = parseInt(bathroomMatch[1], 10);
  }
  
  // Trouver la localisation
  const locationRegex = /(à|dans|sur)\s+([a-zÀ-ÿ\s-]+?)\s+(quartier|ville|zone|région)/i;
  const locationMatch = query.match(locationRegex);
  if (locationMatch) {
    extractedKeywords.location = locationMatch[2].trim();
  }
  
  // Trouver les informations de prix
  const priceRegex = /(\d+[\d\s]*)(€|euros)/gi;
  const priceMatches = [...query.matchAll(priceRegex)];
  
  if (priceMatches.length === 1) {
    // Si un seul prix est mentionné, on le considère comme prix maximum
    const price = parseInt(priceMatches[0][1].replace(/\s/g, ''), 10);
    extractedKeywords.maxPrice = price;
  } else if (priceMatches.length >= 2) {
    // Si deux prix sont mentionnés, on considère le plus petit comme min et le plus grand comme max
    const prices = priceMatches.map(match => parseInt(match[1].replace(/\s/g, ''), 10));
    extractedKeywords.minPrice = Math.min(...prices);
    extractedKeywords.maxPrice = Math.max(...prices);
  }
  
  return extractedKeywords;
}

// Fonction pour trouver des propriétés pertinentes
async function findRelevantProperties(query) {
  try {
    // Extraire les mots clés de la requête
    const keywords = extractKeywords(query);
    
    // Construire la requête de recherche pour le service de propriétés
    const searchRequest = {
      location: keywords.location,
      min_price: keywords.minPrice,
      max_price: keywords.maxPrice,
      bedrooms: keywords.bedrooms,
      property_type: keywords.propertyType,
      limit: 3 // Limiter à 3 suggestions
    };
    
    // Appeler le service de propriétés
    return new Promise((resolve, reject) => {
      propertyClient.SearchProperties(searchRequest, (err, response) => {
        if (err) {
          console.error('Error searching properties:', err);
          resolve([]); // Retourner un tableau vide en cas d'erreur
        } else {
          // Convertir les propriétés au format attendu
          const properties = response.properties.map(prop => ({
            id: prop.id,
            title: prop.title,
            price: prop.price,
            location: prop.location,
            property_type: prop.property_type,
            image_url: prop.image_url || ''
          }));
          
          resolve(properties);
        }
      });
    });
  } catch (error) {
    console.error('Error in findRelevantProperties:', error);
    return []; // Retourner un tableau vide en cas d'erreur
  }
}

module.exports = {
  findRelevantProperties
};