Télécharger le projet
Créer un fichier .env à la racine du projet et y écrire la ligne :
MONGO_URI=mongodb+srv://salim:1234@cluster0.9cwxb.mongodb.net/wikiexplorer?retryWrites=true&w=majority&appName=Cluster0

Dans un terminal, lancer : npm install
Créer un 2e terminal
Dans le premier, lancer : node ./server/server.js
Dans le deuxième, lancer : npm run dev

Lancer le site localhost:5173

Sur le jeu :
Choisir entre le mode solo et le mode multijoueur en créant ou en rejoignant une partie
En créant une partie, l'hôte peut modifier les paramètres de jeu