//NASA API
const axios = require("axios");

async function getNasaData() {
    const url = "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY";
    try {
        const response = await axios.get(url);
        console.log("Données NASA:", response.data);
    } catch (error) {
        console.error("Erreur:", error);
    }
}

getNasaData();