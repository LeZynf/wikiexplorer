import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Utilisation de React Router pour récupérer les paramètres d'URL
import './accueil.css';
import './lobby.css';
import { div } from 'framer-motion/client';


interface LobbyProps {
  // Le partyCode sera récupéré depuis l'URL via useParams
}

const Lobby: React.FC<LobbyProps> = () => {
  const { partyCode } = useParams<{ partyCode: string }>();  // Récupère le partyCode depuis l'URL
  const [players, setPlayers] = useState<string[]>([]);  // Liste des joueurs
  const [settings, setSettings] = useState({
    difficulty: 'normal',   // Difficulté par défaut
    timeLimit: 60,          // Temps limite par défaut
    sitesToVisit: 5,        // Nombre de sites à visiter pour gagner
  });
  const [host, setHost] = useState<string>('');  // Hôte (créateur de la party)

  // Appel à l'API pour récupérer les détails de la party (code, joueurs, paramètres)
  useEffect(() => {
    if (!partyCode) return;  // Si le partyCode n'est pas défini, ne pas exécuter la requête

    const fetchPartyDetails = async () => {
      console.log('Fetching party details for code:', partyCode);
      const response = await fetch(`http://localhost:5000/party/${partyCode}`);
      const data = await response.json();

      if (data.success) {
        setPlayers(data.party.players);
        setHost(data.party.creator);  // Récupérer l'hôte (créateur de la party)
        setSettings(data.party.settings);  // Récupérer les paramètres de la partie
      }
    };

    fetchPartyDetails();
  }, [partyCode]); // Le useEffect se déclenche à chaque fois que le partyCode change

  // Fonction pour gérer les changements dans les paramètres
  const handleSettingChange = (setting: string, value: any) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [setting]: value,
    }));
  };

  // Fonction pour démarrer la partie (logique à compléter)
  const handleStartGame = () => {
    console.log('La partie commence avec les paramètres :', settings);
    // Logique pour démarrer la partie, envoyer un signal au backend pour débuter le jeu
  };

  return (

    
 
  
    <div className="bg">
    <div className="lobbygrid">
    <div className='titlelob'>
        <h1 className="GameName">WikiExplorer</h1>
    </div>


      <div className='codelob'>
        <h2><strong>Code de la Party:</strong> {partyCode}</h2>
     
    </div>
<div className='hostlob'>
   <h2><strong>Créateur:</strong> {host}</h2>
</div>


      <div className='paramlob border'>
      <h2>Paramètres du jeu</h2>
      <div>
        <label>Difficiulté :</label>
        <select
          value={settings.difficulty}
          onChange={(e) => handleSettingChange('difficulty', e.target.value)}
        >
          <option value="easy">Facile</option>
          <option value="normal">Normal</option>
          <option value="hard">Difficile</option>
        </select>
      </div>

      <div>
        <label>Temps limite (en secondes) :</label>
        <input
          type="number"
          value={settings.timeLimit}
          onChange={(e) => handleSettingChange('timeLimit', parseInt(e.target.value))}
          min="30"
        />
      </div>

      <div>
        <label>Nombre de sites à visiter :</label>
        <input
          type="number"
          value={settings.sitesToVisit}
          onChange={(e) => handleSettingChange('sitesToVisit', parseInt(e.target.value))}
          min="1"
        />
      </div>
</div>
<div className='artefactlob border'>
  <div>1</div>
  <div>1</div>
  <div>1</div>
  <div>1</div>
  <div>1</div>
  <div>1</div>
</div>
<div className='playerlob border'>
      <h3>Joueurs dans la party :</h3>
      
        {players.map((player, index) => (
          <div className='playerbubble' key={index}>{player}</div>
        ))}
      
</div>
<div className='chatlob border'> <div className='chat'><p>bonjour </p><p>bonjour </p><p>bonjour </p></div>
<input type="text" />
</div>
<div className='bouttonback'><button>BACK</button></div>
      {/* Si l'utilisateur est l'hôte, afficher un bouton pour démarrer la partie */}
      {host && host === players[0] && (  // Vérifie si l'hôte est bien dans la liste des joueurs
       <div className='buttonplay'> <button onClick={handleStartGame}>Démarrer la partie</button> </div>
      )}
    </div> 
    
    
    </div>
  );
};

export default Lobby;
