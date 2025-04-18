import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { formatTime, getFreezeRemainingTime } from '../../utils/battleUtils';
import { Button } from "@/components/ui/button";
import { CodeProblem } from '../../services/problemService';
import { submissionService } from '../../services/submissionService';

interface CodeEditorProps {
  userCode: string;
  setUserCode: (code: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  timeRemaining: number;
  editorFrozen: boolean;
  editorFrozenEndTime: number | null;
  isQuestionSelected: boolean;
  currentQuestion: CodeProblem | null;
  onSubmitSolution: () => void;
  setDebugMsg: (msg: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  userCode,
  setUserCode,
  selectedLanguage,
  setSelectedLanguage,
  timeRemaining,
  editorFrozen,
  editorFrozenEndTime,
  isQuestionSelected,
  currentQuestion,
  onSubmitSolution,
  setDebugMsg
}) => {
  return (
    <div className="flex flex-col">
      <div className="bg-gray-800 px-4 py-2 text-gray-300 text-sm flex justify-between items-center rounded-t-lg">
        <div className="flex items-center">
          <span>solution.{selectedLanguage === 'javascript' ? 'js' : 'py'}</span>
          <select
            className="ml-4 bg-gray-700 text-white text-sm rounded px-2 py-1"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={editorFrozen || !isQuestionSelected}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </div>
        <span className="text-gray-500">Time: {formatTime(timeRemaining)}</span>
      </div>
      
      <div className="relative">
        {editorFrozen && (
          <div className="absolute inset-0 bg-blue-900/30 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center p-6 bg-gray-800/90 rounded-lg shadow-lg">
              <div className="text-4xl mb-2">❄️</div>
              <h3 className="text-xl font-bold text-white mb-1">Editor Frozen!</h3>
              <p className="text-blue-200">Unfreezing in {getFreezeRemainingTime(editorFrozenEndTime)} seconds...</p>
            </div>
          </div>
        )}
        
        {!isQuestionSelected && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center p-6 bg-gray-800/90 rounded-lg shadow-lg">
              <div className="text-4xl mb-2">👈</div>
              <h3 className="text-xl font-bold text-white mb-1">Select a challenge first</h3>
              <p className="text-gray-300">Choose a problem from the list to start coding</p>
            </div>
          </div>
        )}
        
        <div className="w-full h-[500px]" style={{ textAlign: 'left' }}>
          <CodeMirror
            value={userCode}
            height="500px"
            theme="dark"
            extensions={[selectedLanguage === 'javascript' ? javascript({ jsx: true }) : python()]}
            onChange={(value) => {
              if (!editorFrozen && isQuestionSelected) {
                setUserCode(value);
              }
            }}
            editable={!editorFrozen && isQuestionSelected}
            basicSetup={true}
          />
        </div>
      </div>
      
      <div className="bg-gray-800 p-3 flex justify-between rounded-b-lg">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-green-700/50 text-white hover:bg-green-800/30"
            disabled={editorFrozen || !isQuestionSelected}
            onClick={() => {
              // Run test cases
              if (currentQuestion) {
                const visibleTests = currentQuestion.testCases.filter(test => !test.isHidden);
                submissionService.runTestCases(
                  userCode, 
                  selectedLanguage,
                  visibleTests
                ).then(results => {
                  console.log('Test results:', results);
                  setDebugMsg(`${results.passed}/${results.total} tests passed`);
                }).catch(error => {
                  console.error('Error running tests:', error);
                  setDebugMsg('Error running tests');
                });
              }
            }}
          >
            Run Tests
          </Button>
        </div>
        <Button
          className="bg-indigo-700 hover:bg-indigo-800 text-white"
          disabled={editorFrozen || !isQuestionSelected}
          onClick={onSubmitSolution}
        >
          Submit Solution
        </Button>
      </div>
    </div>
  );
};

export default CodeEditor; 