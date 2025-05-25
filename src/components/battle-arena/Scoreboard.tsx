import React from 'react';
import { getAvatarUrl } from '../../utils/battleUtils';
import { Bug } from 'lucide-react';
import { debugState } from '../../config/debugManager';

interface ScoreboardProps {
  connectedUsers: string[];
  playerScores: Record<string, number>;
  currentUserEmail: string | undefined;
  debugMsg: string;
  children?: React.ReactNode;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  connectedUsers,
  playerScores,
  currentUserEmail,
  debugMsg,
  children
}) => {
  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-gray-800/50 p-3 rounded-lg">
        <h3 className="text-sm font-medium text-white mb-2">Scoreboard</h3>
        <div className="space-y-1">
          {connectedUsers.map((email, index) => (
            <div key={index} className="flex justify-between items-center p-1 rounded hover:bg-gray-700/50">
              <div className="flex items-center">
                <img 
                  src={getAvatarUrl(email)} 
                  alt={`${email.split('@')[0]}'s avatar`} 
                  className="w-6 h-6 rounded-full mr-2"
                />
                <span className="text-gray-300 text-sm">{email.split('@')[0]}</span>
                {email === currentUserEmail && (
                  <span className="ml-1 text-xs text-green-500">(you)</span>
                )}
              </div>
              <div className="flex items-center">
                <span className="font-mono text-amber-400 text-sm mr-1">{email && playerScores[email] ? playerScores[email] : 0}</span>
                <span className="text-xs text-gray-400">solved</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-800/50 p-3 rounded-lg">
        <h3 className="text-sm font-medium text-white mb-2">Battle Info</h3>
        <p className="text-xs text-gray-400 mb-1">
          Drag skills onto other players to use them! Win points by solving problems quickly.
        </p>
        <p className="text-xs text-gray-400">
          {debugMsg || "Battle in progress..."}
        </p>
        
        {/* Development mode indicator */}
        {children}
        
        {/* Debug panel - only visible in debug mode */}
        {debugState.isEnabled() && debugMsg && (
          <div className="mt-2 text-xs bg-indigo-900/20 border border-indigo-700 p-2 rounded-md">
            <div className="flex items-center text-indigo-400 mb-1">
              <Bug className="h-3 w-3 mr-1" />
              <span className="font-medium">Debug Data:</span>
            </div>
            <div className="text-indigo-200">{debugMsg}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scoreboard; 