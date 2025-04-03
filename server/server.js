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
      settings: settings || {},
    });

    await newParty.save();
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
    res.json({ success: true, message: 'Player added to the party' });
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

    res.json({ success: true, message: 'Player left the party successfully' });
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

    res.json({
      success: true,
      party: {
        code: party.code,
        creator: party.creator,
        settings: party.settings,
        players: party.players,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching party:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});