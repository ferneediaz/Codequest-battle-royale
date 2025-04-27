import React from 'react';

interface ConnectedWarriorsProps {
  connectedUsers: string[];
  userEmail: string | undefined;
  readyUsers: string[];
  isTopicSelectionComplete: boolean; 
  playerCount: number;
}

const ConnectedWarriors: React.FC<ConnectedWarriorsProps> = ({
  connectedUsers,
  userEmail,
  readyUsers,
  isTopicSelectionComplete,
  playerCount
}) => {
  return (
    <div>
      <div className="mb-6 text-center">
        <div className="text-5xl font-bold text-white mb-2">{playerCount}</div>
        <p className="text-slate-400 text-xl">Warriors Present</p>
        {playerCount <= 1 && (
          <p className="text-yellow-500 mt-2 text-sm">Waiting for more warriors to join the battle...</p>
        )}
      </div>
      
      {/* Connected users display */}
      <div className="mb-6 bg-gray-800/50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-2">Connected Warriors</h3>
        {connectedUsers.length > 0 ? (
          <ul className="text-left space-y-1 max-h-40 overflow-y-auto">
            {connectedUsers.map((email, index) => {
              // Never show a user as ready unless they've explicitly clicked the Ready button
              const isMyUserEmail = email === userEmail;
              const isUserReady = isMyUserEmail 
                ? isTopicSelectionComplete // Local state for current user
                : readyUsers.includes(email); // Database state for other users
              
              return (
                <li key={index} className="text-slate-300 flex items-center">
                  <span className={`w-2 h-2 ${isUserReady ? 'bg-green-500' : 'bg-yellow-500'} rounded-full mr-2`}></span>
                  {email}
                  {isMyUserEmail && (
                    <span className="ml-2 text-xs text-green-500">(you)</span>
                  )}
                  {isUserReady ? (
                    <span className="ml-2 text-xs text-green-500">Ready</span>
                  ) : (
                    <span className="ml-2 text-xs text-yellow-500">Not Ready</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-slate-400 text-sm">No warriors connected</p>
        )}
      </div>
    </div>
  );
};

export default ConnectedWarriors; 