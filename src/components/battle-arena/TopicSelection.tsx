import React from 'react';
import { Button } from "@/components/ui/button";
import { BattleCategory, BATTLE_CATEGORIES, CATEGORY_EMOJIS } from '../../constants/battleConstants';

interface TopicSelectionProps {
  selectedTopics: BattleCategory[];
  onTopicSelect: (topic: BattleCategory) => void;
  onCompleteSelection: () => void;
}

const TopicSelection: React.FC<TopicSelectionProps> = ({
  selectedTopics,
  onTopicSelect,
  onCompleteSelection
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-white mb-2">Choose Your Battle Grounds</h2>
      <p className="text-slate-300 mb-4">
        Select 2 topics for the first round. These will be the algorithms you can choose to solve.
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {BATTLE_CATEGORIES.map((topic) => (
          <div
            key={topic}
            onClick={() => onTopicSelect(topic)}
            className={`
              p-3 rounded-lg cursor-pointer transition-all transform hover:scale-105
              ${selectedTopics.includes(topic) 
                ? 'bg-indigo-700 border-2 border-indigo-300' 
                : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'}
            `}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">{CATEGORY_EMOJIS[topic]}</div>
              <div className="text-sm font-medium text-white">{topic}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mt-6">
        <Button
          disabled={selectedTopics.length !== 2}
          className={`px-8 py-3 rounded-lg shadow-lg flex items-center justify-center
            ${selectedTopics.length === 2
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
          `}
          onClick={onCompleteSelection}
        >
          Ready for Battle
          {selectedTopics.length === 2 && (
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </Button>
      </div>
      
      {selectedTopics.length > 0 && (
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          <h3 className="text-white font-medium">Selected Topics:</h3>
          <div className="flex gap-2 justify-center mt-2">
            {selectedTopics.map((topic, index) => (
              <span key={index} className="bg-indigo-900/60 text-indigo-100 px-3 py-1 rounded-full text-sm flex items-center">
                {CATEGORY_EMOJIS[topic]} {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicSelection; 