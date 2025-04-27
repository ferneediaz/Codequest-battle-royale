import React from 'react';
import { BattleState } from '../../constants/battleConstants';

interface BattleHeaderProps {
  battleState: BattleState;
  timeRemaining: string;
}

const BattleHeader: React.FC<BattleHeaderProps> = ({ 
  battleState,
  timeRemaining 
}) => {
  // Render different headers based on the battle state
  if (battleState === 'topic_selection') {
    return (
      <h1 className="text-4xl font-bold text-white mb-4">Battle Arena</h1>
    );
  }

  // Battle room header with timer
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-3xl font-bold text-white">Battle in Progress</h1>
      <div className="text-2xl font-mono font-bold text-amber-400">{timeRemaining}</div>
    </div>
  );
};

export default BattleHeader; 