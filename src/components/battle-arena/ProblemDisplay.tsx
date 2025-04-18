import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeProblem } from '../../services/problemService';

interface ProblemDisplayProps {
  currentQuestion: CodeProblem | null;
  onBackToList: () => void;
}

const ProblemDisplay: React.FC<ProblemDisplayProps> = ({
  currentQuestion,
  onBackToList
}) => {
  return (
    <Card className="bg-gray-800 p-4 overflow-y-auto h-[600px]">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2 text-gray-400 hover:text-white"
            onClick={onBackToList}
          >
            ← Back
          </Button>
          <h2 className="text-xl font-bold text-white">{currentQuestion?.title}</h2>
        </div>
        <Badge className={
          currentQuestion?.difficulty === 'easy' ? 'bg-green-600' : 
          currentQuestion?.difficulty === 'medium' ? 'bg-yellow-600' : 
          'bg-red-600'
        }>
          {currentQuestion?.difficulty.toUpperCase()}
        </Badge>
      </div>
      
      <div className="prose prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ 
          __html: currentQuestion?.description.replace(/\n/g, '<br>').replace(/`([^`]+)`/g, '<code>$1</code>') || ''
        }} />
      </div>
      
      {/* Examples */}
      {currentQuestion?.examples && currentQuestion.examples.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium text-white mb-2">Examples</h3>
          <div className="space-y-3">
            {currentQuestion.examples.map((example, index) => (
              <div key={index} className="bg-gray-900 p-3 rounded-md">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">{example}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Constraints */}
      {currentQuestion?.constraints && currentQuestion.constraints.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium text-white mb-2">Constraints</h3>
          <ul className="list-disc pl-5 space-y-1">
            {currentQuestion.constraints.map((constraint, index) => (
              <li key={index} className="text-sm text-gray-300">{constraint}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default ProblemDisplay; 