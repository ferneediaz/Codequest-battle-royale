import React from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../constants/battleConstants';
import { getAvatarUrl } from '../../utils/battleUtils';
import { Skill } from './DraggableSkill';

interface DroppablePlayerProps {
  email: string;
  isCurrentUser: boolean;
  onSkillDrop: (skill: Skill, targetEmail: string) => void;
  score?: number;
}

const DroppablePlayer: React.FC<DroppablePlayerProps> = ({
  email,
  isCurrentUser,
  onSkillDrop,
  score = 0
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.SKILL,
    drop: (item: { skill: Skill }) => {
      onSkillDrop(item.skill, email);
    },
    canDrop: () => !isCurrentUser,
    collect: (monitor: any) => ({
      isOver: !!monitor.isOver()
    })
  }));

  const displayName = email.split('@')[0];
  const avatarUrl = getAvatarUrl(email);

  return (
    <div 
      ref={drop} 
      className={`flex flex-col items-center bg-gray-800 p-3 rounded-lg transition-all ${
        isOver && !isCurrentUser ? 'ring-2 ring-yellow-400 bg-gray-700 scale-105' : ''
      } ${isCurrentUser ? 'border-2 border-green-500' : ''}`}
    >
      <div className="relative">
        <img 
          src={avatarUrl} 
          alt={`${displayName}'s avatar`} 
          className="w-12 h-12 rounded-full mb-1"
        />
        <div className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-indigo-600 text-white text-xs rounded-full">
          {score}
        </div>
      </div>
      <div className="text-center mt-1">
        <div className="text-white text-sm font-medium">{displayName}</div>
        {isCurrentUser && (
          <span className="text-xs text-green-500">(you)</span>
        )}
        {!isCurrentUser && (
          <div className="text-xs mt-1 text-gray-400 animate-pulse">
            Drop skill here
          </div>
        )}
      </div>
    </div>
  );
};

export default DroppablePlayer; 