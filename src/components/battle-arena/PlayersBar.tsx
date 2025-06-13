import React, { useState, useMemo } from 'react';
import { BattleCategory, CATEGORY_EMOJIS } from '../../constants/battleConstants';
import DroppablePlayer from './DroppablePlayer';
import DraggableSkill from './DraggableSkill';
import { Skill } from './DraggableSkill';

interface PlayersBarProps {
  connectedUsers: string[];
  currentUserEmail: string | undefined;
  playerScores: Record<string, number>;
  userCharCounts: Record<string, number>;
  availableSkills: Skill[];
  selectedTopics: BattleCategory[];
  onUseSkill: (skillName: string, targetEmail: string) => void;
}

// Temporary function to simulate extra players if needed
// const generateExtraPlayers = (count: number, existingUsers: string[]) => {
  // const possiblePlayers = [
  //   'player1@example.com',
  //   'player2@example.com',
  //   'player3@example.com',
  //   'player4@example.com',
  //   'coolgamer5@example.com',
  //   'prodev6@example.com',
  //   'ninja7@example.com',
  //   'coder8@example.com',
  //   'dev9@example.com',
  //   'user10@example.com',
  //   'gamer11@example.com',
  //   'challenger12@example.com',
  //   'warrior13@example.com',
  //   'expert14@example.com',
  //   'wizard15@example.com',
  //   'master16@example.com',
  //   'hacker17@example.com',
  //   'coder18@example.com',
  //   'programmer19@example.com',
  // ];
  
  // Filter out already connected users
  // const availablePlayers = possiblePlayers.filter(p => !existingUsers.includes(p));
  
  // Return the requested number of players or all available if count is greater
//   return availablePlayers.slice(0, Math.min(count, availablePlayers.length));
// };

// Custom CSS for the component
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    height: 6px;
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(30, 41, 59, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(94, 108, 145, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(129, 140, 248, 0.6);
  }
`;

const PlayersBar: React.FC<PlayersBarProps> = ({
  connectedUsers,
  currentUserEmail,
  playerScores,
  userCharCounts,
  availableSkills,
  selectedTopics,
  onUseSkill
}) => {
  const [displayMode, setDisplayMode] = useState<'scroll' | 'grid'>('grid');
  // const minDesiredPlayers = 20; // Minimum number of players to show
  
  // Combine real users with simulated users if needed
  // const extraPlayersNeeded = Math.max(0, minDesiredPlayers - connectedUsers.length);
  // const extraPlayers = generateExtraPlayers(extraPlayersNeeded, connectedUsers);
  
  // Combine real users with extra simulated users
  // const allUsers = [...connectedUsers, ...extraPlayers];
  
  // Get character count for a user (only real users have counts)
  const getCharCount = (email: string): number => {
    return userCharCounts[email] || 0;
  };
  
  // Always show the current user first, then other connected users
  const sortedUsers = [...connectedUsers].sort((a, b) => {
    // Current user always first
    if (a === currentUserEmail) return -1;
    if (b === currentUserEmail) return 1;
    
    // Otherwise alphabetical
    return a.localeCompare(b);
  });

  return (
    <>
      {/* Inject custom scrollbar styles */}
      <style>{scrollbarStyles}</style>
      
      <div className="bg-gray-800/70 p-3 rounded-lg mb-4">
        <div className="flex flex-col w-full">
          {/* Header with player count and toggle buttons */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <h3 className="text-base font-medium text-white">
                Warriors: ({connectedUsers.length} connected)
              </h3>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setDisplayMode('scroll')}
                className={`text-xs px-2 py-1 rounded ${
                  displayMode === 'scroll' 
                    ? 'bg-indigo-700/70 text-white' 
                    : 'bg-gray-700/50 text-gray-400 hover:text-white'
                }`}
              >
                Scroll View
              </button>
              <button
                onClick={() => setDisplayMode('grid')}
                className={`text-xs px-2 py-1 rounded ${
                  displayMode === 'grid' 
                    ? 'bg-indigo-700/70 text-white' 
                    : 'bg-gray-700/50 text-gray-400 hover:text-white'
                }`}
              >
                Grid View
              </button>
            </div>
          </div>
          
          {/* Players display area */}
          {displayMode === 'scroll' ? (
            <div className="players-scroll-container custom-scrollbar w-full overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex space-x-2 min-w-max">
                {sortedUsers.map((email, index) => (
                  <DroppablePlayer
                    key={index}
                    email={email}
                    isCurrentUser={email === currentUserEmail}
                    onSkillDrop={(skill, targetEmail) => onUseSkill(skill.name, targetEmail)}
                    score={playerScores[email] || 0}
                    charCount={getCharCount(email)}
                    isSimulated={!connectedUsers.includes(email)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="players-grid w-full">
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[180px] custom-scrollbar overflow-y-auto p-1">
                {sortedUsers.map((email, index) => (
                  <DroppablePlayer
                    key={index}
                    email={email}
                    isCurrentUser={email === currentUserEmail}
                    onSkillDrop={(skill, targetEmail) => onUseSkill(skill.name, targetEmail)}
                    score={playerScores[email] || 0}
                    charCount={getCharCount(email)}
                    isSimulated={!connectedUsers.includes(email)}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Skills and topics info */}
          <div className="flex flex-wrap justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-gray-300 text-sm">Your Skills:</span>
              <div className="flex flex-wrap gap-1">
                {availableSkills.map((skill, index) => (
                  <DraggableSkill 
                    key={index} 
                    skill={skill} 
                    isAvailable={skill.available}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center flex-wrap gap-1 mt-2 sm:mt-0">
              <span className="text-gray-300 text-sm mr-1">Topics:</span>
              {selectedTopics.map((topic, index) => (
                <div key={index} className="bg-gray-700/60 text-white px-2 py-0.5 rounded text-xs flex items-center">
                  <span className="mr-1">{CATEGORY_EMOJIS[topic]}</span> {topic}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayersBar; 