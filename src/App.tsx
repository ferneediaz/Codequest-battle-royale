import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BattleArena from './pages/BattleArena';
import GameSetupPage from './pages/GameSetupPage';
import JoinRoom from './pages/JoinRoom';
import JoinPage from './pages/JoinPage';
import { AuthProvider } from './contexts/AuthContext';
import { initializeAppServices } from './lib/initServices';

const App = () => {
  useEffect(() => {
    // Initialize all services on app startup
    initializeAppServices().catch(err => {
      console.error('Failed to initialize services:', err);
    });
  }, []);

  return (
    <AuthProvider>
      <Router basename="/codequest-battle-royale">
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/create-game" element={<GameSetupPage />} />
              <Route path="/join" element={<JoinPage />} />
              <Route path="/join/:roomId" element={<JoinRoom />} />
              <Route path="/battle/:roomId" element={<BattleArena />} />
              <Route path="/battle" element={<BattleArena />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App; 