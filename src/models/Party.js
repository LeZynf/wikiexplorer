import mongoose from 'mongoose';
console.log("✅ Modèle Party chargé !");

const partySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  creator: { type: String, required: true },
  players: [{ type: String }],  // Liste des joueurs
  status: { type: String, default: 'en attente' },
  settings: {
    difficulty: { type: String, default: 'normal' },
    timeLimit: { type: Number, default: 300 },  // Temps en secondes
    sitesToVisit: { type: Number, default: 2 }
  },
  createdAt: { type: Date, default: Date.now }
});

const Party = mongoose.model('Party', partySchema);

export default Party;
