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
  failedTests?: TestResultItemDetails[];
  passedTests?: TestResultItemDetails[];
  userLogs?: string[];
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
        <span className="text-gray-500">Time: {timeRemaining}</span>
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-green-700/50 text-white hover:bg-green-800/30"
            disabled={editorFrozen || !isQuestionSelected || isRunningTests}
            onClick={runTestCases}
          >
            {isRunningTests ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running...
              </div>
            ) : (
              'Run Tests'
            )}
          </Button>
          
          <Button
            className={`relative overflow-hidden ${isSubmitting ? 'bg-indigo-800' : 'bg-indigo-700 hover:bg-indigo-800'} text-white`}
            disabled={editorFrozen || !isQuestionSelected || isSubmitting}
            onClick={onSubmitSolution}
          >
            <div className="flex items-center">
              {isSubmitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSubmitting ? 'Submitting...' : 'Submit Solution'}
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor; 