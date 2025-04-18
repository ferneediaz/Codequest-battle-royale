import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

const Header: React.FC = () => {
  const { user, signIn, signOut, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="w-full bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 py-3 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo and navigation */}
        <div className="flex items-center">
          <div className="h-10 w-10" onClick={() => navigate('/')}>
            <Logo />
          </div>
          <nav className="ml-6 hidden md:block">
            <ul className="flex space-x-4">
              <li>
                <Button variant="link" className="text-slate-300 hover:text-white" onClick={() => navigate('/')}>
                  Home
                </Button>
              </li>
              <li>
                <Button variant="link" className="text-slate-300 hover:text-white" onClick={() => navigate('/battle')}>
                  Battle Arena
                </Button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Auth buttons */}
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-slate-700 animate-pulse" />
          ) : user ? (
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
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 text-slate-300 hover:bg-gray-800"
                onClick={() => signIn('github')}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 text-slate-300 hover:bg-gray-800"
                onClick={() => signIn('google')}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z" />
                </svg>
                Google
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 