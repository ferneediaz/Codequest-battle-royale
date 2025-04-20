import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeProblem } from '../../services/problemService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';

interface ProblemDisplayProps {
  currentQuestion: CodeProblem | null;
  onBackToList: () => void;
  testResults?: {
    passed: number;
    total: number;
    failedTests?: Array<{
      input: string;
      expected: string;
      actual: string;
      index: number;
    }>;
  } | null;
  isTestRunning?: boolean;
  hideInstructions?: boolean;
}

// Expandable test result component
const TestResultItem = ({ index, input, expected, actual, passed }: { 
  index: number; 
  input: string; 
  expected: string; 
  actual: string; 
  passed: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`border-b border-gray-700 py-2`}>
      <div 
        className="flex items-center cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? 
          <ChevronDown className="w-4 h-4 mr-2 text-gray-400" /> : 
          <ChevronRight className="w-4 h-4 mr-2 text-gray-400" />
        }
        <div className={`font-mono ${passed ? 'text-green-300' : 'text-red-300'} flex-1`}>
          {passed ? '✓' : '✗'} Test #{index}
        </div>
      </div>
      
      {isExpanded && (
        <div className="pl-6 mt-2 space-y-1">
          <div className="grid grid-cols-[80px_1fr] gap-1 text-sm">
            <div className="text-gray-400">Input:</div>
            <div className="text-gray-100 overflow-x-auto whitespace-pre font-mono">{input}</div>
            
            <div className="text-gray-400">Expected:</div>
            <div className={`${passed ? 'text-green-300' : 'text-green-300'} overflow-x-auto whitespace-pre font-mono`}>{expected}</div>
            
            {!passed && (
              <>
                <div className="text-gray-400">Your Output:</div>
                <div className="text-red-300 overflow-x-auto whitespace-pre font-mono">{actual}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProblemDisplay: React.FC<ProblemDisplayProps> = ({
  currentQuestion,
  onBackToList,
  testResults,
  isTestRunning = false,
  hideInstructions = false
}) => {
  const [activeTab, setActiveTab] = useState<string>(hideInstructions ? "output" : "instructions");
  
  // Switch to test results tab when tests are run
  React.useEffect(() => {
    if (testResults && !hideInstructions) {
      setActiveTab("output");
    }
  }, [testResults, hideInstructions]);

  // Get test cases from the currentQuestion to show real input/output
  const testCasesWithOutput = React.useMemo(() => {
    if (!testResults) return [];
    
    // Build a map of test results by index
    const failedTestsMap: Record<number, any> = {};
    if (testResults.failedTests) {
      testResults.failedTests.forEach(test => {
        failedTestsMap[test.index] = test;
      });
    }
    
    // Create a full list of test results using actual test case data
    const allTests = [];
    if (currentQuestion && currentQuestion.testCases) {
      // Get visible test cases (non-hidden)
      const visibleTests = currentQuestion.testCases.filter(test => !test.isHidden);
      
      // Match them with results by index
      for (let i = 0; i < visibleTests.length; i++) {
        const testIndex = i + 1; // Assuming test indexes start at 1
        const testCase = visibleTests[i];
        const failedTestData = failedTestsMap[testIndex];
        
        if (failedTestData) {
          // This is a failed test
          allTests.push({
            index: testIndex,
            input: testCase.input,
            expected: testCase.output,
            actual: failedTestData.actual,
            passed: false
          });
        } else {
          // This is a passed test
          allTests.push({
            index: testIndex,
            input: testCase.input,
            expected: testCase.output,
            actual: testCase.output, // For passed tests, actual equals expected
            passed: true
          });
        }
      }
    }
    
    return allTests;
  }, [testResults, currentQuestion]);

  // If hideInstructions is true, just render the output tab content
  if (hideInstructions) {
    return (
      <Card className="bg-gray-800 p-4 overflow-y-auto">
        {isTestRunning ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-3 text-white">Running tests...</span>
          </div>
        ) : testResults ? (
          <div>
            {/* Header showing passed/failed counts */}
            <div className="mb-4 p-3 bg-gray-900/60 text-sm">
              <div className="flex justify-between">
                <div>Time: 456ms</div>
                <div>
                  <span className="text-green-400">Passed: {testResults.passed}</span> 
                  <span className="mx-2">|</span> 
                  <span className="text-red-400">Failed: {testResults.total - testResults.passed}</span>
                </div>
              </div>
            </div>
            
            {/* Test Results section */}
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white mb-2">Test Results:</h3>
              
              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                {testCasesWithOutput.map((test) => (
                  <TestResultItem 
                    key={test.index} 
                    index={test.index} 
                    input={test.input} 
                    expected={test.expected} 
                    actual={test.actual}
                    passed={test.passed}
                  />
                ))}
              </div>
            </div>
            
            {/* Success message */}
            {testResults.passed === testResults.total && (
              <div className="my-8 p-4 bg-gray-900 border-l-4 border-green-500 text-center">
                <div className="text-green-400 font-medium flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  You have passed all of the tests! :)
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <p>No test results yet</p>
            <p className="text-sm mt-2">Run tests to see results here</p>
          </div>
        )}
      </Card>
    );
  }

  // Original render with tabs
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger 
            value="output" 
            disabled={!testResults}
            className={testResults && testResults.failedTests && testResults.failedTests.length > 0 ? "text-red-300" : ""}
          >
            {testResults ? (testResults.passed === testResults.total ? 'Output' : 'Failed Tests') : 'Output'}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="instructions" className="border-none p-0">
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
          
          {/* Sample Test Cases */}
          {currentQuestion?.testCases && currentQuestion.testCases.filter(test => !test.isHidden).length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-white mb-2">Sample Tests</h3>
              <div className="space-y-3">
                {currentQuestion.testCases
                  .filter(test => !test.isHidden)
                  .slice(0, 3) // Limit to first 3 for clarity
                  .map((test, index) => (
                    <div key={index} className="bg-gray-900 p-3 rounded-md">
                      <div className="grid grid-cols-[80px_1fr] gap-1 text-sm">
                        <div className="text-gray-400">Input:</div>
                        <div className="text-gray-100 overflow-x-auto whitespace-pre font-mono">{test.input}</div>
                        
                        <div className="text-gray-400">Expected:</div>
                        <div className="text-gray-100 overflow-x-auto whitespace-pre font-mono">{test.output}</div>
                      </div>
                    </div>
                  ))
                }
                {currentQuestion.testCases.filter(test => !test.isHidden).length > 3 && (
                  <div className="text-sm text-gray-400 italic">
                    ... and {currentQuestion.testCases.filter(test => !test.isHidden).length - 3} more tests
                  </div>
                )}
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
        </TabsContent>
        
        <TabsContent value="output" className="border-none p-0">
          {isTestRunning ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3 text-white">Running tests...</span>
            </div>
          ) : testResults ? (
            <div>
              {/* Header showing passed/failed counts */}
              <div className="mb-4 p-3 bg-gray-900/60 text-sm">
                <div className="flex justify-between">
                  <div>Time: 456ms</div>
                  <div>
                    <span className="text-green-400">Passed: {testResults.passed}</span> 
                    <span className="mx-2">|</span> 
                    <span className="text-red-400">Failed: {testResults.total - testResults.passed}</span>
                  </div>
                </div>
              </div>
              
              {/* Test Results section */}
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-2">Test Results:</h3>
                
                <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                  {testCasesWithOutput.map((test) => (
                    <TestResultItem 
                      key={test.index} 
                      index={test.index} 
                      input={test.input} 
                      expected={test.expected} 
                      actual={test.actual}
                      passed={test.passed}
                    />
                  ))}
                </div>
              </div>
              
              {/* Success message */}
              {testResults.passed === testResults.total && (
                <div className="my-8 p-4 bg-gray-900 border-l-4 border-green-500 text-center">
                  <div className="text-green-400 font-medium flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    You have passed all of the tests! :)
                  </div>
                </div>
              )}
              
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                  onClick={() => setActiveTab("instructions")}
                >
                  Back to Instructions
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <p>No test results yet</p>
              <p className="text-sm mt-2">Run tests to see results here</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default ProblemDisplay; 