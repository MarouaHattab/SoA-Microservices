# Utiliser Node.js 22 avec Alpine Linux comme image de base (légère)
FROM node:22-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json (si disponible)
COPY package*.json ./

# Installer les dépendances en mode production uniquement (pas les devDependencies)
RUN npm install --production

# Copier le fichier index.js dans le conteneur
COPY index.js ./

# Exposer le port 3002 pour que les autres conteneurs puissent s'y connecter
EXPOSE 3002

# Commande pour démarrer l'application
CMD ["node", "index.js"]