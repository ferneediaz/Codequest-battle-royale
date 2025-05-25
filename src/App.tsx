import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import BattleArena from './pages/BattleArena';
import GameSetupPage from './pages/GameSetupPage';
import JoinRoom from './pages/JoinRoom';
import JoinPage from './pages/JoinPage';
import { AuthProvider } from './contexts/AuthContext';
import { initializeAppServices } from './lib/initServices';
import { debugState } from './config/debugManager';

const App = () => {
  useEffect(() => {
    // Initialize all services on app startup
    initializeAppServices().catch(err => {
      console.error('Failed to initialize services:', err);
    });
  }, []);

  useEffect(() => {
    // Initialize debug mode
    try {
      debugState.initialize();
      console.log(`Debug mode is ${debugState.isEnabled() ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to initialize debug mode:', error);
    }
  }, []);

  return (
    <AuthProvider>
      <Router>
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