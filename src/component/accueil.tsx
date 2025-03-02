import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Add this import
import './accueil.css';
import astro from '../assets/astro.svg';
import JoinParty from './joinparty';
import Lobby from './lobby'; // Assure-toi d'importer ton composant Lobby


function Accueil() {
  const navigate = useNavigate(); // Add this hook
  const [showJoinParty, setShowJoinParty] = useState(false);
  const [partyCode, setPartyCode] = useState('');  // Pour stocker le code de la party
  const [creatorName, setCreatorName] = useState('');  // Le créateur de la party
  const [showLobby, setShowLobby] = useState(false); // État pour afficher le lobby
  const [showPseudoModal, setShowPseudoModal] = useState(false); // État pour afficher la modal du pseudo

  // Gérer l'affichage du JoinParty
  const handleJoinPartyClick = () => {
    setShowJoinParty(true);
  };

  // Gérer le retour à la page d'accueil
  const handleBackClick = () => {
    setShowJoinParty(false);
    setShowLobby(false); // Réinitialiser l'affichage du lobby
  };
  // Fonction pour créer une party
  // Modify the handleCreateParty function
  const handleCreateParty = async () => {
    if (!creatorName) {
      setShowPseudoModal(true);
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/create-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator: creatorName,
          settings: { difficulty: 'normal' },
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      if (data.success) {
        // Store player name in localStorage for consistency
        localStorage.setItem('playerName', creatorName);
        
        // Instead of showing the lobby conditionally, navigate to the lobby route
        navigate(`/lobby/${data.partyCode}`, { 
          state: { playerName: creatorName }
        });
      } else {
        console.error('Error in response data:', data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  // Fonction pour fermer la modal du pseudo
  const handleClosePseudoModal = () => {
    setShowPseudoModal(false);
  };

  // Fonction pour définir le pseudo
  const handlePseudoSubmit = () => {
    if (creatorName) {
      setShowPseudoModal(false); // Fermer la modal une fois le pseudo défini
      handleCreateParty(); 
    }
  };

  return (
    <div className="bg">
      <AnimatePresence mode="wait">
        {showJoinParty ? (
          <motion.div
            key="joinParty"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 1 }}
          >
            <JoinParty onBack={handleBackClick} />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.5 }}
          >
            <div className="container">
              <h1 className="GameName">WikiExplorer</h1>
              <div className="ButtonHolder">
                <li><button>Solo</button></li>
                <li><button onClick={handleCreateParty}>Create Party</button></li>
                <li><button onClick={handleJoinPartyClick}>Join Party</button></li>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal pour demander un pseudo */}
      {showPseudoModal && (
        <div className="pseudo-modal">
          <div className="pseudo-modal-content">
            <h2>Entrez votre pseudo</h2>
            <input
              type="text"
              placeholder="Pseudo du créateur"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
            />
            <button onClick={handlePseudoSubmit}>Confirmer</button>
            <button onClick={handleClosePseudoModal}>Annuler</button>
          </div>
        </div>
      )}

      <img src={astro} className={`astro ${showJoinParty ? 'floating' : ''}`} alt="astronaut" />
    </div>
  );
}

export default Accueil;
