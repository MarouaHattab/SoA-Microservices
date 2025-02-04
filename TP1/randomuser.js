//RandomUser API
const axios = require("axios");

async function getRandomUser() {
    const url = "https://randomuser.me/api/";
    try {
        const response = await axios.get(url);
        const user = response.data.results[0]; 
        const gender = user.gender;
        const name = `${user.name.title} ${user.name.first} ${user.name.last}`;
        const location = `${user.location.city}, ${user.location.state}, ${user.location.postcode}`;
        const email = user.email;
        const username = user.login.username;
        const password = user.login.password;
        console.log("Genre:", gender);
        console.log("Nom complet:", name);
        console.log("Localisation:", location);
        console.log("Email:", email);
        console.log("Nom d'utilisateur:", username);
        console.log("Mot de passe:", password);
    } catch (error) {
        console.error("Erreur:", error);
    }
}

getRandomUser();