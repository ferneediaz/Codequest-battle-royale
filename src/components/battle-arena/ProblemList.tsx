import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BattleCategory, CATEGORY_EMOJIS } from '../../constants/battleConstants';
import { CodeProblem } from '../../services/problemService';
import { CheckCircle } from 'lucide-react';

interface ProblemListProps {
  selectedTopics: BattleCategory[];
  availableQuestions: CodeProblem[];
  activeTopicFilter: string | null;
  setActiveTopicFilter: (filter: string | null) => void;
  onSelectQuestion: (problem: CodeProblem) => void;
  onRandomChallenge: () => void;
  getFilteredQuestions: () => CodeProblem[];
  completedQuestions?: string[];
  currentUserEmail?: string;
}

const ProblemList: React.FC<ProblemListProps> = ({
  selectedTopics,
  availableQuestions,
  activeTopicFilter,
  setActiveTopicFilter,
  onSelectQuestion,
  onRandomChallenge,
  getFilteredQuestions,
  completedQuestions = [],
  currentUserEmail
}) => {
  const isQuestionCompleted = (questionId: string) => {
    return completedQuestions.includes(questionId);
  };

  return (
    <Card className="bg-gray-800 p-4 overflow-y-auto h-[600px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Select a Challenge</h2>
        <div className="flex gap-2">
          {selectedTopics.map((topic, index) => (
            <div key={index} className="bg-indigo-800/60 text-white px-2 py-1 rounded text-xs flex items-center">
              <span className="mr-1">{CATEGORY_EMOJIS[topic]}</span> {topic}
            </div>
          ))}
        </div>
      </div>
      
      {/* Topic tabs if there are more than one topic */}
      {selectedTopics.length > 1 && (
        <div className="flex border-b border-gray-700 mb-4">
          <button
            className={`px-3 py-2 text-sm font-medium border-b-2 ${
              !activeTopicFilter 
                ? 'text-white border-indigo-500' 
                : 'text-gray-400 hover:text-white border-transparent hover:border-gray-700'
            }`}
            onClick={() => setActiveTopicFilter(null)}
          >
            All Questions
          </button>
          {selectedTopics.map((topic) => (
            <button
              key={topic}
              className={`px-3 py-2 text-sm font-medium border-b-2 ${
                activeTopicFilter === topic 
                  ? 'text-white border-indigo-500' 
                  : 'text-gray-400 hover:text-white border-transparent hover:border-gray-700'
              }`}
              onClick={() => setActiveTopicFilter(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      )}
      
      {/* Questions list */}
      <div className="space-y-3">
        {availableQuestions.length > 0 ? (
          getFilteredQuestions().map((question, index) => {
            const completed = isQuestionCompleted(question.id);
            
            return (
              <div 
                key={index}
                className={`bg-gray-800 border border-gray-700 rounded-lg p-3 transition-colors ${
                  completed 
                    ? 'border-green-600 bg-green-900/20' 
                    : 'hover:bg-gray-700 hover:border-indigo-500 cursor-pointer'
                }`}
                onClick={() => !completed && onSelectQuestion(question)}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <h3 className="text-base font-medium text-white">{question.title}</h3>
                    {completed && (
                      <div className="ml-2 flex items-center text-green-500">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-xs">Completed</span>
                      </div>
                    )}
                  </div>
                  <Badge className={
                    question.difficulty === 'easy' ? 'bg-green-600' : 
                    question.difficulty === 'medium' ? 'bg-yellow-600' : 
                    'bg-red-600'
                  }>
                    {question.difficulty.toUpperCase()}
                  </Badge>
                </div>
                <p className={`text-xs ${completed ? 'text-gray-400' : 'text-gray-300'} line-clamp-2`}>
                  {question.description.replace(/<[^>]*>/g, ' ')}
                </p>
                <div className="mt-2 text-xs text-gray-400">
                  Category: {question.category}
                </div>
              </div>
            );
          })
        ) :
          <div className="text-center py-8">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-gray-400">Loading available challenges...</p>
            {/* Auto-retry loading instead of requiring user to click */}
            <p className="text-sm text-gray-500 mt-2">Attempting to load questions automatically...</p>
          </div>
        }
        
        {availableQuestions.length > 0 && getFilteredQuestions().length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">🧩</div>
            <p className="text-gray-400">No questions found for {activeTopicFilter}</p>
            <Button
              onClick={() => setActiveTopicFilter(null)}
              className="mt-4 bg-indigo-700 hover:bg-indigo-800"
            >
              Show All Questions
            </Button>
          </div>
        )}
      </div>
      
      {/* Random question option */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          onClick={onRandomChallenge}
        >
          Random Challenge
        </Button>
      </div>
    </Card>
  );
};

export default ProblemList; 