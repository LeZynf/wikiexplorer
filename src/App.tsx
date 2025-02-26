
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Accueil from './component/accueil';
import JoinParty from './component/joinparty';
import Lobby from './component/lobby';
import { useParams as useReactRouterParams } from 'react-router-dom';


function App() {
  function useParams() {
    return useReactRouterParams();
  }
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/join-party" element={<JoinParty onBack={() => { /* handle back action */ }} />} />
        <Route path="/lobby/:partyCode" element={<Lobby />} />
        <Route path="/lobby" element={<Lobby />} />
      </Routes>
    </Router>
  );
}

export default App;
