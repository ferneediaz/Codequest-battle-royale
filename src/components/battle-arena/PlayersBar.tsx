import React from 'react';
import { BattleCategory, CATEGORY_EMOJIS } from '../../constants/battleConstants';
import DroppablePlayer from './DroppablePlayer';
import DraggableSkill from './DraggableSkill';
import { Skill } from './DraggableSkill';

interface PlayersBarProps {
  connectedUsers: string[];
  currentUserEmail: string | undefined;
  playerScores: Record<string, number>;
  availableSkills: Skill[];
  selectedTopics: BattleCategory[];
  onUseSkill: (skillName: string, targetEmail: string) => void;
}

const PlayersBar: React.FC<PlayersBarProps> = ({
  connectedUsers,
  currentUserEmail,
  playerScores,
  availableSkills,
  selectedTopics,
  onUseSkill
}) => {
  return (
    <div className="bg-gray-800/70 p-3 rounded-lg mb-4 flex flex-wrap items-center justify-between">
      <div className="flex items-center space-x-4">
        <h3 className="text-base font-medium text-white">Warriors:</h3>
        <div className="flex space-x-3">
          {connectedUsers.map((email, index) => (
            <DroppablePlayer
              key={index}
              email={email}
              isCurrentUser={email === currentUserEmail}
              onSkillDrop={(skill, targetEmail) => onUseSkill(skill.name, targetEmail)}
              score={email && playerScores[email] ? playerScores[email] : 0}
            />
          ))}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <span className="text-gray-300 text-sm mr-2">Your Skills:</span>
          {availableSkills.map((skill, index) => (
            <DraggableSkill 
              key={index} 
              skill={skill} 
              isAvailable={skill.available}
            />
          ))}
        </div>
        
        <div className="flex items-center">
          <span className="text-gray-300 text-sm mr-2">Topics:</span>
          {selectedTopics.map((topic, index) => (
            <div key={index} className="bg-gray-700/60 text-white px-2 py-0.5 rounded text-xs flex items-center ml-1">
              <span className="mr-1">{CATEGORY_EMOJIS[topic]}</span> {topic}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayersBar; 