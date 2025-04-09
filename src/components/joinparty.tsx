import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './joinparty.css';

interface JoinPartyProps {
  onBack: () => void;
}

function JoinParty({ onBack }: JoinPartyProps) {
  const [partyCode, setPartyCode] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [isChoosingPseudo, setIsChoosingPseudo] = useState(true); // Etat pour afficher le pop-up pour choisir le pseudo
  const navigate = useNavigate(); // Utilisation de useNavigate pour rediriger

  // Fonction pour gérer le changement de pseudo
  const handlePseudoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPseudo(e.target.value);
  };

  // Fonction pour rejoindre la partie
  const handleJoin = async () => {
    if (!pseudo) {
      alert("Veuillez entrer un pseudo");
      return;
    }
  
    if (!partyCode || partyCode.length !== 6) {
      alert("Veuillez entrer un code de partie valide à 6 chiffres.");
      return;
    }
  
    const response = await fetch(`http://localhost:5000/join-party`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partyCode: partyCode,  // Ici on envoie "partyCode" au lieu de "code"
        playerName: pseudo,
      }),
    });
  
    const data = await response.json();
  
    if (data.success) {
      // Stocker le pseudo dans localStorage pour qu'il soit accessible dans le Lobby
      localStorage.setItem('playerName', pseudo);
      
      // Redirection vers le lobby avec le code de la partie
      navigate(`/lobby/${partyCode}`, { state: { playerName: pseudo } });
    } else {
      alert("Erreur : impossible de rejoindre la partie.");
    }
  };
  
  return (
    <div>
      <h1 className="GameName">WikiExplorer</h1>
      
      {/* Affichage du pop-up pour choisir un pseudo */}
      {isChoosingPseudo ? (
        <div className="pseudo-modal">
          <div className="pseudo-modal-content">
            <h2>Entrez votre pseudo</h2>
            <input
              type="text"
              placeholder="Entrez votre pseudo"
              value={pseudo}
              onChange={handlePseudoChange}
            />
            <button
              onClick={() => setIsChoosingPseudo(false)}
              disabled={!pseudo}
            >
              Valider
            </button>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <tbody>
              <tr>
                <td>
                  <label htmlFor="PartyCode" className='partycode'>Party Code</label>
                </td>
              </tr>
              <tr>
                <td>
                  <input
                    id='PartyCode'
                    className='partynumber'
                    type="text"
                    placeholder="000000"
                    pattern="\d{6}"
                    title="Please enter a 6 digit code"
                    maxLength={6}
                    value={partyCode}
                    onChange={(e) => setPartyCode(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <button onClick={handleJoin}>Join</button>
                </td>
              </tr>
              <tr>
                <td>
                  <button onClick={onBack}>Back</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default JoinParty;
