import React, { useState, useEffect } from 'react';
import { CodeProblem } from '../services/problemService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { Button } from '@/components/ui/button';
import { submissionService } from '../services/submissionService';
import ProblemDescription from './ProblemDescription';

interface ProblemDisplayProps {
  problem: CodeProblem;
  onSubmit?: (code: string, language: string) => void;
  isFrozen?: boolean;
}

const ProblemDisplay: React.FC<ProblemDisplayProps> = ({ 
  problem, 
  onSubmit,
  isFrozen = false
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [code, setCode] = useState<string>('');
  const [testResults, setTestResults] = useState<any | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Set initial code when problem or language changes
  useEffect(() => {
    if (problem && problem.starterCode && problem.starterCode[selectedLanguage]) {
      setCode(problem.starterCode[selectedLanguage]);
    }
  }, [problem, selectedLanguage]);

  // Get language extension for CodeMirror
  const getLanguageExtension = () => {
    switch (selectedLanguage) {
      case 'javascript':
        return javascript({ jsx: true });
      case 'python':
        return python();
      default:
        return javascript();
    }
  };

  // Run test cases
  const runTestCases = async () => {
    if (!code) return;
    
    setIsRunning(true);
    setTestResults(null);
    
    try {
      // Only run visible test cases for now
      const visibleTests = problem.testCases.filter(test => !test.isHidden);
      
      const results = await submissionService.runTestCases(
        code,
        selectedLanguage,
        visibleTests
      );
      
      setTestResults(results);
    } catch (error) {
      console.error('Error running test cases:', error);
      setTestResults({
        passed: 0,
        total: problem.testCases.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Handle full submission
  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(code, selectedLanguage);
    }
  };

  // Format difficulty badge
  const getDifficultyColor = () => {
    switch (problem.difficulty) {
      case 'easy':
        return 'bg-green-600 hover:bg-green-700';
      case 'medium':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'hard':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className="w-full">
      {/* Problem Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold">
          {problem.id}. {problem.title} 
          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${problem.difficulty === 'Easy' ? 'bg-green-500/20 text-green-500' : problem.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}`}>
            {problem.difficulty}
          </span>
        </h3>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={runTestCases}
          >
            Run Code
          </Button>
          <Button
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </div>
      </div>

      {/* Problem Description */}
      <Card className="bg-gray-800/50 p-4 mb-4">
        <div className="prose prose-invert max-w-none">
          <ProblemDescription description={problem.description} />
        </div>

        {/* Examples */}
        {problem.examples && problem.examples.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xl font-semibold mb-2">Examples</h4>
            {problem.examples.map((example: any, index: number) => (
              <div key={index} className="mb-4 p-3 bg-gray-700/50 rounded-md">
                <p className="font-medium">Example {index + 1}:</p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-gray-400">Input:</p>
                    <pre className="bg-gray-900/50 p-2 rounded mt-1 overflow-x-auto">{example.input}</pre>
                  </div>
                  <div>
                    <p className="text-gray-400">Output:</p>
                    <pre className="bg-gray-900/50 p-2 rounded mt-1 overflow-x-auto">{example.output}</pre>
                  </div>
                </div>
                {example.explanation && (
                  <div className="mt-2">
                    <p className="text-gray-400">Explanation:</p>
                    <p className="mt-1">{example.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Code Editor */}
      <div className="mb-4">
        <div className="bg-gray-800 px-4 py-2 text-gray-300 text-sm flex justify-between items-center rounded-t-lg">
          <div className="flex items-center">
            <span>solution.{selectedLanguage === 'javascript' ? 'js' : 'py'}</span>
            <select
              className="ml-4 bg-gray-700 text-white text-sm rounded px-2 py-1"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={isFrozen}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
          </div>
        </div>

        <div className="relative">
          {isFrozen && (
            <div className="absolute inset-0 bg-blue-900/30 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center p-6 bg-gray-800/90 rounded-lg shadow-lg">
                <div className="text-4xl mb-2">❄️</div>
                <h3 className="text-xl font-bold text-white mb-1">Editor Frozen!</h3>
                <p className="text-blue-200">Your opponent has cast Freeze on you!</p>
              </div>
            </div>
          )}
          
          <CodeMirror
            value={code}
            height="350px"
            theme="dark"
            extensions={[getLanguageExtension()]}
            onChange={(value) => setCode(value)}
            editable={!isFrozen}
            basicSetup={true}
          />
        </div>

        <div className="bg-gray-800 p-3 flex justify-between rounded-b-lg">
          <Button
            variant="outline"
            className="border-green-700/50 text-white hover:bg-green-800/30"
            onClick={runTestCases}
            disabled={isRunning || isFrozen}
          >
            {isRunning ? 'Running...' : 'Run Tests'}
          </Button>
          
          <Button
            className="bg-indigo-700 hover:bg-indigo-800 text-white"
            onClick={handleSubmit}
            disabled={isRunning || isFrozen}
          >
            Submit Solution
          </Button>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <Card className="bg-gray-800/50 p-4">
          <h3 className="text-lg font-medium text-white mb-2">Test Results</h3>
          
          {testResults.error ? (
            <div className="text-red-400">
              Error: {testResults.error}
            </div>
          ) : (
            <>
              <div className="flex items-center mb-3">
                <span className={`text-lg font-bold ${
                  testResults.passed === testResults.total ? 'text-green-500' : 'text-amber-500'
                }`}>
                  {testResults.passed} / {testResults.total} tests passed
                </span>
              </div>
              
              <div className="space-y-3">
                {testResults.results && testResults.results.map((result: any, index: number) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-md ${
                      result.status.id === 3 ? 'bg-green-900/30' : 'bg-red-900/30'
                    }`}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        Test Case {index + 1}: 
                        <span className={
                          result.status.id === 3 ? 'text-green-400 ml-2' : 'text-red-400 ml-2'
                        }>
                          {result.status.description}
                        </span>
                      </span>
                      <span className="text-gray-400 text-sm">
                        Time: {result.time}s | Memory: {result.memory ? `${Math.round(result.memory / 1024)} MB` : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      <div className="mb-1">
                        <span className="text-gray-400">Input: </span>
                        <span className="text-white">{problem.testCases[index].input}</span>
                      </div>
                      
                      <div className="mb-1">
                        <span className="text-gray-400">Expected: </span>
                        <span className="text-white">{problem.testCases[index].output}</span>
                      </div>
                      
                      <div>
                        <span className="text-gray-400">Your Output: </span>
                        <span className="text-white">{result.stdout ? result.stdout.trim() : 'No output'}</span>
                      </div>
                      
                      {result.stderr && (
                        <div className="mt-2 text-red-400">
                          Error: {result.stderr}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default ProblemDisplay; 