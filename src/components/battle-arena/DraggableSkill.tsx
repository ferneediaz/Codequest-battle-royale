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
                ? 'bg-gradient-to-br from-blue-500 to-blue-800 text-white hover:from-blue-400 hover:to-blue-700 hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]' 
                : 'bg-gradient-to-br from-fuchsia-500 to-purple-800 text-white hover:from-fuchsia-400 hover:to-purple-700 hover:shadow-[0_0_15px_rgba(217,70,239,0.6)]'
            } hover:scale-110 hover:-translate-y-1` 
          : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
        } 
        ${isDragging 
          ? 'scale-90 opacity-50 ring-2 ring-offset-2 ' + 
            (skill.name === 'Freeze' ? 'ring-blue-300 ring-offset-blue-100' : 'ring-fuchsia-300 ring-offset-fuchsia-100')
          : 'opacity-100'
        }
        ${!isAvailable ? '' : 'hover:ring-2 hover:ring-offset-1 ' + 
          (skill.name === 'Freeze' ? 'hover:ring-blue-300' : 'hover:ring-fuchsia-300')
        }
        border ${isAvailable ? (skill.name === 'Freeze' ? 'border-blue-300' : 'border-fuchsia-300') : 'border-gray-600'}
      `}
    >
      {/* Skill content */}
      <div className={`
        text-2xl mb-1 transform transition-transform group-hover:scale-110 duration-300
        ${isDragging ? 'animate-bounce' : ''}
      `}>
        {skill.icon}
      </div>
      <div className="text-[11px] font-bold text-shadow-sm">{skill.name}</div>

      {/* Skill effect indicator */}
      <div className={`
        absolute -right-1 -top-1 w-3 h-3 rounded-full
        transition-all duration-300
        ${isAvailable 
          ? skill.name === 'Freeze'
            ? 'bg-blue-300 animate-pulse'
            : 'bg-fuchsia-300 animate-pulse'
          : 'bg-gray-500'
        }
      `} />

      {/* Hover effect ring */}
      <div className={`
        absolute inset-0 rounded-lg
        transition-all duration-300 opacity-0 group-hover:opacity-100
        ${skill.name === 'Freeze'
          ? 'bg-blue-300/20 animate-pulse'
          : 'bg-fuchsia-300/20 animate-pulse'
        }
      `} />

      {/* Add a subtle shadow for text readability */}
      <div className="absolute inset-0 bg-black/10 rounded-lg"></div>
    </div>
  );
};

export default DraggableSkill; 