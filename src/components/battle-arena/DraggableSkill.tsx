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
      className={`
        group relative w-[70px] h-[70px] p-2 
        rounded-lg text-center cursor-grab 
        flex flex-col justify-center items-center 
        transition-all duration-300 ease-out
        ${isAvailable 
          ? `${
              skill.name === 'Freeze' 
                ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white hover:from-blue-300 hover:to-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                : 'bg-gradient-to-br from-indigo-700 to-purple-800 text-white hover:from-indigo-600 hover:to-purple-700 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]'
            } hover:scale-110 hover:-translate-y-1` 
          : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
        } 
        ${isDragging 
          ? 'scale-90 opacity-50 ring-2 ring-offset-2 ' + 
            (skill.name === 'Freeze' ? 'ring-blue-400 ring-offset-blue-100' : 'ring-indigo-400 ring-offset-indigo-100')
          : 'opacity-100'
        }
        ${!isAvailable ? '' : 'hover:ring-2 hover:ring-offset-1 ' + 
          (skill.name === 'Freeze' ? 'hover:ring-blue-300' : 'hover:ring-indigo-300')
        }
      `}
    >
      {/* Skill content */}
      <div className={`
        text-2xl mb-1 transform transition-transform group-hover:scale-110 duration-300
        ${isDragging ? 'animate-bounce' : ''}
      `}>
        {skill.icon}
      </div>
      <div className="text-[10px] font-medium">{skill.name}</div>

      {/* Skill effect indicator */}
      <div className={`
        absolute -right-1 -top-1 w-3 h-3 rounded-full
        transition-all duration-300
        ${isAvailable 
          ? skill.name === 'Freeze'
            ? 'bg-blue-400 animate-pulse'
            : 'bg-indigo-400 animate-pulse'
          : 'bg-gray-500'
        }
      `} />

      {/* Hover effect ring */}
      <div className={`
        absolute inset-0 rounded-lg
        transition-all duration-300 opacity-0 group-hover:opacity-100
        ${skill.name === 'Freeze'
          ? 'bg-blue-400/10 animate-pulse'
          : 'bg-indigo-400/10 animate-pulse'
        }
      `} />
    </div>
  );
};

export default DraggableSkill; 