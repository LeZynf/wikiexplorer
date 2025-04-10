import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatMessage from './chat/ChatMessage';
import './accueil.css';
import './lobby.css';
import staliteArt from '../assets/satellite_art.svg';
import fuseeArt from '../assets/fusée_art.svg';
import teleportArt from '../assets/teleport_art.svg';
import meteoriteArt from '../assets/meteorite_art.svg';
import baseLunaireArt from '../assets/base-lunaire_art.svg';
import laserArt from '../assets/laser_art.svg';
import ovniArt from '../assets/ovni_art.svg';
import alienArt from '../assets/alien_art.svg';
import socket from '../services/socket';

interface LobbyProps {
  partyCode?: string;
  playerName?: string;
}

interface Artifact {
  id: string;
  name: string;
  description: string;
  type: 'positive' | 'negative';
  enabled: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ partyCode: propPartyCode, playerName: propPlayerName }) => {
  const { partyCode: urlPartyCode } = useParams<{ partyCode: string }>();
  const navigate = useNavigate();

  const partyCode = propPartyCode || urlPartyCode;

  const [players, setPlayers] = useState<string[]>([]);
  const [currentPlayerName, setCurrentPlayerName] = useState<string>(propPlayerName || '');
  const [settings, setSettings] = useState({
    difficulty: 'normal',
    timeLimit: 300,
    sitesToVisit: 2,
  });
  const [host, setHost] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [settingsChanged, setSettingsChanged] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<{ playerName: string; message: string; timestamp: string }[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [showArtifactDescription, setShowArtifactDescription] = useState<boolean>(false);

  const [artifacts, setArtifacts] = useState<Artifact[]>([
    {
      id: 'satellite',
      name: 'Satellite',
      description: 'Scanne et montre le chemin le plus court vers les articles cibles',
      type: 'positive',
      enabled: true
    },
    {
      id: 'Rocket',
      name: 'Fusée',
      description: 'Retourne à l\'article précédent en hyperespace',
      type: 'positive',
      enabled: true
    },
    {
      id: 'teleporter',
      name: 'Téléporteur',
      description: 'Se téléporte à 2 liens d\'un article cible',
      type: 'positive',
      enabled: true
    },
    {
      id: 'meteorite',
      name: 'Météorite',
      description: 'Lance une pluie de météorite sur un article pour piéger les autres joueurs',
      type: 'positive',
      enabled: true
    },
    {
      id: 'moonbase',
      name: 'Base Lunaire',
      description: 'Vous restez à admirer la Terre depuis la Lune pendant 1 minute',
      type: 'negative',
      enabled: true
    },
    {
      id: 'laser',
      name: 'Laser',
      description: 'Désintègre le dernier objectif atteint',
      type: 'negative',
      enabled: true
    },
    {
      id: 'ufo',
      name: 'Ovni',
      description: 'Capture et relâche aléatoirement sur Wikipédia',
      type: 'negative',
      enabled: true
    },
    {
      id: 'alien',
      name: 'Alien',
      description: 'Impose de visiter un article spécifique ou vous êtes désintégré sur le champ',
      type: 'negative',
      enabled: true
    },
  ]);

  const fetchPartyDetails = async () => {
    if (!partyCode) return;

    try {
      console.log('Fetching party details for code:', partyCode);
      const response = await fetch(`http://localhost:5000/party/${partyCode}`);
      const data = await response.json();

      if (data.success) {
        setPlayers(data.party.players);
        setHost(data.party.creator);
        if (data.party.settings) {
          setSettings(data.party.settings);
        }
        if (data.party.artifacts) {
          setArtifacts(data.party.artifacts);
        }
      }
    } catch (error) {
      console.error('Error fetching party details:', error);
    }
  };

  useEffect(() => {
    fetchPartyDetails();
  }, [partyCode]);

  useEffect(() => {
    if (!partyCode) return;
    const intervalId = setInterval(fetchPartyDetails, 5000);
    return () => clearInterval(intervalId);
  }, [partyCode, settingsChanged, currentPlayerName]);

  useEffect(() => {
    if (propPlayerName) {
      setCurrentPlayerName(propPlayerName);
      if (host && propPlayerName === host) {
        setIsHost(true);
      }
    } else {
      const storedName = localStorage.getItem('playerName');
      if (storedName) {
        setCurrentPlayerName(storedName);
      }
    }
  }, [propPlayerName, host]);

  const handleSettingChange = (setting: string, value: any) => {
    if (!isHost) return;

    const newSettings = {
      ...settings,
      [setting]: value,
    };

    setSettings(newSettings);
    setSettingsChanged(true);
    updatePartySettings(newSettings);
  };

  const updatePartySettings = async (newSettings: typeof settings) => {
    if (!isHost || !partyCode) return;

    try {
      const response = await fetch(`http://localhost:5000/update-party-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyCode,
          settings: newSettings,
          hostName: currentPlayerName,
          artifacts // Envoyer aussi l'état des artefacts
        }),
      });

      const data = await response.json();
      if (!data.success) {
        console.error('Failed to update settings:', data.message);
        setSettings(settings);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setSettings(settings);
    }
  };

  const toggleArtifact = (id: string) => {
    if (!isHost) return;

    const updatedArtifacts = artifacts.map(artifact => {
      if (artifact.id === id) {
        return { ...artifact, enabled: !artifact.enabled };
      }
      return artifact;
    });

    setArtifacts(updatedArtifacts);
    updateArtifacts(updatedArtifacts);
  };

  const updateArtifacts = async (updatedArtifacts: Artifact[]) => {
    if (!isHost || !partyCode) return;

    try {
      const response = await fetch(`http://localhost:5000/update-artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyCode,
          artifacts: updatedArtifacts,
          hostName: currentPlayerName
        }),
      });

      const data = await response.json();
      if (!data.success) {
        console.error('Failed to update artifacts:', data.message);
        setArtifacts(artifacts);
      }
    } catch (error) {
      console.error('Error updating artifacts:', error);
      setArtifacts(artifacts);
    }
  };

  const showArtifactInfo = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setShowArtifactDescription(true);
  };

  const handleStartGame = () => {
    console.log('La partie commence avec les paramètres :', settings);
    socket.emit('startGame', { partyCode });
    if (partyCode) {
      navigate(`/wikigame/${partyCode}`);
    } else {
      console.error('Le code de la partie est manquant.');
    }
  };

  const handleLeaveParty = async () => {
    if (!partyCode) {
      navigate('/');
      return;
    }

    try {
      const playerNameToUse = currentPlayerName || (host === players[0] ? host : players[players.length - 1]);
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
      } else {
        console.error('Erreur lors de la sortie de la partie:', data.message);
      }
    } catch (error) {
      console.error('Erreur lors de la communication avec le serveur:', error);
    }

    navigate('/');
  };

  useEffect(() => {
    socket.on('receiveMessage', (message: { playerName: string; message: string; timestamp: string }) => {
      setChatMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socket.off('receiveMessage');
    };
  }, []);

  useEffect(() => {
    socket.on('startGame', ({ partyCode }: { partyCode: string }) => {
      console.log('La partie commence pour tous les joueurs.');
      navigate(`/wikigame/${partyCode}`);
    });

    return () => {
      socket.off('startGame');
    };
  }, [navigate]);

  useEffect(() => {
    socket.on('settingsUpdated', (updatedSettings: { difficulty: string; timeLimit: number; sitesToVisit: number }) => {
      setSettings(updatedSettings);
    });

    socket.on('artifactsUpdated', (updatedArtifacts: Artifact[]) => {
      setArtifacts(updatedArtifacts);
    });

    return () => {
      socket.off('settingsUpdated');
      socket.off('artifactsUpdated');
    };
  }, []);

  const handleSendMessage = (message: string) => {
    const chatMessage = {
      playerName: localStorage.getItem('playerName') || 'Anonymous',
      message,
      timestamp: new Date().toISOString(),
    };
    socket.emit('sendMessage', chatMessage);
  };

  return (
      <div className="bg">
        <div className="lobbygrid">
          <div className='titlelob'>
            <h1 className="GameName">WikiExplorer</h1>
          </div>

          <div className='codelob'>
            <h2><strong>Code:</strong> {partyCode}</h2>
          </div>

          <div className='hostlob'>
            <h2><strong>Créateur:</strong> {host}</h2>
          </div>

          <div className='artefactlob border-b'>
            {artifacts.map((artifact) => (
                <div
                    key={artifact.id}
                    className={`artifact-container ${!artifact.enabled ? 'disabled' : ''} ${artifact.type}`}
                    onClick={() => isHost && toggleArtifact(artifact.id)}
                    onDoubleClick={() => showArtifactInfo(artifact)}
                >
                  <img
                      src={
                        artifact.id === 'satellite' ? staliteArt :
                            artifact.id === 'Rocket' ? fuseeArt :
                                artifact.id === 'teleporter' ? teleportArt :
                                    artifact.id === 'meteorite' ? meteoriteArt :
                                        artifact.id === 'moonbase' ? baseLunaireArt :
                                            artifact.id === 'laser' ? laserArt :
                                                artifact.id === 'ufo' ? ovniArt :
                                                    alienArt
                      }
                      alt={artifact.name}
                      className={!artifact.enabled ? 'grayscale' : ''}
                  />
                  <h3>{artifact.name}</h3>
                  {!artifact.enabled && <div className="artifact-disabled-overlay">Désactivé</div>}
                </div>
            ))}
          </div>

          <div className='playerlob border-b'>
            <h2>Joueurs :</h2>
            {players.map((player, index) => (
                <div className='playerbubble' key={index}>{player}</div>
            ))}
          </div>

          <div className="chatlob border-b">
            <div className="chat">
              {chatMessages.map((msg, index) => (
                  <ChatMessage key={index} username={msg.playerName} message={msg.message} timestamp={msg.timestamp} />
              ))}
            </div>
            <div className="chat-input-container">
              <input
                  type="text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      const message = input.value.trim();
                      if (message !== '') {
                        handleSendMessage(message);
                        input.value = '';
                      }
                    }
                  }}
                  placeholder="Type your message..."
                  className="chat-input"
              />
              <button
                  onClick={() => {
                    const input = document.querySelector('.chat-input') as HTMLInputElement;
                    const message = input.value.trim();
                    if (message !== '') {
                      handleSendMessage(message);
                      input.value = '';
                    }
                  }}
                  className="chat-send-button"
              >
                Send
              </button>
            </div>
          </div>

          <div className='bouttonback'><button onClick={handleLeaveParty}>BACK</button></div>

          {host && currentPlayerName === host && (
              <div className='buttonplay'>
                <button onClick={handleStartGame}>Démarrer la partie</button>
              </div>
          )}

          <div className='parambutton'>
            <button onClick={() => setShowSettings(true)}>Paramètres</button>
          </div>

          {showSettings && (
              <div className="popup-overlay">
                <div className="popup-content">
                  <h2>Paramètres du jeu</h2>
                  <div>
                    <label>Difficulté :</label>
                    <select
                        value={settings.difficulty}
                        onChange={(e) => handleSettingChange('difficulty', e.target.value)}
                        disabled={!isHost}
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
                        disabled={!isHost}
                    />
                  </div>

                  <div>
                    <label>Nombre de sites à visiter :</label>
                    <input
                        type="number"
                        value={settings.sitesToVisit}
                        onChange={(e) => handleSettingChange('sitesToVisit', parseInt(e.target.value))}
                        min="1"
                        disabled={!isHost}
                    />
                  </div>
                  <div className="popup-buttons">
                    <button onClick={() => setShowSettings(false)}>Back</button>
                    <button onClick={() => { setShowSettings(false); updatePartySettings(settings); }}>Confirmer</button>
                  </div>
                </div>
              </div>
          )}

          {showArtifactDescription && selectedArtifact && (
              <div className="popup-overlay">
                <div className="popup-content artifact-description">
                  <h2>{selectedArtifact.name}</h2>
                  <p>{selectedArtifact.description}</p>
                  <p className={`artifact-type ${selectedArtifact.type}`}>
                    Type: {selectedArtifact.type === 'positive' ? 'Positif' : 'Négatif'}
                  </p>
                  <div className="popup-buttons">
                    <button onClick={() => setShowArtifactDescription(false)}>Fermer</button>
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>
  );
};

export default Lobby;