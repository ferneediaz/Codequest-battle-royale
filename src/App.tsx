import HomePage from './pages/HomePage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BattleArena from './pages/BattleArena';
import { AuthProvider } from './contexts/AuthContext';

const App = () => {
  return (
    <AuthProvider>
      <Router basename="/codequest-battle-royale">
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/battle" element={<BattleArena />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App; 