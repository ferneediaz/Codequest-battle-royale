import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { formatTime, getFreezeRemainingTime } from '../../utils/battleUtils';
import { Button } from "@/components/ui/button";
import { CodeProblem } from '../../services/problemService';
import { submissionService, LANGUAGE_IDS, JudgeResult, JUDGE_STATUS } from '../../services/submissionService';
import { debugState } from '../../config/debugManager';

export interface TestResultItemDetails {
  input: string;
  expected: string;
  actual: string;
  index: number;
  logs?: string[];
}

export interface TestResults {
  passed: number;
  total: number;
  passedTests: {
    index: number;
    input: string;
    expected: string;
    actual: string;
    logs?: string[];
    debugInfo?: {
      originalCode?: string;
      modifiedCode?: string;
      fullResponse?: any;
    };
  }[];
  failedTests: {
    index: number;
    input: string;
    expected: string;
    actual: string;
    logs?: string[];
    debugInfo?: {
      originalCode?: string;
      modifiedCode?: string;
      fullResponse?: any;
    };
  }[];
  userLogs: string[];
  debugData?: {
    originalCode: string;
    modifiedCode: string;
    fullResponse: any;
  } | null;
}

interface CodeEditorProps {
  userCode: string;
  setUserCode: (code: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  timeRemaining: string;
  editorFrozen: boolean;
  editorFrozenEndTime: number | null;
  isQuestionSelected: boolean;
  currentQuestion: CodeProblem | null;
  onSubmitSolution: () => void;
  setDebugMsg: (msg: string) => void;
  onTestRun: (results: TestResults | null, isRunning: boolean) => void;
  isSubmitting?: boolean;
}

// Helper function to get the appropriate file extension
const getFileExtension = (language: string): string => {
  switch (language) {
    case 'javascript': return 'js';
    case 'python': return 'py';
    default: return 'txt';
  }
};

// Helper function to get the appropriate CodeMirror language extension
const getLanguageExtension = (language: string) => {
  switch (language) {
    case 'javascript': return javascript({ jsx: true });
    case 'python': return python();
    default: return javascript({ jsx: true });
  }
};

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
  setDebugMsg,
  onTestRun,
  isSubmitting = false
}) => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  // Run test cases
  const runTestCases = async () => {
    if (!currentQuestion) return;
    
    setIsRunningTests(true);
    onTestRun(null, true); // Signal that tests are running
    setDebugMsg('Running tests...');
    
    try {
      const visibleTests = currentQuestion.testCases.filter(test => !test.isHidden);
      
      // Prepare submission for Judge0
      const languageId = LANGUAGE_IDS[selectedLanguage as keyof typeof LANGUAGE_IDS];
      if (!languageId) {
        throw new Error(`Unsupported language: ${selectedLanguage}`);
      }

      // Ensure test cases have the correct expected field for the test runner
      const formattedTestCases = visibleTests.map(test => ({
        input: test.input,
        expected: test.output // Map the output field to expected
      }));

      console.log('Run Tests - using visibleTests:', formattedTestCases);
      
      // Use the user's code directly without injecting any console logs
      let submissionCode = userCode;
      
      console.log('Submitted code:', submissionCode);

      const submissionPayload = {
        source_code: submissionCode,
        language_id: languageId,
        stdin: JSON.stringify({ testCases: formattedTestCases }), // Pass tests via stdin
      };

      // Use submitCode which runs the embedded test runner
      const result: JudgeResult = await submissionService.submitCode(submissionPayload);
      
      let testResults: TestResults | null = null;
      
      // Check Judge0 status first
      if (result.status.id === JUDGE_STATUS.ACCEPTED) {
        // If accepted, parse the stdout which contains our test runner JSON output
        if (result.stdout) {
          try {
            // Handle potential stdout with debug logs
            let jsonOutput = result.stdout;
            let userConsoleLogs: string[] = [];
            
            // First attempt to extract user logs from stderr which is more reliable 
            if (result.stderr) {
              const stderrLines = result.stderr.split('\n');
              const logLines = stderrLines
                .filter(line => line.includes('USER LOG:'))
                .map(line => line.replace('USER LOG:', '').trim());
              
              if (logLines.length > 0) {
                console.log('Found logs in stderr:', logLines);
                userConsoleLogs = logLines;
              }
            }
            
            // Find JSON part in stdout
            const jsonStartIndex = result.stdout.indexOf('{');
            if (jsonStartIndex !== -1) {
              jsonOutput = result.stdout.substring(jsonStartIndex);
              
              // Also collect any logs from before the JSON
              if (jsonStartIndex > 0) {
                const preJsonLogs = result.stdout.substring(0, jsonStartIndex)
                  .split('\n')
                  .filter(line => line.trim() !== '');
                
                if (preJsonLogs.length > 0) {
                  userConsoleLogs = [...userConsoleLogs, ...preJsonLogs];
                }
              }
            }
            
            // Parse JSON output
            const runnerOutput = JSON.parse(jsonOutput);
            
            if (runnerOutput.summary && runnerOutput.results) {
              // Log the entire runnerOutput to inspect all properties
              console.log("FULL RUNNER OUTPUT:", JSON.stringify(runnerOutput, null, 2));
              
              // Get logs from both explicit userLogs and from our extraction
              const allUserLogs = [
                ...userConsoleLogs,
                ...(runnerOutput.userLogs || [])
              ].filter(log => log.trim() !== ''); // Remove empty lines
              
              console.log('Final combined logs:', allUserLogs);
              
              // Simple direct assignment of logs to tests
              const failedTests = runnerOutput.results
                .filter((r: any) => !r.passed)
                .map((r: any, index: number): TestResultItemDetails => {
                  const testIndex = index + 1; 
                  return {
                    input: r.input || formattedTestCases[index]?.input || `Test case ${testIndex}`,
                    expected: r.expected || formattedTestCases[index]?.expected || "true",
                    actual: r.output || "undefined",
                    index: testIndex,
                    logs: r.logs || [] // Use this test's own logs
                  };
                });
                
              const passedTests = runnerOutput.results
                .filter((r: any) => r.passed)
                .map((r: any, index: number): TestResultItemDetails => {
                  const testIndex = index + 1;
                  return {
                    input: r.input || formattedTestCases[index]?.input || `Test case ${testIndex}`,
                    expected: r.expected || formattedTestCases[index]?.expected || "true",
                    actual: r.output || r.expected || "true",
                    index: testIndex,
                    logs: r.logs || [] // Use this test's own logs
                  };
                });
              
              testResults = {
                passed: runnerOutput.summary.passed,
                total: runnerOutput.summary.total,
                failedTests: failedTests,
                passedTests: passedTests,
                userLogs: allUserLogs
              };
              
              // Debug logging to verify userLogs are captured
              console.log('Final logs to be displayed:', testResults.userLogs);
              
              // Ensure we have input and expected values for every test case
              if (testResults.failedTests) {
                testResults.failedTests = testResults.failedTests.map((test, i) => ({
                  ...test,
                  input: test.input || `Test case ${i+1}`,
                  expected: test.expected || "true",
                  actual: test.actual || "false"
                }));
              }
              
              setDebugMsg(`${testResults.passed}/${testResults.total} tests passed`);
            } else {
              throw new Error('Test runner output format invalid');
            }
          } catch (parseError) {
            // Handle parsing error but still try to extract any logs
            console.error('Error parsing test runner output:', parseError, result.stdout);
            
            // Try to extract user logs even if JSON parsing failed
            let userLogs: string[] = ['[Error processing console logs - see actual logs below]'];
            
            // Check for logs in stdout
            if (result.stdout) {
              const stdoutLines = result.stdout.split('\n');
              const stdoutLogs = stdoutLines.filter(line => 
                line.trim() !== '' && 
                !line.startsWith('{') && 
                !line.startsWith('}')
              );
              if (stdoutLogs.length > 0) {
                userLogs = [...userLogs, ...stdoutLogs];
              }
            }
            
            // Check for logs in stderr
            if (result.stderr) {
              const stderrLines = result.stderr.split('\n');
              const userLogLines = stderrLines
                .filter(line => line.includes('USER LOG:'))
                .map(line => line.replace('USER LOG:', '').trim());
              
              if (userLogLines.length > 0) {
                userLogs = [...userLogs, ...userLogLines];
              }
            }
            
            // Create basic test results with the logs we found
            testResults = {
              passed: 0,
              total: visibleTests.length,
              failedTests: visibleTests.map((test, i) => ({
                input: test.input,
                expected: test.output,
                actual: "Error running test",
                index: i + 1,
                logs: userLogs // Add logs to each test for visibility
              })),
              passedTests: [],
              userLogs
            };
            
            setDebugMsg('Error processing test results.');
          }
        } else {
          setDebugMsg('Tests ran, but no output received.');
        }
      } else {
        // Handle other Judge0 statuses (Compile Error, Runtime Error, etc.)
        setDebugMsg(`Test Execution Failed: ${result.status.description}. ${result.stderr || result.compile_output || result.message || ''}`);
      }
      
      // Capture debug data when in debug mode
      if (debugState.isEnabled()) {
        setDebugData({
          originalCode: userCode,
          modifiedCode: submissionCode,
          response: result,
          rawStdout: result.stdout,
          rawStderr: result.stderr
        });
      }
      
      onTestRun(testResults, false); // Pass processed results (or null if error) to parent
      
    } catch (error) {
      console.error('Error running tests:', error);
      setDebugMsg(`Error running tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onTestRun(null, false); // Clear test running state
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="bg-gray-800 px-4 py-2 text-gray-300 text-sm flex justify-between items-center rounded-t-lg">
        <div className="flex items-center">
          <span>solution.{getFileExtension(selectedLanguage)}</span>
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
            extensions={[getLanguageExtension(selectedLanguage)]}
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
      
      <div className="bg-gray-800 p-3 flex flex-col gap-3 rounded-b-lg">
        <div className="flex justify-between items-center mt-4">
          <div>
            {/* Add debug button when debug mode is enabled */}
            {debugState.isEnabled() && (
              <Button
                className="bg-purple-700 text-white hover:bg-purple-600 mr-2"
                onClick={() => {
                  setShowDebugPanel(!showDebugPanel);
                }}
              >
                Debug Info
              </Button>
            )}
            
            <Button
              className="bg-green-600 text-white hover:bg-green-500"
              disabled={!isQuestionSelected || isRunningTests}
              onClick={() => {
                if (isQuestionSelected && !isRunningTests) {
                  onTestRun(null, true);
                  
                  // Send code to backend
                  runTestCases();
                }
              }}
            >
              Run Tests
            </Button>
          </div>
          
          <Button
            className="bg-indigo-600 text-white hover:bg-indigo-500"
            disabled={!isQuestionSelected || isSubmitting}
            onClick={() => {
              if (isQuestionSelected && !isSubmitting) {
                onSubmitSolution();
              }
            }}
          >
            Submit Solution
          </Button>
        </div>
      </div>
      
      {/* Debug panel */}
      {debugState.isEnabled() && showDebugPanel && debugData && (
        <div className="mt-4 border border-indigo-700 rounded-md bg-gray-900/80 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-indigo-400 font-medium">Debug Information</h3>
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs border-indigo-600 hover:bg-indigo-800/50"
              onClick={() => setShowDebugPanel(false)}
            >
              Close
            </Button>
          </div>
          
          <div className="space-y-3 text-xs">
            {debugData.response && (
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-indigo-300 font-medium mb-1">Judge0 Response Status</div>
                <pre className="text-green-400 whitespace-pre-wrap">
                  {debugData.response.status ? `${debugData.response.status.id}: ${debugData.response.status.description}` : 'Status unavailable'}
                </pre>
              </div>
            )}
            
            {debugData.rawStdout && (
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-indigo-300 font-medium mb-1">stdout Output</div>
                <pre className="text-white whitespace-pre-wrap overflow-auto max-h-32">
                  {debugData.rawStdout}
                </pre>
              </div>
            )}
            
            {debugData.rawStderr && (
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-indigo-300 font-medium mb-1">stderr Output</div>
                <pre className="text-red-300 whitespace-pre-wrap overflow-auto max-h-32">
                  {debugData.rawStderr}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor; 