import React, { useState } from 'react';
import './accueil.css';
import astro from '../assets/astro.svg';
import JoinParty from './joinparty';

function Accueil() {
  const [showJoinParty, setShowJoinParty] = useState(false);

  const handleJoinPartyClick = () => {
    setShowJoinParty(true);
  };

  return (
    <div className="bg">


      {showJoinParty ? (
       <JoinParty />
      ) : (
      <div className="container">
        <h1 className="GameName">WikiExplorer</h1>
        <div className="ButtonHolder">
        <li><button>Solo</button></li>
        <li><button>Create Party</button></li>
        <li><button onClick={handleJoinPartyClick}>Join Party</button></li>
        </div>
      </div>
      )}


     <img src={astro} className={`astro ${showJoinParty ? 'floating' : 'station'}`} alt="astronaut" />

    </div>
  );
}

export default Accueil;