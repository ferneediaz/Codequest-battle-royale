import React from 'react';
import { BattleState } from '../../constants/battleConstants';
import CodeQuestLogo from '../CodeQuestLogo';

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
      <CodeQuestLogo iconSize={8} titleClassName="text-3xl font-bold text-white mb-4" />
    );
  }

  // Battle room header with timer
  return (
    <div className="flex justify-between items-center mb-4">
      <CodeQuestLogo iconSize={6} titleClassName="text-2xl font-bold text-white" />
      <div className="text-2xl font-mono font-bold text-amber-400">{timeRemaining}</div>
    </div>
  );
};

export default BattleHeader; 