import  { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './accueil.css';
import astro from '../assets/astro.svg';
import JoinParty from './joinparty';

function Accueil() {
  const [showJoinParty, setShowJoinParty] = useState(false);

  const handleJoinPartyClick = () => {
    setShowJoinParty(true);
  };

  const handleBackClick = () => {
    setShowJoinParty(false);
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
                <li><button>Create Party</button></li>
                <li><button onClick={handleJoinPartyClick}>Join Party</button></li>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <img src={astro} className={`astro ${showJoinParty ? 'floating' : ''}`} alt="astronaut" />
    </div>
  );
}

export default Accueil;
