import { useState } from 'react';
import { submissionService, LANGUAGE_IDS, JudgeResult, JUDGE_STATUS } from '../../services/submissionService';
import { supabase } from '../../lib/supabase';
import { TestResults } from '../../components/battle-arena/CodeEditor';
import { CodeProblem } from '../../services/problemService';

/**
 * Custom hook to handle code submission and test running functionality
 */
export const useSubmissionHandler = (user: any, currentQuestion: CodeProblem | null) => {
  // Test results and submission state
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeView, setActiveView] = useState<'instructions' | 'output'>('instructions');
  
  // Maintain state for player scores and completed questions
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [completedQuestions, setCompletedQuestions] = useState<{ [userId: string]: string[] }>({});
  
  // Add state for celebration animation
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Handle running tests
  const handleTestRun = (results: TestResults | null, isRunning: boolean, debugCallback?: (msg: string) => void) => {
    // Ensure results have properly formatted test cases
    if (results && results.failedTests) {
      // Make sure each test case has input, expected, and actual values
      results.failedTests = results.failedTests.map((test: any, i: number) => ({
        ...test,
        input: test.input || `Test case ${i+1}`,
        expected: test.expected || "true",
        actual: test.actual || "false"
      }));
      
      // Also ensure each passed test case has input and expected values
      if (results.passedTests) {
        results.passedTests = results.passedTests.map((test: any, i: number) => ({
          ...test,
          input: test.input || `Test case ${i+1}`,
          expected: test.expected || "true",
          actual: test.actual || test.expected || "true"
        }));
      }

      // Debug userLogs
      console.log("DEBUG: Test Results with userLogs:", { 
        hasUserLogs: !!results.userLogs, 
        logsLength: results.userLogs?.length || 0,
        logsSample: results.userLogs?.slice(0, 2)
      });
    }
    
    setTestResults(results);
    setIsRunningTests(isRunning);
    
    // Automatically switch to output tab when test results are available
    if (results && !isRunning) {
      setActiveView('output');
      
      // Add debug info if tests are failing
      if (debugCallback && results.failedTests && results.failedTests.length > 0) {
        console.log("Debug info for failed tests:");
        results.failedTests.forEach((test: any) => {
          console.log(`Test input: "${test.input}"`);
          console.log(`Expected: ${test.expected}`);
          console.log(`Actual: ${test.actual}`);
          
          // For palindrome problem - debug the algorithm
          if (currentQuestion?.id === 'valid-palindrome') {
            const cleanInput = String(test.input).replace(/^"|"$/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
            const reversed = cleanInput.split('').reverse().join('');
            console.log(`Cleaned input: "${cleanInput}"`);
            console.log(`Reversed: "${reversed}"`);
            console.log(`Are they equal? ${cleanInput === reversed}`);
          }
        });
      }
    }
  };
  
  // Celebrate success with confetti
  const celebrateSuccess = () => {
    setShowConfetti(true);
    
    // Auto-hide confetti after a few seconds
    setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
  };
  
  // Submit solution for judging
  const handleSubmitSolution = async (
    userCode: string, 
    selectedLanguage: string,
    setDebugMsg: (msg: string) => void
  ) => {
    if (!currentQuestion || !user?.email) return;
    
    setDebugMsg('Submitting solution...');
    setIsSubmitting(true); // Start loading animation
    
    try {
      // Prepare submission for Judge0
      const languageId = LANGUAGE_IDS[selectedLanguage as keyof typeof LANGUAGE_IDS];
      if (!languageId) {
        throw new Error(`Unsupported language: ${selectedLanguage}`);
      }

      // Separate visible and hidden tests for debugging
      const visibleTests = currentQuestion.testCases.filter(test => !test.isHidden);
      const hiddenTests = currentQuestion.testCases.filter(test => test.isHidden);
      
      console.log('Visible tests:', visibleTests.length, visibleTests);
      console.log('Hidden tests:', hiddenTests.length, hiddenTests);
      
      // Properly format ALL test cases to ensure expected field is populated
      const formattedTestCases = currentQuestion.testCases.map(test => ({
        input: test.input,
        expected: test.output // Ensure expected field is populated from output
      }));

      const submissionPayload = {
        source_code: userCode,
        language_id: languageId,
        stdin: JSON.stringify({ testCases: formattedTestCases }), // Use properly formatted test cases
      };

      // Use submitCode which runs the embedded test runner
      const result: JudgeResult = await submissionService.submitCode(submissionPayload);
      
      console.log('Submission result:', result);

      // Check Judge0 status first
      if (result.status.id === JUDGE_STATUS.ACCEPTED) {
        // If accepted, parse the stdout which contains our test runner JSON output
        if (result.stdout) {
          try {
            const runnerOutput = JSON.parse(result.stdout);
            if (runnerOutput.summary) {
              const passed = runnerOutput.summary.passed;
              const total = runnerOutput.summary.total;
              
              // If all tests passed, update score and show celebration
              if (passed === total) {
                // Update local score state
                const updatedScores = { ...playerScores };
                const userEmail = user.email || '';
                updatedScores[userEmail] = (updatedScores[userEmail] || 0) + 1;
                setPlayerScores(updatedScores);
                
                // Add to completed questions
                const updatedCompletedQuestions = { ...completedQuestions };
                if (!updatedCompletedQuestions[userEmail]) {
                  updatedCompletedQuestions[userEmail] = [];
                }
                
                // Only add to completed if not already present
                if (!updatedCompletedQuestions[userEmail].includes(currentQuestion.id)) {
                  updatedCompletedQuestions[userEmail].push(currentQuestion.id);
                  setCompletedQuestions(updatedCompletedQuestions);
                  
                  // Broadcast the update to other clients
                  const completedChannel = supabase.channel('completed_questions', {
                    config: {
                      broadcast: { self: true }
                    }
                  });
                  
                  completedChannel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                      await completedChannel.send({
                        type: 'broadcast',
                        event: 'question_completed',
                        payload: { 
                          completedQuestions: updatedCompletedQuestions,
                          user: userEmail,
                          questionId: currentQuestion.id,
                          timestamp: new Date().toISOString()
                        }
                      });
                      
                      setTimeout(() => {
                        completedChannel.unsubscribe();
                      }, 1000);
                    }
                  });
                }
                
                setDebugMsg(`🎉 Solution successful: ${passed}/${total} tests passed!`);
                
                // Show celebration animation
                celebrateSuccess();
                
                // Broadcast score update with proper subscription
                const scoreChannel = supabase.channel('battle_scores', {
                  config: {
                    broadcast: { self: true } // Allow self-receiving to ensure all clients get updates
                  }
                });
                
                scoreChannel.subscribe(async (status) => {
                  if (status !== 'SUBSCRIBED') {
                    console.log('Score channel status:', status);
                    return;
                  }
                  
                  console.log('Score channel subscribed, broadcasting score update');
                  
                  await scoreChannel.send({
                    type: 'broadcast',
                    event: 'score_update',
                    payload: { 
                      scores: updatedScores,
                      user: userEmail,
                      timestamp: new Date().toISOString()
                    }
                  });
                  
                  console.log('Score update broadcast sent');
                  
                  // Unsubscribe after sending to avoid keeping too many channels open
                  setTimeout(() => {
                    scoreChannel.unsubscribe();
                  }, 1000);
                });
              } else {
                // Some tests failed
                // Get more detailed info about the failures
                const failedTests = runnerOutput.results?.filter((r: any) => !r.passed) || [];
                
                // Check if these are hidden test cases
                let hiddenFailures = 0;
                let visibleFailures = 0;
                
                const visibleTestCount = visibleTests?.length || 0;
                
                failedTests.forEach((failedTest: any, index: number) => {
                  // Try to determine if this is a hidden test by matching input
                  const matchesVisibleTest = visibleTests.some(t => t.input === failedTest.input);
                  if (!matchesVisibleTest) {
                    console.log(`Hidden test failed:`, failedTest);
                    hiddenFailures++;
                  } else {
                    console.log(`Visible test failed:`, failedTest);
                    visibleFailures++;
                  }
                });
                
                if (hiddenFailures > 0) {
                  setDebugMsg(`❌ Failed: ${passed}/${total} tests passed. Your code may work for the ${visibleTestCount - visibleFailures} visible test cases but fails on ${hiddenFailures} hidden test cases that check edge cases!`);
                } else {
                  setDebugMsg(`❌ Failed: ${passed}/${total} tests passed. Check the test results for details.`);
                }
              }
              
              // Ensure test results have expected field populated from output field
              if (runnerOutput.testResults) {
                const formattedResults = {
                  ...runnerOutput,
                  passedTests: runnerOutput.passedTests?.map((test: any) => ({
                    ...test,
                    expected: test.expected || test.output
                  })),
                  failedTests: runnerOutput.failedTests?.map((test: any) => ({
                    ...test,
                    expected: test.expected || test.output
                  }))
                };
                setTestResults(formattedResults);
                setActiveView('output');
              }
            } else {
              throw new Error('Test runner output format invalid (missing summary)');
            }
          } catch (parseError) {
            console.error('Error parsing submission output:', parseError, result.stdout);
            setDebugMsg('Error processing submission results.');
          }
        } else {
          setDebugMsg('Submission ran, but no output received.');
        }
      } else {
        // Handle other Judge0 statuses (Compile Error, Runtime Error, etc.)
        setDebugMsg(`Submission Failed: ${result.status.description}. ${result.stderr || result.compile_output || result.message || ''}`);
      }

    } catch (error) {
      console.error('Error submitting solution:', error);
      setDebugMsg(`Error submitting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false); // End loading animation
    }
  };
  
  return {
    testResults,
    setTestResults,
    isRunningTests,
    setIsRunningTests,
    isSubmitting,
    setIsSubmitting,
    activeView,
    setActiveView,
    playerScores,
    setPlayerScores,
    completedQuestions,
    setCompletedQuestions,
    showConfetti,
    setShowConfetti,
    handleTestRun,
    handleSubmitSolution,
    celebrateSuccess
  };
}; 