import React, { useState, useEffect } from 'react';
import { CodeProblem } from '../services/problemService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { Button } from '@/components/ui/button';
import { submissionService } from '../services/submissionService';

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
        <h2 className="text-xl font-bold text-white">{problem.title}</h2>
        <Badge className={getDifficultyColor()}>
          {problem.difficulty.toUpperCase()}
        </Badge>
      </div>

      {/* Problem Description */}
      <Card className="bg-gray-800/50 p-4 mb-4">
        <div className="prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ 
            __html: problem.description.replace(/\n/g, '<br>').replace(/`([^`]+)`/g, '<code>$1</code>') 
          }} />
        </div>

        {/* Examples */}
        {problem.examples && problem.examples.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium text-white mb-2">Examples</h3>
            <div className="space-y-3">
              {problem.examples.map((example, index) => (
                <div key={index} className="bg-gray-900/50 p-3 rounded-md">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap">{example}</pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Constraints */}
        {problem.constraints && problem.constraints.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium text-white mb-2">Constraints</h3>
            <ul className="list-disc pl-5 space-y-1">
              {problem.constraints.map((constraint, index) => (
                <li key={index} className="text-sm text-gray-300">{constraint}</li>
              ))}
            </ul>
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