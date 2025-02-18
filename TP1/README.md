# 🌐 TP1 : Introduction aux APIs RESTful

Ce TP a pour objectif de comprendre les principes des APIs RESTful et de manipuler des données JSON en utilisant Node.js. Vous allez interagir avec plusieurs APIs, notamment OpenWeatherMap, Open Library, NASA et RandomUser, en utilisant différentes bibliothèques comme `request`, `fetch`, et `axios`.

---

## 🔧Prérequis

Avant de commencer, assurez-vous d'avoir installé les éléments suivants :

1. **⚙️Node.js** : Téléchargez et installez Node.js depuis [https://nodejs.org/](https://nodejs.org/).
2. **📦npm** : Il est installé automatiquement avec Node.js.
3. **🔑Clé API OpenWeatherMap** : Inscrivez-vous sur [https://openweathermap.org/api](https://openweathermap.org/api) pour obtenir une clé API gratuite.

---

## 🚀Installation

### Étape 1 : Créer un dossier pour le projet

1. Ouvrez un terminal et créez un dossier pour votre projet :
   ```bash
   mkdir tp-apis
   cd tp-apis
   ```
2. Initialisez un projet Node.js :
   ```bash
   npm init -y
   ```
   Cela crée un fichier `package.json` dans votre dossier.

### Étape 2 : Installer les dépendances

Installez les bibliothèques nécessaires pour interagir avec les APIs :

- `request` (pour faire des requêtes HTTP) :

  ```bash
  npm install request
  ```
- `node-fetch` (pour utiliser fetch dans Node.js) :

  ```bash
  npm install node-fetch
  ```
- `axios` (une alternative moderne à request) :

  ```bash
  npm install axios
  ```

### 📂 Structure du projet
Le projet sera organisé comme suit :
```
📂 TP1/
  │-- weather.js      - Interactions avec l'API météo
  │-- books.js        - Recherche de livres
  │-- nasa.js         - Images astronomiques   
  │-- randomuser.js   - Génération d'utilisateurs
  │-- package.json
  │-- README.md
```

## Utilisation 💻

### Étape 3 : Configurer la clé API OpenWeatherMap

Ouvrez le fichier `weather.js`  et remplacez "VOTRE_CLE_API" par votre clé API OpenWeatherMap.

### Étape 4 : Exécuter le code

Créez un fichier `weather.js` dans votre dossier et collez le code fourni.

Exécutez le fichier avec la commande suivante :

```bash
node weather.js
```

## Explication du code 🧩

### 1. Utilisation de `request` pour OpenWeatherMap 🌦️ 

```javascript
const request = require("request");
const API_KEY = "VOTRE_CLE_API";
const BASE_URL = "http://api.openweathermap.org/data/2.5/weather?appid=" + API_KEY + "&units=metric&lang=fr&q=";

function getWeatherData(city, callback) {
  const url = BASE_URL + city;
  request(url, function (error, response, body) {
    if (error) {
      callback(error, null);
    } else {
      const weatherData = JSON.parse(body);
      callback(null, weatherData);
    }
  });
}

getWeatherData("Sousse", function (error, data) {
  if (error) {
    console.error("Erreur :", error);
  } else {
    console.log(`Description : ${data.weather[0].description}`);
    console.log(`Température : ${data.main.temp}°C`);
    console.log(`Humidité : ${data.main.humidity}%`);
  }
});
```



### 2. Utilisation de `fetch` pour OpenWeatherMap 🌦️

```javascript
const fetch = require("node-fetch");

async function getWeatherData(city) {
  const url = `http://api.openweathermap.org/data/2.5/weather?appid=VOTRE_CLE_API&units=metric&lang=fr&q=${city}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
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
```

### 3. Utilisation de `axios` pour OpenWeatherMap 🌦️

```javascript
const axios = require("axios");

async function getWeatherData(city) {
  const url = `http://api.openweathermap.org/data/2.5/weather?appid=VOTRE_CLE_API&units=metric&lang=fr&q=${city}`;
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
```
## Sortie attendue 🏆 :

```bash
Description : peu nuageux
Température : 13.88
Humidité : 77
```

### 4. Utilisation de `axios` pour Open Library API 📚
Créez un fichier `books.js` dans votre dossier et collez le code fourni.

```javascript
const axios = require("axios");

async function getBookData() {
    const url = "https://openlibrary.org/api/books?bibkeys=ISBN:0451526538&format=json&jscmd=data";
    try {
        const response = await axios.get(url);
        const bookData = response.data["ISBN:0451526538"];
        console.log("Titre:", bookData.title);
    } catch (error) {
        console.error("Erreur:", error);
    }
}

getBookData();
```

## Sortie attendue 🏆 :

```bash
Titre: The adventures of Tom Sawyer
Sous-titre: Pas de sous-titre
Nombre de pages: 216
```

### 5. Utilisation de `axios` pour NASA API 🚀
Créez un fichier `nasa.js` dans votre dossier et collez le code fourni.

```javascript
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
```

## Sortie attendue 🏆 :

```bash
Données NASA: {
  copyright: '\nJulene Eiguren\n',
  date: '2025-02-04',
  explanation: "Yes, but can your rainbow do this? Late in the day, the Sun set as usual toward the west. However, on this day, the more interesting display was 180 degrees around -- toward the east. There, not only was a rainbow visible, but an impressive display of anticrepuscular rays from the rainbow's center. In the featured image from Lekeitio in northern Spain, the Sun is behind the camera. The rainbow resulted from sunlight reflecting back from falling rain. Anticrepuscular rays result from sunlight, blocked by some clouds, going all the way around the sky, overhead, and appearing to converge on the opposite horizon -- an optical illusion.  Rainbows by themselves can be exciting to see, and anticrepuscular rays a rare treat, but capturing them both together is even more unusual -- and can look both serene and surreal.   Jigsaw Challenge: Astronomy Puzzle of the Day",
  hdurl: 'https://apod.nasa.gov/apod/image/2502/RainbowFan_Eiguren_3228.jpg',
  media_type: 'image',
  service_version: 'v1',
  title: 'Anticrepuscular Rays: A Rainbow Fan over Spain',
  url: 'https://apod.nasa.gov/apod/image/2502/RainbowFan_Eiguren_1080.jpg'
}
```


### 6. Utilisation de `axios` pour RandomUser API 👥
Créez un fichier `randomuser.js` dans votre dossier et collez le code fourni.
```javascript
const axios = require("axios");

async function getRandomUser() {
    const url = "https://randomuser.me/api/";
    try {
        const response = await axios.get(url);
        console.log("Nom complet:", response.data.results[0].name.first, response.data.results[0].name.last);
    } catch (error) {
        console.error("Erreur:", error);
    }
}

getRandomUser();
```

## Sortie attendue 🏆 :

```bash
Genre: female
Nom complet: Ms Iina Maunu
Localisation: Kuusamo, Kainuu, 87021
Email: iina.maunu@example.com
Nom d'utilisateur: tinylion517
Mot de passe: donner
```

### 📝 Gestion des erreurs communes


## OpenWeatherMap🌦️
    -Ville non trouvée : Status 404
    -Clé API invalide : Status 401
    -Limite d'appels dépassée : Status 429

## Open Library📖
    -ISBN invalide : Réponse vide
    -Service indisponible : Status 503

## NASA 🌍
    -Clé API invalide : Status 403
    -Limite quotidienne dépassée : Status 429

## RandomUser 👥
    -Paramètres invalides : Status 400
    -Service surchargé : Status 503

 ## 🔍Tests et validation
Pour tester chaque API :
## Test API météo ☁️
```bash
node weather.js
```
## Test API livres 📚
```bash
node books.js
```

## Test API NASA 🚀
```bash
node nasa.js
```
## Test API utilisateurs aléatoires 🤖
```bash
node randomuser.js
```
### 📚 Ressources

- [Documentation OpenWeatherMap](https://openweathermap.org/api)
- [Documentation Open Library](https://openlibrary.org/developers/api)
- [Documentation NASA API](https://api.nasa.gov/)
- [Documentation RandomUser](https://randomuser.me/)
