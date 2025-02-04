//-----------------------------------------------------
// const request = require("request");
// const fetch = require("node-fetch");
// const API_KEY = "38f9264b8e345e5059d64b5e08c19663";
// const BASE_URL = "http://api.openweathermap.org/data/2.5/weather?appid=" + API_KEY + "&units=metric&lang=fr&q=";


// //Fonction pour récupérer les données météo d'une ville donnée en utlisant "request"

// function getWeatherData(city, callback) {
//   const url = BASE_URL + city;
//   request(url, function (error, response, body) {
//     if (error) {
//       callback(error, null);
//     } else {
//       const weatherData = JSON.parse(body);
//       callback(null, weatherData);
//     }
//   });
// }

// getWeatherData("Sousse", function (error, data) {
//   if (error) {
//     console.error("Erreur :", error);
//   } else {
//     console.log(`Description : ${data.weather[0].description}`);
//     console.log(`Température : ${data.main.temp}°C`);
//     console.log(`Humidité : ${data.main.humidity}%`);
//   }
// });
//--------------------------------------------------------------------
// const fetch_request = require("node-fetch");
// const API_KEY = "38f9264b8e345e5059d64b5e08c19663";
// const BASE_URL = "http://api.openweathermap.org/data/2.5/weather?appid=" + API_KEY + "&units=metric&lang=fr&q=";
//Fonction pour récupérer les données météo d'une ville donnée en utlisant "fetch"
// async function getWeatherData(city) {
//   const url = BASE_URL + city;
//   const response = await fetch(url);
//   const data = await response.json();
//   return data;
// }


// getWeatherData("Sousse")
//   .then((data) => {
//     console.log("Description :", data.weather[0].description);
//     console.log("Température :", data.main.temp);
//     console.log("Humidité :", data.main.humidity);
//   })
//   .catch((error) => {
//     console.error("Erreur :", error);
//   });
//------------------------------------------
 const axios = require("axios");


const API_KEY = "38f9264b8e345e5059d64b5e08c19663";
const BASE_URL = "http://api.openweathermap.org/data/2.5/weather?appid=" + API_KEY + "&units=metric&lang=fr&q=";

//Fonction pour récupérer les données météo d'une ville donnée en utlisant "axios"
async function getWeatherData(city) {
  const url = BASE_URL + city;
  const response = await axios.get(url);
  return response.data;
}
getWeatherData("Sousse")
  .then((data) => {
    console.log("Description :", data.weather[0].description);
    console.log("Température :", data.main.temp);
    console.log("Humidité :", data.main.humidity);
  })
  .catch((error) => {
    console.error("Erreur :", error);
  });
