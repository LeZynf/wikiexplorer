import React from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../services/socket';
import './GameOverOverlay.css';

interface PlayerStat {
  name: string;
  completedObjectives: number;
  isWinner: boolean;
  visitedPages: number;
}

interface GameOverOverlayProps {
  winner: string;
  playerStats: PlayerStat[];
  partyCode: string;
}

const GameOverOverlay: React.FC<GameOverOverlayProps> = ({ winner, playerStats, partyCode }) => {
  const navigate = useNavigate();

  const handleQuit = () => {
    navigate('/');
  };

  const handleRestart = () => {
    socket.emit('restartGame', { oldPartyCode: partyCode });
  };

  // Classes pour les médailles
  const medalClasses = ['gold-medal', 'silver-medal', 'bronze-medal'];

  return (
    <div className="game-over-overlay">
      <div className="game-over-content">
        <h1>Partie terminée !</h1>
        <h2>🏆 {winner} a gagné ! 🏆</h2>

        <div className="podium-container">
          <h3>Classement</h3>
          <div className="podium">
            {playerStats.map((player, index) => (
              <div 
                key={player.name} 
                className={`podium-player ${index < 3 ? medalClasses[index] : ''}`}
              >
                <div className="podium-position">{index + 1}</div>
                <div className="podium-player-name">{player.name}</div>
                <div className="podium-stats">
                  <div><strong>Objectifs:</strong> {player.completedObjectives}</div>
                  <div><strong>Pages visitées:</strong> {player.visitedPages}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="game-over-buttons">
          <button className="quit-button" onClick={handleQuit}>
            Quitter
          </button>
          <button className="restart-button" onClick={handleRestart}>
            Recommencer
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverOverlay;