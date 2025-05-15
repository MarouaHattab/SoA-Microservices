# 🏢 PropTech Connect

PropTech Connect est une plateforme immobilière basée sur des microservices qui relie les acheteurs, vendeurs, agents immobiliers et services de gestion immobilière grâce à une architecture moderne et évolutive.

## 🌟 Fonctionnalités

- 🏠 Référencement, recherche et gestion de biens immobiliers
- 👥 Authentification et autorisation des utilisateurs
- 📅 Planification et gestion des rendez-vous
- 💬 Chat en temps réel entre utilisateurs et agents
- 🔔 Système de notification pour toutes les activités de la plateforme
- 🤖 Recommandations de propriétés et prédictions de prix alimentées par l'IA
- ⭐ Système d'évaluation et de commentaires pour les propriétés et les agents

## 🏗️ Architecture et Choix Techniques

[Architecture](diagramme.png)

Notre architecture est basée sur les microservices, ce qui nous permet de développer, déployer et faire évoluer chaque composant de manière indépendante. Cela offre plusieurs avantages:

- **Scalabilité indépendante**: Chaque service peut être mis à l'échelle en fonction de ses besoins spécifiques
- **Résilience**: La défaillance d'un service n'impacte pas l'ensemble du système
- **Polyglotte**: Utilisation de technologies adaptées à chaque domaine fonctionnel
- **Évolutivité**: Facilité d'ajout de nouvelles fonctionnalités ou services

### Choix principaux et justifications:

1. **API Gateway centralisé**: Nous avons opté pour un point d'entrée unique qui expose à la fois REST et GraphQL pour offrir flexibilité aux clients tout en maintenant la sécurité centralisée.

2. **gRPC pour la communication inter-services**: Choisi pour sa performance, son streaming bidirectionnel et son typage fort via Protocol Buffers, optimisant la communication entre nos microservices.

3. **Kafka pour la communication asynchrone**: Implémenté pour gérer les flux d'événements comme les notifications, assurant fiabilité et scalabilité.

4. **MongoDB pour le stockage**: Flexible et adapté à nos données semi-structurées avec évolution fréquente des schémas.

5. **Séparation UI/API**: Notre architecture sépare clairement la couche de présentation des services backend pour permettre des évolutions indépendantes.

### Quand utiliser chaque technologie dans PropTech Connect:

#### REST API
- **Utilisation**: Interface principale pour les clients externes (applications mobiles, navigateurs web, etc.)
- **Cas d'emploi**: Opérations CRUD simples, intégrations tierces
- **Avantages**: Simplicité, compatibilité universelle, cache efficace
- **Exemples dans le projet**: Endpoints utilisateur, gestion des fichiers et images
- **Routes dans l'API Gateway**: `/api/auth`, `/api/properties`, `/api/appointments`, `/api/users`, `/api/chat`, `/api/notifications`, `/api/predictor`

#### GraphQL
- **Utilisation**: API flexible pour les interfaces utilisateur avancées
- **Cas d'emploi**: Requêtes complexes avec plusieurs ressources connexes, nécessitant des données variées
- **Avantages**: Récupération de données précise, réduction du sur-fetching, introspection
- **Exemples dans le projet**: Recherche de propriétés avec filtres, récupération de profils utilisateurs avec leurs propriétés et rendez-vous
- **Point d'accès dans l'API Gateway**: `/graphql`

#### gRPC
- **Utilisation**: Communication entre microservices
- **Cas d'emploi**: Échanges de données entre services internes nécessitant haute performance
- **Avantages**: Très performant, streaming bidirectionnel, contrats stricts via Protocol Buffers
- **Exemples dans le projet**: Service d'authentification, service de propriétés, service de rendez-vous
- **Services définis**: UserService, PropertyService, AppointmentService, ChatService, NotificationService

#### Kafka
- **Utilisation**: Communication asynchrone événementielle
- **Cas d'emploi**: Notifications, logs, traitement d'événements à volume élevé
- **Avantages**: Découplage entre producteurs et consommateurs, tolérance aux pannes
- **Exemples dans le projet**: Notifications de nouveaux messages, alertes de nouveaux rendez-vous, événements de mise à jour de propriétés

## 🧩 Microservices et Schémas de Données

### 🚪 API Gateway
- **Technologie**: Express.js + Apollo Server
- **Responsabilités**:
  - Point d'entrée unique pour toutes les requêtes clients
  - Routage des requêtes vers les microservices appropriés
  - Transformation des requêtes/réponses entre les clients et les services
  - Implémentation de GraphQL pour les requêtes complexes
  - Gestion de l'authentification et autorisation
- **Interactions**:
  - Communique avec tous les autres microservices via gRPC
  - Expose les API REST et GraphQL aux clients
  - Traduit les requêtes GraphQL en appels gRPC appropriés

### 👤 Service Utilisateur
- **Technologie**: Node.js + gRPC + MongoDB
- **Responsabilités**:
  - Gestion des comptes utilisateurs (inscription, connexion, profil)
  - Authentification et autorisation
  - Gestion des rôles (acheteur, vendeur, agent, admin)
- **Schéma de données principal**:
  ```
  User {
    id: string
    name: string
    email: string
    password: string (hachée)
    role: string (buyer, seller, agent, admin)
    phone: string
    created_at: timestamp
    updated_at: timestamp
  }
  ```
- **API gRPC**:
  - `GetUser`: Récupérer un utilisateur par ID
  - `GetUsers`: Récupérer tous les utilisateurs
  - `CreateUser`: Créer un nouvel utilisateur
  - `UpdateUser`: Mettre à jour un profil utilisateur
  - `DeleteUser`: Supprimer un utilisateur
  - `Authenticate`: Valider les identifiants et générer un token JWT
- **Interactions**:
  - Invoqué par l'API Gateway pour l'authentification et gestion utilisateurs
  - Consulté par d'autres services pour vérifier l'existence et les droits des utilisateurs

### 🏠 Service Propriété
- **Technologie**: Node.js + gRPC + MongoDB
- **Responsabilités**:
  - Gestion des annonces immobilières
  - Recherche de propriétés avec filtrage avancé
  - Gestion des photos et documents
  - Vérification de propriété (ownership)
- **Schéma de données principal**:
  ```
  Property {
    id: string
    title: string
    description: string
    price: number
    type: string (apartment, house, etc.)
    status: string (for_sale, for_rent, etc.)
    address: {
      street: string
      city: string
      zipCode: string
      coordinates: {
        latitude: number
        longitude: number
      }
    }
    features: {
      bedrooms: number
      bathrooms: number
      area: number
      yearBuilt: number
    }
    amenities: string[]
    images: string[]
    ownerId: string
    reviews: [
      {
        rating: number
        comment: string
        authorId: string
        createdAt: timestamp
      }
    ]
    createdAt: timestamp
    updatedAt: timestamp
  }
  ```
- **API gRPC**:
  - `GetProperty`: Récupérer une propriété par ID
  - `ListProperties`: Récupérer les propriétés avec filtres
  - `CreateProperty`: Créer une nouvelle annonce immobilière
  - `UpdateProperty`: Mettre à jour une propriété
  - `DeleteProperty`: Supprimer une propriété
  - `AddReview`: Ajouter une évaluation à une propriété
- **Interactions**:
  - Invoqué par l'API Gateway pour les opérations CRUD sur les propriétés
  - Consulte le service Utilisateur pour vérifier les propriétaires
  - Notifie le service Notification lors des mises à jour de propriétés

### 📅 Service Rendez-vous
- **Technologie**: Node.js + gRPC + MongoDB
- **Responsabilités**:
  - Gestion des visites et rendez-vous immobiliers
  - Vérification des disponibilités
  - Validation et confirmation des rendez-vous
- **Schéma de données principal**:
  ```
  Appointment {
    id: string
    propertyId: string
    buyerId: string
    sellerId: string
    agentId: string (optionnel)
    datetime: timestamp
    duration: number (minutes)
    status: string (pending, confirmed, canceled, completed)
    notes: string
    createdAt: timestamp
    updatedAt: timestamp
  }
  ```
- **API gRPC**:
  - `CreateAppointment`: Créer un nouveau rendez-vous
  - `GetAppointment`: Récupérer un rendez-vous par ID
  - `ListAppointments`: Lister les rendez-vous d'un utilisateur ou d'une propriété
  - `UpdateAppointment`: Mettre à jour un rendez-vous
  - `CancelAppointment`: Annuler un rendez-vous
- **Interactions**:
  - Invoqué par l'API Gateway pour la gestion des rendez-vous
  - Consulte le service Propriété pour vérifier la disponibilité des propriétés
  - Consulte le service Utilisateur pour vérifier les identités
  - Notifie le service Notification lors des changements de statut des rendez-vous

### 💬 Service Chat
- **Technologie**: Node.js + gRPC + MongoDB
- **Responsabilités**:
  - Messagerie instantanée entre utilisateurs
  - Stockage de l'historique des conversations
- **Schéma de données principal**:
  ```
  Conversation {
    id: string
    participants: string[] (IDs utilisateur)
    messages: [
      {
        id: string
        sender: string (ID utilisateur)
        content: string
        timestamp: timestamp
        read: boolean
      }
    ]
    createdAt: timestamp
    updatedAt: timestamp
  }
  ```
- **API gRPC**:
  - `SendMessage`: Envoyer un message
  - `GetMessages`: Récupérer l'historique des messages d'une conversation
  - `CreateConversation`: Créer une nouvelle conversation
  - `ListConversations`: Lister les conversations d'un utilisateur
- **Interactions**:
  - Invoqué par l'API Gateway pour la gestion des conversations
  - Consulte le service Utilisateur pour vérifier les identités des participants
  - Notifie le service Notification lors de la réception de nouveaux messages

### 🔔 Service Notification
- **Technologie**: Node.js + gRPC + Kafka
- **Responsabilités**:
  - Envoi de notifications push, email et in-app
  - Gestion des préférences de notification
- **Schéma de données principal**:
  ```
  Notification {
    id: string
    userId: string
    type: string (message, appointment, property_update, etc.)
    content: {
      title: string
      body: string
      data: object
    }
    read: boolean
    createdAt: timestamp
  }
  
  NotificationPreference {
    userId: string
    channels: {
      email: boolean
      push: boolean
      inApp: boolean
    }
    types: {
      messages: boolean
      appointments: boolean
      properties: boolean
    }
  }
  ```
- **Interactions**:
  - Consomme des événements Kafka provenant d'autres services
  - Envoie des notifications aux utilisateurs via différents canaux
  - Consulte le service Utilisateur pour obtenir les informations de contact

### 🤖 Service Prédicteur Immobilier
- **Technologie**: Python Flask + React + XGBoost
- **Responsabilités**:
  - Prédiction des prix immobiliers basée sur les caractéristiques
  - Analyse des tendances du marché
  - Visualisation de l'impact des caractéristiques sur les prix
- **Modèle ML**:
  - Algorithme: XGBoost
  - Caractéristiques: type de propriété, surface, localisation, chambres, etc.
  - Précision: ~92% sur l'ensemble de test

#### 🌟 Fonctionnalités
- 🧠 Modèle ML avancé pour des prédictions précises des prix immobiliers
- 🏙️ Analyse basée sur la localisation avec données par ville et quartier
- 🛁 Analyse détaillée des caractéristiques des propriétés (chambres, salles de bain, commodités)
- 📊 Analyse visuelle de l'impact des différentes caractéristiques
- 🔍 Fonctionnalité de comparaison de propriétés
- 📝 Suivi de l'historique des recherches
- 🌓 Support du mode clair/sombre

#### 🏗️ Architecture
Le service est composé de deux composants principaux:

##### 🐍 Backend (Flask)
- **Modèle**: Modèle d'apprentissage automatique basé sur XGBoost, entraîné sur des données immobilières tunisiennes
- **Ingénierie de caractéristiques**: Transformation et préparation automatisées des caractéristiques
- **Points d'API**: Endpoints RESTful pour les prédictions et récupération de données
- **Support CORS**: Partage de ressources entre origines multiples activé pour l'intégration frontend

##### ⚛️ Frontend (React)
- **Material-UI**: Bibliothèque de composants modernes pour un design cohérent
- **Design responsive**: Fonctionne sur ordinateurs et appareils mobiles
- **Mode sombre**: Support complet des thèmes clairs et sombres
- **Interface interactive**: Retour en temps réel et présentation visuelle des données
- **Stockage local**: Sauvegarde des préférences et de l'historique de l'utilisateur

#### 🔄 Points d'API
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/cities` | GET | Obtenir la liste des villes disponibles |
| `/api/neighborhoods?city={ville}` | GET | Obtenir les quartiers d'une ville spécifique |
| `/api/feature_importance` | GET | Obtenir les données d'importance des caractéristiques |
| `/api/predict` | POST | Faire une prédiction de prix immobilier |

## 🧪 Tests et Validation

Notre approche de test est complète, couvrant différentes couches et technologies de notre architecture:

### 🔍 Tests des Services gRPC

Les services gRPC sont testés à l'aide de clients Node.js qui se connectent directement aux services. Nous avons créé plusieurs scripts de test pour chaque service:

```bash
cd api-gateway
node test-login-simple.js        # Test du service utilisateur
node simple-property-test.js     # Test du service propriété
node simple-appointment-test.js  # Test du service rendez-vous
```

**Example de sortie réussie pour un test d'authentification**:
```
Connexion au service utilisateur...
Service connecté!
Envoi des identifiants...
Authentification réussie!
Token JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Informations utilisateur:
{
  id: "60d21b4667d0d8992e610c85",
  name: "Test User",
  email: "test@example.com",
  role: "buyer"
}
```

### 🔬 Tests des APIs GraphQL

Les requêtes GraphQL peuvent être testées via l'interface GraphQL Playground exposée par l'API Gateway:

1. Démarrer l'API Gateway:
```bash
node server.js
```

2. Accéder au playground GraphQL:
```
http://localhost:3000/graphql
```

3. Exemples de requêtes de test:

**Requête d'authentification**:
```graphql
mutation {
  login(email: "user@example.com", password: "password123") {
    token
    user {
      id
      name
      email
      role
    }
  }
}
```

**Requête de recherche de propriétés**:
```graphql
query {
  getProperties(
    filter: {
      minPrice: 100000
      maxPrice: 300000
      bedrooms: 2
      city: "Tunis"
    }
    limit: 5
  ) {
    id
    title
    description
    price
    address {
      street
      city
      zipCode
    }
    features {
      bedrooms
      bathrooms
      area
    }
    owner {
      id
      name
      email
    }
    images
    reviews {
      rating
      comment
      author {
        name
      }
    }
  }
}
```

### 🌐 Tests des APIs REST

Pour tester les endpoints REST, nous utilisons des outils comme Postman ou cURL. Voici quelques exemples de tests:

**Authentification**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

**Récupération des propriétés**:
```bash
curl -X GET http://localhost:3000/api/properties \
  -H "Authorization: Bearer ${TOKEN}"
```

**Création d'un rendez-vous**:
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "propertyId": "123",
    "datetime": "2023-05-20T10:00:00Z",
    "duration": 60,
    "notes": "Visite de l'appartement"
  }'
```

## 🚨 Défis Rencontrés et Solutions

### 1. Intégration GraphQL-gRPC
**Défi**: La traduction des requêtes GraphQL en appels gRPC appropriés sans perte de fonctionnalité était complexe.

**Solution**: Nous avons créé des résolveurs GraphQL spécifiques qui mappent les champs GraphQL aux services gRPC, en utilisant des fonctions de transformation et d'agrégation pour assurer la cohérence des données.

### 2. Authentification Cross-Service
**Défi**: Assurer qu'un utilisateur authentifié auprès de l'API Gateway soit reconnu par tous les microservices.

**Solution**: Mise en place d'un middleware d'authentification centralisé dans l'API Gateway qui valide les tokens JWT, puis transmission des informations d'utilisateur dans les métadonnées des appels gRPC.

### 3. Résolution des Erreurs gRPC
**Défi**: Des erreurs difficiles à déboguer apparaissaient dans les communications gRPC, notamment le problème "Cannot return null for non-nullable field".

**Solution**: Création d'outils de débogage spécifiques comme `debug-login-flow.js` et `debug-auth.js` pour tracer et analyser les flux de communication gRPC, et mise en place de correctifs comme `fix-login-mutation.js` et `fix-apollo-resolver.js`.

### 4. Performance des Requêtes de Propriétés
**Défi**: Les requêtes impliquant des propriétés avec filtres complexes et relations étaient lentes.

**Solution**: Optimisation des requêtes MongoDB avec indexation appropriée et implémentation de stratégies de cache pour les résultats fréquemment demandés.

### 5. Intégration du Service Prédicteur
**Défi**: L'intégration du service prédicteur développé en Python/Flask avec le reste de l'architecture Node.js/gRPC.

**Solution**: Exposition d'une API REST par le service prédicteur et création d'un adaptateur dans l'API Gateway pour transformer les appels entre les différents formats.

## 🛠️ Outils de Débogage et Tests

Plusieurs outils de test sont disponibles dans le répertoire de l'API Gateway pour faciliter le débogage:

- **Tests gRPC**: 
  - `grpc-test-template.js`: Template réutilisable pour créer des tests gRPC
  - `test-login-simple.js`, `test-login-fix.js`: Tests d'authentification
  - `debug-login-flow.js`: Analyse détaillée du flux de connexion
  - `debug-auth.js`: Débogage des problèmes d'authentification

- **Tests de Propriétés**: 
  - `simple-property-test.js`: Test basique du service propriété
  - `debug-property-grpc.js`: Débogage des appels gRPC au service propriété
  - `debug-property-auth.js`: Test de l'authentification dans le contexte des propriétés
  - `test-property-ownership.js`: Vérification des mécanismes de propriété

- **Tests de Rendez-vous**: 
  - `simple-appointment-test.js`: Test basique du service rendez-vous
  - `test-appointments.js`: Tests complets des fonctionnalités de rendez-vous
  - `debug-appointments.js`: Débogage des problèmes de rendez-vous

- **Outils de Correction**:
  - `fix-login-mutation.js`: Correction des problèmes de mutation login GraphQL
  - `fix-apollo-resolver.js`: Correction des résolveurs Apollo
  - `fix-grpc-client.js`: Correction des problèmes de client gRPC

## 🔎 Guide de Dépannage

### Problèmes Courants
1. **Erreur de connexion gRPC**:
   - Vérifier que le service est en cours d'exécution
   - Vérifier les ports et adresses dans les fichiers de configuration
   - Exemple de correction: `node fix-grpc-client.js`

2. **Erreur GraphQL "Cannot return null for non-nullable field"**:
   - Problème de résolveur GraphQL retournant null pour un champ requis
   - Solution: `node fix-apollo-resolver.js`

3. **Erreur d'authentification JWT**:
   - Vérifier la validité et l'expiration du token
   - Vérifier la clé secrète JWT dans les fichiers .env
   - Outil de débogage: `node debug-auth.js`

## 📂 Structure des Fichiers

```
proptech-connect/
├── api-gateway/            # API Gateway (Express + Apollo Server)
│   ├── grpc-clients/       # Clients gRPC pour chaque service
│   ├── middleware/         # Middleware Express (auth, logging, etc.)
│   ├── resolvers/          # Résolveurs GraphQL 
│   ├── routes/             # Routes API REST Express
│   ├── schema/             # Schémas GraphQL
│   └── server.js           # Point d'entrée de l'API Gateway
├── proto/                  # Définitions Protocol Buffers pour gRPC
├── services/
│   ├── user-service/       # Microservice Utilisateur (Node.js + gRPC)
│   ├── property-service/   # Microservice Propriété (Node.js + gRPC + MongoDB)
│   ├── appointment-service/# Microservice Rendez-vous (Node.js + gRPC + MongoDB)
│   ├── chat-service/       # Microservice Chat (Node.js + gRPC + MongoDB)
│   ├── notification-service/ # Microservice Notification (Node.js + gRPC + Kafka)
│   └── real-estate-predictor-service/ # Service IA Prédicteur (Python + Flask + React)
│      ├── backend-flask/   # Backend Flask avec modèle XGBoost
│      └── frontend-react/  # Frontend React avec Material-UI
``` 