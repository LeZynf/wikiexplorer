
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Accueil from './component/accueil';
import JoinParty from './component/joinparty';
import Lobby from './component/lobby';
import WikiGame from './component/wikigame';
import { useParams as useReactRouterParams } from 'react-router-dom';
import SoloGame from "./component/sologame.tsx";

// Wrapper component to pass location state to Lobby
function LobbyWrapper() {
  const { partyCode } = useReactRouterParams<{ partyCode: string }>();
  const location = useLocation();
  const playerName = location.state?.playerName || localStorage.getItem('playerName') || '';
  
  return <Lobby partyCode={partyCode} playerName={playerName} />;
}

function App() {
  function useParams() {
    return useReactRouterParams();
  }
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/join-party" element={<JoinParty onBack={() => { /* handle back action */ }} />} />
        <Route path="/lobby/:partyCode" element={<LobbyWrapper />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/wikigame/:partyCode" element={<WikiGame />} />
        <Route path="/sologame" element={<SoloGame />} />
      </Routes>
    </Router>
  );
}

export default App;
