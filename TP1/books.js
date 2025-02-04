//Open Library API
  const axios = require("axios");

async function getBookData() {
    const url = "https://openlibrary.org/api/books?bibkeys=ISBN:0451526538&format=json&jscmd=data";

    try {
        const response = await axios.get(url);
        const bookData = response.data["ISBN:0451526538"]; 

        const title = bookData.title;
        const subtitle = bookData.subtitle || "Pas de sous-titre"; 
        const numberOfPages = bookData.number_of_pages || "Inconnu"; 

        console.log("Titre:", title);
        console.log("Sous-titre:", subtitle);
        console.log("Nombre de pages:", numberOfPages);
    } catch (error) {
        console.error("Erreur:", error);
    }
}

getBookData();
