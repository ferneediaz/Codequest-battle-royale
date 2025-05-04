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
  charCount?: number;
  isSimulated?: boolean;
}

const DroppablePlayer: React.FC<DroppablePlayerProps> = ({
  email,
  isCurrentUser,
  onSkillDrop,
  score = 0,
  charCount = 0,
  isSimulated = false
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
  // Shorten display name if it's too long
  const shortName = displayName.length > 8 
    ? displayName.substring(0, 7) + '...' 
    : displayName;

  // Format the character count (show k for thousands)
  const formattedCharCount = charCount > 999 
    ? `${(charCount / 1000).toFixed(1)}k` 
    : charCount.toString();

  // Determine whether to show the char count badge
  const showCharCount = !isSimulated && charCount > 0;

  return (
    <div 
      ref={drop} 
      className={`flex flex-col items-center rounded-lg transition-all ${
        isOver && !isCurrentUser ? 'ring-2 ring-yellow-400 bg-gray-700 scale-105' : ''
      } ${isCurrentUser ? 'border border-green-500/70' : 'border border-gray-700/30'} 
        min-w-[72px] max-w-[72px] p-2 hover:bg-gray-700/70
        ${isSimulated ? 'bg-gray-800/50 opacity-80' : 'bg-gray-800/90'}`}
    >
      <div className="relative">
        <img 
          src={avatarUrl} 
          alt={`${displayName}'s avatar`} 
          className={`w-9 h-9 rounded-full ${isSimulated ? 'opacity-70' : ''}`}
        />
        {showCharCount && (
          <div 
            className="absolute -top-1 -right-1 flex items-center justify-center text-[9px] rounded-full shadow-sm"
            title={`${charCount} characters typed`}
          >
            <div className="bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full">
              {formattedCharCount}
            </div>
          </div>
        )}
      </div>
      <div className="text-center mt-1 w-full">
        <div className={`text-[10px] font-medium truncate max-w-[64px] ${isSimulated ? 'text-gray-400' : 'text-white'}`} title={displayName}>
          {shortName}
        </div>
        {isCurrentUser && (
          <span className="text-[8px] text-green-400">(you)</span>
        )}
        {!isCurrentUser && !isOver && !isSimulated && (
          <span className="text-[8px] text-indigo-300">⚡Drop</span>
        )}
        {!isCurrentUser && isOver && !isSimulated && (
          <span className="text-[8px] text-yellow-300 animate-pulse">⚡Target</span>
        )}
        {isSimulated && (
          <span className="text-[8px] text-gray-500">simulated</span>
        )}
      </div>
    </div>
  );
};

export default DroppablePlayer; 