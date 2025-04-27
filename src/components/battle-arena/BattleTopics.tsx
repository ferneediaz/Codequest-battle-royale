import React from 'react';
import { BattleCategory, CATEGORY_EMOJIS } from '../../constants/battleConstants';
import { Button } from "@/components/ui/button";

interface BattleTopicsProps {
  selectedTopics: BattleCategory[];
  readyUsers: string[];
  connectedUsers: string[];
  userEmail: string | undefined;
  onChangeTopics: () => void;
  onEnterBattleRoom: () => void;
}

const BattleTopics: React.FC<BattleTopicsProps> = ({
  selectedTopics,
  readyUsers,
  connectedUsers,
  userEmail,
  onChangeTopics,
  onEnterBattleRoom
}) => {
  return (
    <div className="mb-6 bg-indigo-900/30 p-4 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-2">Your Battle Topics</h3>
      <div className="flex gap-3 justify-center">
        {selectedTopics.map((topic, index) => (
          <div key={index} className="bg-indigo-800/60 text-white px-4 py-2 rounded-lg flex items-center">
            <span className="text-xl mr-2">{CATEGORY_EMOJIS[topic]}</span> {topic}
          </div>
        ))}
      </div>
      
      <p className="text-indigo-200 mt-4">
        {readyUsers.length === connectedUsers.length && connectedUsers.length > 1 
          ? "All warriors are ready! Preparing battle room..." 
          : `Waiting for other warriors to ready up... (${readyUsers.length}/${connectedUsers.length})`}
      </p>
      
      {connectedUsers.length > 0 && (
        <div className="mt-4 text-sm text-indigo-200">
          <p>Ready warriors: {readyUsers.map(email => email.split('@')[0]).join(', ') || 'None'}</p>
          <p>Your status: {readyUsers.includes(userEmail || '') ? 'Ready' : 'Not ready'}</p>
          
          <div className="flex justify-center mt-3">
            <Button
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs px-3 py-1"
              onClick={onChangeTopics}
            >
              Change Topics
            </Button>
          </div>
        </div>
      )}
      
      {readyUsers.length === connectedUsers.length && connectedUsers.length > 1 && (
        <div className="mt-4">
          <div className="animate-pulse text-green-400 text-xl font-bold">Battle starting...</div>
          <Button
            className="mt-4 bg-green-600 hover:bg-green-700 text-white"
            onClick={onEnterBattleRoom}
          >
            Enter Battle Room
          </Button>
        </div>
      )}
    </div>
  );
};

export default BattleTopics; 