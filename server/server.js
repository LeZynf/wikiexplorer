import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import Party from '../src/models/Party.js'; // Assurez-vous que ce chemin est correct et que le modèle est défini

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:5173', // Remplacez par l'origine de votre frontend
    methods: ['GET', 'POST'], // Méthodes autorisées
    credentials: true, // Si vous utilisez des cookies ou des sessions
  },
});

// Middleware
app.use(express.json());
app.use(cors());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI || 'your_default_mongo_uri')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((error) => console.error('❌ MongoDB connection error:', error));

// Socket.IO for real-time events
io.on('connection', (socket) => {
  console.log('A user connected via Socket.IO:', socket.id);

  socket.on('sendMessage', ({ playerName, message }) => {
    const chatMessage = { playerName, message, timestamp: new Date() };
    io.emit('receiveMessage', chatMessage); // Broadcast the message to all clients
  });

  // Gérer l'événement "startGame"
  socket.on('startGame', ({ partyCode }) => {
    console.log(`La partie ${partyCode} commence.`);
    io.emit('startGame', { partyCode }); // Diffuser l'événement à tous les joueurs
  });

  socket.on("articleChanged", ({ playerName, currentArticle }) => {
    console.log(`${playerName} navigue vers ${currentArticle}`);
    io.emit("articleChanged", { playerName, currentArticle }); // Diffuser l'événement à tous les clients
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Initialisation de la partie
  socket.on('initializeGame', async ({ partyCode }) => {
    try {
      // Vérifier d'abord si la partie existe
      const existingParty = await Party.findOne({ code: partyCode });
      if (!existingParty) {
        console.log(`Partie ${partyCode} non trouvée`);
        return;
      }
      
      // Si les objectifs existent déjà, mettre à jour uniquement le statut et l'heure de début
      if (existingParty.objectives && existingParty.objectives.length > 0) {
        const updatedParty = await Party.findOneAndUpdate(
          { code: partyCode },
          { 
            status: 'en cours',
            startTime: new Date()
          },
          { new: true }
        );
        
        console.log(`Partie ${partyCode} initialisée avec objectifs existants`);
        
        // Émettre les objectifs à tous les joueurs
        io.to(partyCode).emit('objectivesGenerated', { objectives: updatedParty.objectives });
      } else {
        // Générer de nouveaux objectifs
        const objectives = [];
        const numObjectives = existingParty.settings.sitesToVisit;
        
        console.log(`Génération de ${numObjectives} objectifs pour la partie ${partyCode}`);
        
        for (let i = 0; i < numObjectives; i++) {
          try {
            const response = await fetch("https://fr.wikipedia.org/api/rest_v1/page/random/title");
            const data = await response.json();
            objectives.push(data.items[0].title);
          } catch (fetchError) {
            console.error("Erreur lors de la récupération d'un titre aléatoire:", fetchError);
            // Utiliser un titre par défaut en cas d'échec
            objectives.push(`Article ${i + 1}`);
          }
        }
        
        // Mettre à jour en une seule opération atomique
        const updatedParty = await Party.findOneAndUpdate(
          { code: partyCode },
          { 
            status: 'en cours',
            startTime: new Date(),
            objectives: objectives
          },
          { new: true }
        );
        
        console.log(`Objectifs générés pour la partie ${partyCode}:`, objectives);
        
        // Émettre les objectifs à tous les joueurs
        io.to(partyCode).emit('objectivesGenerated', { objectives: objectives });
      }
      
      // Rejoindre la room
      socket.join(partyCode);
    } catch (error) {
      console.error('Error initializing game:', error);
    }
  });

  // Gestion de la complétion d'un objectif
  socket.on('objectiveCompleted', async ({ partyCode, playerName, article }) => {
    try {
      console.log(`Joueur ${playerName} a complété l'article: ${article}`);
      
      const party = await Party.findOne({ code: partyCode });
      if (!party) {
        console.error(`Partie non trouvée: ${partyCode}`);
        return;
      }
      
      // Vérification de la structure avant modification
      console.log("Structure actuelle de completedArticles:", JSON.stringify(party.completedArticles));
      
      // S'assurer que completedArticles est un objet
      if (!party.completedArticles) {
        party.completedArticles = {};
      }
      
      // S'assurer que le joueur a une entrée
      if (!party.completedArticles[playerName]) {
        party.completedArticles[playerName] = [];
      }
      
      // Ajouter l'article s'il n'est pas déjà présent
      if (!party.completedArticles[playerName].includes(article)) {
        party.completedArticles[playerName].push(article);
        
        // Utiliser markModified pour informer Mongoose de la modification
        party.markModified('completedArticles');
        await party.save();
        
        console.log(`Article ${article} ajouté pour ${playerName}`);
        console.log("Nouvelle structure:", JSON.stringify(party.completedArticles));
        
        // Émettre l'événement de progression
        io.to(partyCode).emit('objectiveProgress', {
          playerName,
          completedArticles: party.completedArticles[playerName],
          totalObjectives: party.objectives.length
        });
      }
      
      // Vérifier si le joueur a terminé tous ses objectifs
      if (party.completedArticles[playerName].length >= party.objectives.length) {
        console.log(`🏆 Joueur ${playerName} a terminé tous les objectifs!`);
        
        // Marquer la partie comme terminée
        party.status = 'terminé';
        party.endTime = new Date();
        party.winner = playerName;
        await party.save();
        
        // Préparer les statistiques pour le podium
        const playerStats = [];
        for (const player of party.players) {
          const completedArticles = party.completedArticles[player] || [];
          
          playerStats.push({
            name: player,
            completedObjectives: completedArticles.length,
            isWinner: player === playerName,
            visitedPages: completedArticles.length
          });
        }
        
        // Trier le podium et envoyer l'événement gameOver
        playerStats.sort((a, b) => {
          if (b.completedObjectives !== a.completedObjectives) {
            return b.completedObjectives - a.completedObjectives;
          }
          return a.visitedPages - b.visitedPages;
        });
        io.to(partyCode).emit('gameOver', { winner: playerName, playerStats });
      }
    } catch (error) {
      console.error("Erreur lors de la complétion d'objectif:", error);
    }
  });

  // Ajouter un nouvel événement pour créer une nouvelle partie avec les mêmes joueurs
  socket.on('restartGame', async ({ oldPartyCode }) => {
    try {
      const oldParty = await Party.findOne({ code: oldPartyCode });
      if (!oldParty) return;
      
      const partyCode = await generateUniquePartyCode();
      const newParty = new Party({
        code: partyCode,
        creator: oldParty.creator,
        players: [...oldParty.players],
        settings: oldParty.settings,
        status: 'en attente',
        objectives: [],
        completedArticles: {},
        startTime: null,
        createdAt: new Date()
      });
      
      await newParty.save();
      console.log(`✅ Nouvelle partie créée: ${partyCode}`);
      
      // Informer tous les joueurs de la nouvelle partie
      io.to(oldPartyCode).emit('gameRestarted', { newPartyCode: partyCode });
    } catch (error) {
      console.error("Erreur lors du redémarrage de la partie:", error);
    }
  });
});

// Fonction pour générer un code unique pour une partie
async function generateUniquePartyCode() {
  let partyCode;
  let existingParty;

  do {
    partyCode = Math.floor(100000 + Math.random() * 900000).toString();
    existingParty = await Party.findOne({ code: partyCode });
  } while (existingParty);

  return partyCode;
}

// Routes API
app.post('/create-party', async (req, res) => {
  const { creator, settings } = req.body;

  if (!creator) {
    return res.status(400).json({ success: false, message: 'Creator name is required' });
  }

  try {
    const partyCode = await generateUniquePartyCode();
    const newParty = new Party({
      code: partyCode,
      creator,
      players: [creator],
      settings: settings || {
        difficulty: 'normal',
        timeLimit: 300,
        sitesToVisit: 2
      },
      status: 'en attente',
      objectives: [], // Initialiser avec un tableau vide
      completedArticles: {}, // Initialiser avec un objet vide
      startTime: null,
      createdAt: new Date()
    });

    // Cette ligne était manquante ou incomplète!
    await newParty.save();
    console.log('✅ Partie créée avec succès:', partyCode);
    
    // Envoyer la réponse après avoir sauvegardé
    res.json({ success: true, partyCode });
  } catch (error) {
    console.error('❌ Error creating party:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/join-party', async (req, res) => {
  const { partyCode, playerName } = req.body;

  if (!playerName || !partyCode) {
    return res.status(400).json({ success: false, message: 'Party code and player name are required' });
  }

  try {
    const party = await Party.findOne({ code: partyCode });

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    if (party.players.includes(playerName)) {
      return res.status(400).json({ success: false, message: 'Player already in the party' });
    }

    party.players.push(playerName);
    await party.save();
    const data = { success: true, message: 'Player added to the party' };
    res.json(data);

    if (data.success) {
      // Émettre l'événement aux autres joueurs
      io.to(partyCode).emit('playerJoined', { playerName: req.body.playerName });
    }
  } catch (error) {
    console.error('❌ Error joining party:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/leave-party', async (req, res) => {
  const { partyCode, playerName } = req.body;

  if (!playerName || !partyCode) {
    return res.status(400).json({ success: false, message: 'Party code and player name are required' });
  }

  try {
    const party = await Party.findOne({ code: partyCode });

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    const playerIndex = party.players.indexOf(playerName);
    if (playerIndex === -1) {
      return res.status(400).json({ success: false, message: 'Player not found in the party' });
    }

    const isHost = party.creator === playerName;
    party.players.splice(playerIndex, 1);

    if (isHost && party.players.length > 0) {
      party.creator = party.players[0];
    }

    await party.save();

    if (party.players.length === 0) {
      await Party.deleteOne({ code: partyCode });
    }

    const data = { success: true, message: 'Player left the party successfully' };
    res.json(data);

    if (data.success) {
      io.to(partyCode).emit('playerLeft', { playerName: req.body.playerName });
    }
  } catch (error) {
    console.error('❌ Error leaving party:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/party/:partyCode', async (req, res) => {
  const { partyCode } = req.params;

  try {
    const party = await Party.findOne({ code: partyCode });

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    // Vérifier la structure de completedArticles avant de l'envoyer
    if (typeof party.completedArticles !== 'object' || party.completedArticles === null) {
      party.completedArticles = {};
      party.markModified('completedArticles');
      await party.save();
    }

    // Log pour débogage
    console.log("Party details:", {
      code: party.code,
      completedArticles: party.completedArticles,
      objectives: party.objectives
    });

    res.json({
      success: true,
      party: {
        code: party.code,
        creator: party.creator,
        players: party.players,
        settings: party.settings,
        status: party.status,
        objectives: party.objectives || [],
        completedArticles: party.completedArticles || {},
        startTime: party.startTime
      }
    });
  } catch (error) {
    console.error('Error fetching party:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/update-party-settings', async (req, res) => {
  const { partyCode, settings, hostName } = req.body;

  try {
    const party = await Party.findOne({ code: partyCode });

    if (!party) {
      return res.json({
        success: false,
        message: 'Party not found'
      });
    }

    if (party.creator !== hostName) {
      return res.json({
        success: false,
        message: 'Only host can update settings'
      });
    }

    // Mettre à jour les paramètres
    party.settings = {
      ...party.settings,
      ...settings
    };

    // Sauvegarder les modifications
    await party.save();

    // Émettre les nouveaux paramètres à tous les joueurs de la partie
    io.emit('settingsUpdated', party.settings);
    io.to(partyCode).emit('partyUpdated');
    
    res.json({
      success: true,
      settings: party.settings
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.json({
      success: false,
      message: error.message
    });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});