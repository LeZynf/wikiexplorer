import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Added useNavigate for navigation
import './accueil.css';
import './lobby.css';
import { div } from 'framer-motion/client';


interface LobbyProps {
  // Le partyCode peut être passé en prop ou récupéré depuis l'URL
  partyCode?: string;
  // Le nom du joueur actuel
  playerName?: string;
}

const Lobby: React.FC<LobbyProps> = ({ partyCode: propPartyCode, playerName: propPlayerName }) => {
  const { partyCode: urlPartyCode } = useParams<{ partyCode: string }>();  // Récupère le partyCode depuis l'URL
  const navigate = useNavigate(); // Hook pour la navigation
  
  // Utiliser le partyCode des props s'il existe, sinon celui de l'URL
  const partyCode = propPartyCode || urlPartyCode;
  
  const [players, setPlayers] = useState<string[]>([]);  // Liste des joueurs
  const [currentPlayerName, setCurrentPlayerName] = useState<string>(propPlayerName || ''); // Nom du joueur actuel
  const [settings, setSettings] = useState({
    difficulty: 'normal',   // Difficulté par défaut
    timeLimit: 60,          // Temps limite par défaut
    sitesToVisit: 5,        // Nombre de sites à visiter pour gagner
  });
  const [host, setHost] = useState<string>('');  // Hôte (créateur de la party)
  const [isHost, setIsHost] = useState<boolean>(false); // New state to track if current player is host
  const [settingsChanged, setSettingsChanged] = useState<boolean>(false); // Track if settings were changed
  
  // Fonction pour récupérer les détails de la party
  const fetchPartyDetails = async () => {
    if (!partyCode) return;  // Si le partyCode n'est pas défini, ne pas exécuter la requête
    
    try {
      console.log('Fetching party details for code:', partyCode);
      const response = await fetch(`http://localhost:5000/party/${partyCode}`);
      const data = await response.json();
  
      if (data.success) {
        setPlayers(data.party.players);
        setHost(data.party.creator);  // Récupérer l'hôte (créateur de la party)
        setSettings(data.party.settings);  // Récupérer les paramètres de la partie
      }
    } catch (error) {
      console.error('Error fetching party details:', error);
    }
  };
  
  // Appel initial à l'API pour récupérer les détails de la party
  useEffect(() => {
    fetchPartyDetails();
  }, [partyCode]); // Le useEffect se déclenche à chaque fois que le partyCode change
  
  // Rafraîchissement périodique des détails de la party
  useEffect(() => {
    if (!partyCode) return;
    
    // Rafraîchir les détails toutes les 5 secondes
    const intervalId = setInterval(fetchPartyDetails, 5000);
    
    // Nettoyer l'intervalle lorsque le composant est démonté
    return () => clearInterval(intervalId);
  }, [partyCode, settingsChanged, currentPlayerName]);
  
  // Définir le nom du joueur actuel au chargement du composant
  useEffect(() => {
    if (propPlayerName) {
      setCurrentPlayerName(propPlayerName);
      // Check if player is host when player name is set
      if (host && propPlayerName === host) {
        setIsHost(true);
      }
    } else {
      // Try to get from localStorage if not provided as prop
      const storedName = localStorage.getItem('playerName');
      if (storedName) {
        setCurrentPlayerName(storedName);
      }
    }
  }, [propPlayerName, host]);
  
  // Fonction pour gérer les changements dans les paramètres
  const handleSettingChange = (setting: string, value: any) => {
    // Only allow host to change settings
    if (!isHost) return;
    
    setSettings((prevSettings) => ({
      ...prevSettings,
      [setting]: value,
    }));
    setSettingsChanged(true);
    
    // Send updated settings to server
    updatePartySettings();
  };
  
  // Function to update party settings on the server
  const updatePartySettings = async () => {
    if (!isHost || !partyCode) return;
    
    try {
      const response = await fetch(`http://localhost:5000/update-party-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyCode,
          settings,
          hostName: currentPlayerName
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('Settings updated successfully');
        // Reset the changed flag after successful update
        setTimeout(() => setSettingsChanged(false), 1000);
      } else {
        console.error('Failed to update settings:', data.message);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };
  
  // Fonction pour démarrer la partie (logique à compléter)
  const handleStartGame = () => {
    console.log('La partie commence avec les paramètres :', settings);
    // Logique pour démarrer la partie, envoyer un signal au backend pour débuter le jeu
    if (partyCode) {
      navigate(`/wikigame/${partyCode}`);
    } else {
      console.error('Le code de la partie est manquant.');
    }
  };
  
  // Fonction pour quitter la partie et retourner à l'accueil
  const handleLeaveParty = async () => {
    // Si le partyCode n'est pas défini, simplement retourner à l'accueil
    if (!partyCode) {
      navigate('/');
      return;
    }
  
    try {
      // Utiliser le nom du joueur actuel stocké dans l'état
      const playerNameToUse = currentPlayerName || (host === players[0] ? host : players[players.length - 1]);
      
      // Appel à l'API pour quitter la partie
      const response = await fetch('http://localhost:5000/leave-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyCode: partyCode,
          playerName: playerNameToUse,
        }),
      });
  
      const data = await response.json();
      
      if (data.success) {
        console.log('Partie quittée avec succès');
        if (data.partyDeleted) {
          console.log('La partie a été supprimée car elle est vide');
        }
      } else {
        console.error('Erreur lors de la sortie de la partie:', data.message);
      }
    } catch (error) {
      console.error('Erreur lors de la communication avec le serveur:', error);
    }
    
    // Redirection vers la page d'accueil
    navigate('/');
  };
  
  // Function to toggle artifact status
  const toggleArtifact = (index: number) => {
    if (!isHost) return; // Only host can toggle artifacts
    
    // Here you would implement the logic to toggle artifacts
    console.log(`Toggling artifact ${index}`);
    // This would be expanded when you implement the artifacts feature
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
          disabled={!isHost} // Disable for non-hosts
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
          disabled={!isHost} // Disable for non-hosts
        />
      </div>
  
      <div>
        <label>Nombre de sites à visiter :</label>
        <input
          type="number"
          value={settings.sitesToVisit}
          onChange={(e) => handleSettingChange('sitesToVisit', parseInt(e.target.value))}
          min="1"
          disabled={!isHost} // Disable for non-hosts
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
  <div>1</div>
  <div>1</div>
</div>
<div className='playerlob border'>
      <h2>Joueurs dans la party :</h2>
      
        {players.map((player, index) => (
          <div className='playerbubble' key={index}>{player}</div>
        ))}
      
</div>
<div className='chatlob border'>  <div className='chat'><p>bonjour </p><p>bonjour </p><p>bonjour </p></div>
<input type="text" />
</div>
<div className='bouttonback'><button onClick={handleLeaveParty}>BACK</button></div>
      {/* Si l'utilisateur est l'hôte, afficher un bouton pour démarrer la partie */}
      {host && host === players[0] && (  // Vérifie si l'hôte est bien dans la liste des joueurs
       <div className='buttonplay'> <button onClick={handleStartGame}>Démarrer la partie</button> </div>
      )}
    </div> 
    
    
    </div>
  );
};

export default Lobby;
