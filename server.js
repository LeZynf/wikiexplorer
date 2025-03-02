import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import Party from './src/models/Party.js'; // Ensure this path is correct and the model is properly defined

dotenv.config();
const app = express();

// Utilisation de CORS pour permettre les requêtes depuis le frontend
app.use(express.json());  
app.use(cors());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI || 'your_default_mongo_uri')
  .then(() => console.log('✅ Connexion à MongoDB réussie'))
  .catch((error) => console.error('❌ Erreur de connexion à MongoDB', error));

// Fonction pour générer un code unique pour la party

async function generateUniquePartyCode() {
    let partyCode;
    let existingParty;
  
    // Essayer de générer un code unique
    do {
      partyCode = Math.floor(100000 + Math.random() * 900000).toString();
      existingParty = await Party.findOne({ code: partyCode });
    } while (existingParty);  // Répéter jusqu'à ce que le code soit unique
  
    return partyCode;
  }
  
// Add this route after your other routes

// Route POST pour mettre à jour les paramètres d'une partie
app.post('/update-party-settings', async (req, res) => {
  const { partyCode, settings, hostName } = req.body;

  // Validation des données
  if (!partyCode || !settings || !hostName) {
    return res.status(400).json({ 
      success: false, 
      message: 'Party code, settings, and host name are required' 
    });
  }

  try {
    // Trouver la partie
    const party = await Party.findOne({ code: partyCode });
    if (!party) {
      return res.status(404).json({ 
        success: false, 
        message: 'Party not found' 
      });
    }

    // Vérifier que la requête vient bien de l'hôte
    if (party.creator !== hostName) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only the host can update party settings' 
      });
    }

    // Mettre à jour les paramètres
    party.settings = settings;
    await party.save();

    console.log(`✅ Paramètres de la partie ${partyCode} mis à jour par ${hostName}`);
    res.json({ 
      success: true, 
      message: 'Party settings updated successfully' 
    });

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating settings' 
    });
  }
});
app.post('/create-party', async (req, res) => {
  console.log("📩 Requête reçue :", req.body);

  const { creator, settings } = req.body;
  if (!creator) {
    return res.status(400).json({ success: false, message: 'Creator name is required' });
  }

  try {
    const partyCode = await generateUniquePartyCode();
    const newParty = new Party({
      code: partyCode,
      creator: creator,
      players: [creator],
      settings: settings || {},
    });

    await newParty.save();
    console.log("✅ Partie créée :", newParty);
    res.json({ success: true, partyCode });
  } catch (error) {
    console.error("❌ Erreur lors de la création de la partie :", error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


// Route POST pour rejoindre une partie
app.post('/join-party', async (req, res) => {
  const { partyCode, playerName } = req.body;

  // Validation des données
  if (!playerName || !partyCode) {
    return res.status(400).json({ success: false, message: 'Party code and player name are required' });
  }

  try {
    const party = await Party.findOne({ code: partyCode });

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    // Vérifier si le joueur est déjà dans la partie
    if (party.players.includes(playerName)) {
      return res.status(400).json({ success: false, message: 'Player already in the party' });
    }

    // Ajouter le joueur à la liste des joueurs
    party.players.push(playerName);

    // Sauvegarder la partie mise à jour
    await party.save();
    res.json({ success: true, message: 'Player added to the party' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour récupérer les détails d'une party par son code
// Route pour récupérer les détails d'une partie par son code
app.get('/party/:partyCode', async (req, res) => {
    const { partyCode } = req.params;
  
    try {
      const party = await Party.findOne({ code: partyCode });
  
      if (!party) {
        return res.status(404).json({ success: false, message: 'Party not found' });
      }
  
      res.json({
        success: true,
        party: {
          code: party.code,
          creator: party.creator,  
          settings: party.settings, 
          players: party.players
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });
  
app.get('/', (req, res) => {
    res.send('En route');
});

// Route GET pour récupérer toutes les parties
app.get('/parties', async (req, res) => {
    try {
      // Récupérer toutes les parties dans la base de données
      const parties = await Party.find();
  
      if (!parties || parties.length === 0) {
        return res.status(404).json({ success: false, message: 'Aucune partie trouvée' });
      }
  
      // Retourner les parties en réponse
      res.json({ success: true, parties });
    } catch (error) {
      console.error('Erreur lors de la récupération des parties :', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Fonction utilitaire pour vérifier et supprimer une partie vide
async function checkAndDeleteEmptyParty(partyCode) {
  try {
    const party = await Party.findOne({ code: partyCode });
    if (!party) return false;

    // Vérifier si la partie est vide (aucun joueur)
    if (party.players.length === 0) {
      await Party.deleteOne({ code: partyCode });
      console.log(`✅ Partie ${partyCode} supprimée car vide`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification/suppression de la partie ${partyCode}:`, error);
    return false;
  }
}

// Route POST pour quitter une partie
app.post('/leave-party', async (req, res) => {
  const { partyCode, playerName } = req.body;

  // Validation des données
  if (!playerName || !partyCode) {
    return res.status(400).json({ 
      success: false, 
      message: 'Party code and player name are required' 
    });
  }

  try {
    // Trouver la partie
    const party = await Party.findOne({ code: partyCode });
    if (!party) {
      return res.status(404).json({ 
        success: false, 
        message: 'Party not found' 
      });
    }

    // Vérifier si le joueur est dans la partie
    const playerIndex = party.players.indexOf(playerName);
    if (playerIndex === -1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Player not found in the party' 
      });
    }

    // Vérifier si le joueur qui part est l'hôte
    const isHost = party.creator === playerName;
    
    // Retirer le joueur de la liste
    party.players.splice(playerIndex, 1);
    
    // Si le joueur qui part est l'hôte et qu'il reste des joueurs, transférer le rôle d'hôte
    if (isHost && party.players.length > 0) {
      // Assigner le rôle d'hôte au premier joueur restant
      party.creator = party.players[0];
      console.log(`🔄 Rôle d'hôte transféré à ${party.creator}`);
    }
    
    await party.save();

    // Vérifier si la partie est vide et la supprimer si nécessaire
    const wasDeleted = await checkAndDeleteEmptyParty(partyCode);

    res.json({ 
      success: true, 
      message: 'Player left the party successfully',
      partyDeleted: wasDeleted,
      newHost: isHost && !wasDeleted ? party.creator : null // Indiquer le nouvel hôte si applicable
    });

  } catch (error) {
    console.error('❌ Erreur lors du départ du joueur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while leaving party' 
    });
  }
});
  
// Démarrer le serveur
app.listen(5000, () => console.log('✅ Serveur sur http://localhost:5000'));
