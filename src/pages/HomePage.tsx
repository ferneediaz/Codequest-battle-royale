import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import FloatingCodeBackground from '@/components/FloatingCodeBackground';
import { useAuth } from '../contexts/AuthContext';

// RPG-themed battle categories
const BATTLE_CATEGORIES = [
  "Forest of Arrays",
  "Hashmap Dungeons",
  "Binary Search Castle",
  "Linked List Gardens",
  "Tree of Wisdom",
  "Graph Adventures",
  "Dynamic Programming Peaks",
  "Stack & Queue Tavern",
  "String Sorcery",
  "Sorting Sanctuary",
] as const;

// RPG-themed emoji mapping
const categoryEmojis: Record<string, string> = {
  "Forest of Arrays": "🌲",
  "Hashmap Dungeons": "🗝️",
  "Binary Search Castle": "🏰",
  "Linked List Gardens": "⛓️",
  "Tree of Wisdom": "🌳",
  "Graph Adventures": "🗺️",
  "Dynamic Programming Peaks": "⛰️",
  "Stack & Queue Tavern": "🍺",
  "String Sorcery": "✨",
  "Sorting Sanctuary": "⚔️",
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user, signIn, signOut } = useAuth();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 relative">
      {/* Floating Code Background */}
      <FloatingCodeBackground opacity={0.2} />

      {/* Magical Aura */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 animate-pulse" />

      {/* Header */}
      {user && (
        <header className="w-full bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 py-3 px-4 relative z-[100]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="h-10 w-10 cursor-pointer" onClick={() => navigate('/')}>
              <Logo />
            </div>
            <div className="flex items-center">
              <span className="text-slate-300 mr-3">{user.email}</span>
              <Button 
                variant="outline" 
                size="sm"
                className="border-gray-700 text-slate-300 hover:bg-gray-800"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div className="relative z-[100] max-w-6xl mx-auto px-4 py-12">
        <Logo />
        
        {/* Epic title with fantasy styling */}
        <div className="text-center mb-12 opacity-0 animate-fadeIn" style={{ animation: 'fadeIn 0.6s forwards' }}>
          <div className="mb-2">
            <span className="inline-block px-4 py-1 bg-indigo-900/40 rounded-full text-xs font-semibold text-indigo-300 border border-indigo-700/50">
              LEGENDARY EVENT
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 text-white tracking-tight">
            <span className="inline-block text-indigo-400 py-2">
              Algorithm Battle Royale
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Enter the mystical realm where code warriors battle for glory and eternal fame!
          </p>
        </div>

        {/* Ancient scroll/parchment-like card */}
        <div className="mb-16 opacity-0 animate-fadeIn" style={{ animation: 'fadeIn 0.6s 0.2s forwards' }}>
          <Card className="p-8 bg-slate-900/60 backdrop-blur-sm border-slate-700/30 shadow-xl overflow-hidden relative">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left side: Quest/Instructions */}
              <div className="flex-1">
                <Badge className="mb-3 bg-indigo-600 hover:bg-indigo-700 animate-pulse">ROYAL DECREE</Badge>
                <h2 className="text-3xl font-bold mb-6 text-white">The Ancient Rules</h2>
                <div className="space-y-4 text-slate-300">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-lg">I</div>
                    <p>Brave warriors face a new algorithmic trial each round.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-lg">II</div>
                    <p>Those with the fewest correct answers are banished from the realm.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-lg">III</div>
                    <p>The most skilled warrior shall choose the next battleground.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-lg">IV</div>
                    <p>The last coder standing claims the legendary prize!</p>
                  </div>
                </div>
              </div>
              
              {/* Right side: Legendary Realms */}
              <div className="flex-1 border-l border-indigo-700/30 pl-8">
                <h2 className="text-3xl font-bold mb-6 text-white">Mythical Realms</h2>
                <div className="grid grid-cols-2 gap-4">
                  {BATTLE_CATEGORIES.map((category, index) => (
                    <div key={index} className="rounded-lg bg-gradient-to-br from-slate-800 to-indigo-950 p-4 border border-indigo-700/30">
                      <span className="text-2xl">{categoryEmojis[category] || '🧙'}</span>
                      <h3 className="font-medium text-white mt-2 text-sm">{category}</h3>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Epic call-to-action */}
        <div className="text-center opacity-0 animate-fadeIn" style={{ animation: 'fadeIn 0.8s 0.4s forwards' }}>
          {/* Show battle button if logged in, otherwise show sign up button */}
          {user ? (
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-12 py-6 text-lg rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:scale-105 hover:shadow-xl relative overflow-hidden group border border-indigo-500/20"
              onClick={() => navigate('/battle')}
            >
              <span className="relative z-10">Join the Epic Quest</span>
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                <Button
                  size="lg"  
                  className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-8 py-5 text-lg rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:scale-105 hover:shadow-xl relative overflow-hidden group border border-indigo-500/20"
                  onClick={() => signIn('github')}
                >
                  <span className="relative z-10 flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    Sign Up with GitHub
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                </Button>
                <Button
                  size="lg"  
                  className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-8 py-5 text-lg rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:scale-105 hover:shadow-xl relative overflow-hidden group border border-indigo-500/20"
                  onClick={() => signIn('google')}
                >
                  <span className="relative z-10 flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z" />
                    </svg>
                    Sign Up with Google
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                </Button>
              </div>
            </div>
          )}
          
          <p className="mt-4 text-slate-400">
            The ancient tournament begins soon — prepare your spells and algorithms!
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 