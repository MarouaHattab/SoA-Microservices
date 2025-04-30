# 🎬 TP7 : Microservices avec REST, GraphQL, gRPC et Kafka 📡

## 📋 Présentation du projet

Ce projet implémente une architecture de microservices pour gérer un système de streaming contenant des films et des séries TV. L'architecture utilise des technologies modernes comme gRPC pour la communication entre microservices, Kafka pour la communication asynchrone, et expose les données via REST et GraphQL.

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐
│             │      │              │
│   Clients   │◄────►│  API Gateway │
│             │      │              │
└─────────────┘      └──────┬───────┘
                           ▲ │
                           │ ▼
                     ┌─────┴───────┐
                     │             │
                     │    Kafka    │
                     │             │
                     └─────┬───────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│             │    │              │    │              │
│ Movie svc   │    │  TV Show svc │    │  Other svcs  │
│ (MongoDB)   │    │  (MongoDB)   │    │  (MongoDB)   │
└─────────────┘    └──────────────┘    └──────────────┘
```

## 🚀 Fonctionnalités

- ✅ API REST pour les films et les séries TV
- ✅ API GraphQL pour des requêtes flexibles
- ✅ Communication inter-services avec gRPC
- ✅ Messaging asynchrone avec Kafka
- ✅ Persistance des données avec MongoDB
- ✅ Opérations CRUD complètes sur les films et séries TV
- ✅ Tests automatisés

## 📷 Captures d'écran des opérations CRUD

### Création d'un film (POST)
![Création film](/img/Create.png)

### Récupération des films (GET)
![Liste films](/img/readall.png)

### Récupération de films par id (GET)
![Liste films](/img/Read.png)

### Mise à jour d'un film (PUT)
![Mise à jour film](/img/Update.png)

### Suppression d'un film (DELETE)
![Suppression film](/img/Delete.png)

## 🛠️ Technologies utilisées

- **Backend** : Node.js, Express
- **API** : REST, GraphQL (Apollo Server)
- **Communication** : gRPC
- **Messaging** : Apache Kafka
- **Base de données** : MongoDB
- **Tests** : Axios, Jest

## 🔧 Installation et configuration

### Prérequis

- Node.js (v14+)
- MongoDB
- Apache Kafka & Zookeeper

### Installation des dépendances

```bash
npm install express @apollo/server @grpc/grpc-js @grpc/proto-loader body-parser cors kafkajs mongoose axios uuid
```

### Configuration de Kafka (Windows)

```bash
# Démarrer Zookeeper
.\bin\windows\zookeeper-server-start.bat .\config\zookeeper.properties

# Démarrer Kafka dans un autre terminal
.\bin\windows\kafka-server-start.bat .\config\server.properties

# Créer les topics nécessaires
.\bin\windows\kafka-topics.bat --create --bootstrap-server localhost:9092 --replication-factor 1 --partitions 1 --topic movies_topic
.\bin\windows\kafka-topics.bat --create --bootstrap-server localhost:9092 --replication-factor 1 --partitions 1 --topic tvshows_topic
```

## 🚦 Démarrage des services

### 1. Démarrer MongoDB
```bash
mongod --dbpath /data/db
```

### 2. Démarrer les microservices
```bash
# Microservice Films
node movieMicroservice.js

# Microservice Séries TV
node tvShowMicroservice.js

# API Gateway
node apiGateway.js
```

## 📊 Test de l'application

### API REST

- 🔍 **GET** `/movies` : Liste tous les films
- 🔍 **GET** `/movies/:id` : Récupère un film par ID
- ➕ **POST** `/movies` : Crée un nouveau film
- 🔄 **PUT** `/movies/:id` : Met à jour un film existant
- ❌ **DELETE** `/movies/:id` : Supprime un film

> *Mêmes opérations disponibles pour les séries TV avec le préfixe `/tvshows`*

### API GraphQL

Accédez à l'interface GraphQL via http://localhost:3000/graphql

**Exemples de requêtes** :
```graphql
# Récupérer tous les films
query {
  movies {
    id
    title
    description
  }
}

# Créer un film
mutation {
  createMovie(id: "123", title: "Inception", description: "Un film sur les rêves") {
    id
    title
    description
  }
}
```


## 📝 Structure du projet

```
tp-microservices/
├── movie.proto                        # Définition du service gRPC pour les films
├── tvShow.proto                       # Définition du service gRPC pour les séries TV
├── movieMicroserviceWithKafkaMongoDB.js # Microservice des films
├── tvShowMicroserviceWithKafkaMongoDB.js # Microservice des séries TV
├── schema.js                          # Schéma GraphQL
├── resolvers.js                       # Résolveurs GraphQL
├── apiGatewayComplete.js              # API Gateway
├── test-movie-service.js              # Tests automatisés
└── README.md                          # Documentation du projet
```



