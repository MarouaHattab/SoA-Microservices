// property-suggestions.js
const findRelevantProperties = async (query) => {
    try {
      // Cette fonction devrait idéalement se connecter à votre base de données
      // de propriétés et effectuer une recherche basée sur la requête
      // Pour l'instant, nous retournons des exemples statiques
      
      // Analyse de la requête pour trouver des critères pertinents
      const lowerQuery = query.toLowerCase();
      const isBudgetQuery = lowerQuery.includes('budget') || lowerQuery.includes('euro') || lowerQuery.includes('€');
      const isLocationQuery = lowerQuery.includes('centre') || lowerQuery.includes('ville') || lowerQuery.includes('quartier');
      const isHouseQuery = lowerQuery.includes('maison');
      const isApartmentQuery = lowerQuery.includes('appartement');
      const isInvestmentQuery = lowerQuery.includes('investissement') || lowerQuery.includes('rentable');
      
      // Suggestions de propriétés selon la requête
      let suggestions = [];
      
      if (isApartmentQuery) {
        suggestions.push({
          id: "apt1",
          title: "Appartement moderne en centre-ville",
          price: 250000,
          location: "Centre-ville",
          property_type: "Appartement",
          image_url: "https://example.com/image1.jpg"
        });
        
        suggestions.push({
          id: "apt2",
          title: "Studio rénové proche universités",
          price: 120000,
          location: "Quartier Universitaire",
          property_type: "Studio",
          image_url: "https://example.com/image2.jpg"
        });
      }
      
      if (isHouseQuery) {
        suggestions.push({
          id: "house1",
          title: "Maison familiale avec jardin",
          price: 350000,
          location: "Banlieue résidentielle",
          property_type: "Maison",
          image_url: "https://example.com/image3.jpg"
        });
      }
      
      if (isInvestmentQuery) {
        suggestions.push({
          id: "inv1",
          title: "Immeuble de rapport - 4 appartements",
          price: 480000,
          location: "Quartier en développement",
          property_type: "Immeuble",
          image_url: "https://example.com/image4.jpg"
        });
      }
      
      // Si aucune correspondance ou si la requête est générique, retourner des suggestions variées
      if (suggestions.length === 0) {
        suggestions = [
          {
            id: "prop1",
            title: "Appartement lumineux centre-ville",
            price: 240000,
            location: "Centre-ville",
            property_type: "Appartement",
            image_url: "https://example.com/image5.jpg"
          },
          {
            id: "prop2",
            title: "Maison avec jardin et garage",
            price: 320000,
            location: "Quartier résidentiel",
            property_type: "Maison",
            image_url: "https://example.com/image6.jpg"
          }
        ];
      }
      
      // Limiter à 3 suggestions maximum
      return suggestions.slice(0, 3);
    } catch (error) {
      console.error('Error finding relevant properties:', error);
      return [];
    }
  };
  
  module.exports = {
    findRelevantProperties
  };