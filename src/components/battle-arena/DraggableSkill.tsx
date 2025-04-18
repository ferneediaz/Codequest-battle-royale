import React from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants/battleConstants';

export interface Skill {
  name: string;
  icon: string;
  available: boolean;
}

interface DraggableSkillProps {
  skill: Skill;
  isAvailable: boolean;
}

const DraggableSkill: React.FC<DraggableSkillProps> = ({ skill, isAvailable }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.SKILL,
    item: { skill },
    canDrag: isAvailable,
    collect: (monitor: any) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  return (
    <div
      ref={drag}
      className={`p-2 rounded-lg text-center cursor-grab transition-all transform ${
        isAvailable 
          ? 'bg-gradient-to-br from-indigo-700 to-purple-800 text-white hover:from-indigo-600 hover:to-purple-700 hover:scale-110' 
          : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
      } ${isDragging ? 'opacity-30 scale-90' : 'opacity-100'}`}
      style={{ width: '60px', height: '60px' }}
    >
      <div className="text-2xl mb-1">{skill.icon}</div>
      <div className="text-xs font-medium">{skill.name}</div>
    </div>
  );
};

export default DraggableSkill; 