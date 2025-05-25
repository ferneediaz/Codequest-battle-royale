import { useState, useCallback } from 'react';
import { submissionService, LANGUAGE_IDS, JUDGE_STATUS } from '../../services/submissionService';
import { supabase } from '../../lib/supabase';
import { TestResults } from '../../components/battle-arena/CodeEditor';
import { CodeProblem } from '../../services/problemService';
import { getTestRunner } from '../../services/testRunners';
import { debugState } from '../../config/debugManager';

/**
 * Extract the function name from the user code
 * This is used as a fallback when functionName is not defined in the problem
 */
const extractFunctionName = (code: string, language: string): string => {
  try {
    if (language === 'javascript') {
      // Try to match: function name(...) or const name = (...) =>
      const fnMatch = code.match(/function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/);
      if (fnMatch) {
        return fnMatch[1] || fnMatch[2];
      }
    } else if (language === 'python') {
      // Try to match: def name(...):
      const fnMatch = code.match(/def\s+(\w+)\s*\(/);
      if (fnMatch) {
        return fnMatch[1];
      }
    }
    
    // Default fallback
    return 'solution';
  } catch (error) {
    console.error('Error extracting function name:', error);
    return 'solution';
  }
};

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
  
  // Add state for debug data
  const [debugData, setDebugData] = useState<{
    originalCode: string;
    modifiedCode: string;
    fullResponse: any;
    rawStdout?: string;
    rawStderr?: string;
    debugLines?: string[];
  } | null>(null);
  
  // Handle running tests
  const handleTestRun = useCallback(async (
    results: TestResults | null, 
    isRunning: boolean,
    setDebugMsg: (msg: string) => void
  ) => {
    try {
      setIsRunningTests(isRunning);
      
      // If results are being passed in, just display them
      if (results) {
        console.log('Test run results:', results);
        setActiveView('output');
        
        // Create debug data even if it wasn't provided
        if (!results.debugData && debugState.isEnabled()) {
          // Create a basic debug data object from what we have
          const basicDebugData = {
            originalCode: "// Original code wasn't captured",
            modifiedCode: "// Modified code wasn't captured",
            fullResponse: { status: { description: "Test run completed" } },
            rawStdout: JSON.stringify(results, null, 2),
            rawStderr: "",
            debugLines: []
          };
          
          // Attach this debug data to all test results
          results.debugData = basicDebugData;
          if (results.passedTests) {
            results.passedTests.forEach(test => test.debugInfo = basicDebugData);
          }
          if (results.failedTests) {
            results.failedTests.forEach(test => test.debugInfo = basicDebugData);
          }
        }
        
        setTestResults(results);
        return;
      }
      
    } catch (error) {
      console.error('Error in handleTestRun:', error);
      setDebugMsg('Error running tests. Please try again.');
      setIsRunningTests(false);
    }
  }, []);
  
  // Submit solution for judging
  const handleSubmitSolution = useCallback(async (
    userCode: string,
    selectedLanguage: string,
    setDebugMsg: (msg: string) => void
  ) => {
    if (!user?.email || !currentQuestion) {
      setDebugMsg('You must be logged in and have a problem selected to submit.');
      return;
    }
    
    if (!userCode || userCode.trim() === '') {
      setDebugMsg('Please enter some code before submitting.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setActiveView('output');
      
      // Build the test cases from the problem
      const testCases = currentQuestion.testCases.map(tc => ({
        input: tc.input,
        expected: tc.output
      }));
      
      // Prepare test data for Judge0
      const testData = JSON.stringify({
        testCases,
        fnName: currentQuestion.functionName || extractFunctionName(userCode, selectedLanguage)
      });
      
      // Get language ID
      const languageId = selectedLanguage === 'javascript' ? 
        LANGUAGE_IDS.javascript : 
        LANGUAGE_IDS.python;
        
      // Generate the modified code with test runner
      const modifiedCode = getTestRunner(userCode, languageId);
      
      // Submit to Judge0
      console.log('Submitting solution to Judge0...');
      console.log('Language:', selectedLanguage, 'ID:', languageId);
      
      const result = await submissionService.submitCode({
        source_code: userCode,
        language_id: languageId,
        stdin: testData
      });
      
      // Store debug data - IMPORTANT: Include the entire Judge0 response
      const debugInfo = {
        originalCode: userCode,
        modifiedCode: modifiedCode,
        fullResponse: result,
        rawStdout: result.stdout || "",
        rawStderr: result.stderr || "",
        // Add this line to immediately parse and save debug info from the stdout
        debugLines: (() => {
          try {
            // Try to extract debug lines from stdout
            if (result.stdout) {
              const jsonStartIndex = result.stdout.indexOf('{');
              if (jsonStartIndex !== -1) {
                const jsonPart = result.stdout.substring(jsonStartIndex);
                const parsed = JSON.parse(jsonPart);
                return parsed.debug || [];
              }
            }
            // If we can't extract from stdout, try stderr
            if (result.stderr) {
              return result.stderr.split('\n');
            }
            return [];
          } catch (e) {
            console.error('Error parsing debug lines:', e);
            return [];
          }
        })()
      };
      
      console.log('DEBUG INFO CAPTURED:', debugInfo);
      setDebugData(debugInfo);
      
      console.log('Judge0 result:', result);
      
      if (result.status.id !== JUDGE_STATUS.ACCEPTED) {
        // Handle error case
        if (result.compile_output) {
          setDebugMsg(`Compilation error: ${result.compile_output}`);
        } else if (result.stderr) {
          setDebugMsg(`Runtime error: ${result.stderr}`);
        } else {
          setDebugMsg(`Error: ${result.status.description}`);
        }
        
        // Even for errors, include debug info
        setTestResults({
          passed: 0,
          total: testCases.length,
          passedTests: [],
          failedTests: testCases.map((tc, i) => ({
            index: i + 1,
            input: tc.input,
            expected: tc.expected,
            actual: 'Error: ' + (result.stderr || result.compile_output || result.status.description),
            logs: [],
            debugInfo: debugInfo // Include debug info even for errors
          })),
          userLogs: [],
          debugData: debugInfo
        });
        
        setIsSubmitting(false);
        return;
      }
      
      // Parse the results
      let processedResults;
      if (result.stdout) {
        try {
          // Find the start of the JSON in the output
          const jsonStartIndex = result.stdout.indexOf('{');
          if (jsonStartIndex !== -1) {
            const jsonPart = result.stdout.substring(jsonStartIndex);
            processedResults = JSON.parse(jsonPart);
            
            // Save the debug section if available
            if (processedResults.debug) {
              (debugInfo as any).debugLines = processedResults.debug;
            }
          } else {
            throw new Error('Could not find JSON in output');
          }
        } catch (e) {
          console.error('Error parsing Judge0 output:', e);
          setDebugMsg('Error parsing test results. Please try again.');
          setIsSubmitting(false);
          return;
        }
      } else {
        setDebugMsg('No output received from Judge0. Please try again.');
        setIsSubmitting(false);
        return;
      }
      
      console.log('Processed results:', processedResults);
      
      // Format test results for display
      const formattedResults: TestResults = {
        passed: processedResults.summary?.passed || 0,
        total: processedResults.summary?.total || testCases.length,
        passedTests: (processedResults.results || [])
          .filter((r: any) => r.passed)
          .map((r: any) => {
            // Always include debug info when debug mode is enabled
            return {
              index: r.originalIndex + 1,
              input: r.input,
              expected: r.expected,
              actual: r.output,
              logs: r.logs || [],
              debugInfo: debugState.isEnabled() ? debugInfo : undefined // Directly include the full debug info
            };
          }),
        failedTests: (processedResults.results || [])
          .filter((r: any) => !r.passed)
          .map((r: any) => ({
            index: r.originalIndex + 1,
            input: r.input,
            expected: r.expected,
            actual: r.output,
            logs: r.logs || [],
            debugInfo: debugState.isEnabled() ? debugInfo : undefined // Directly include the full debug info
          })),
        userLogs: processedResults.userLogs || [],
        debugData: debugState.isEnabled() ? debugInfo : undefined // Include full debug info at the top level
      };
      
      setTestResults(formattedResults);
      
      // Check if all tests passed
      const allTestsPassed = formattedResults.passed === formattedResults.total;
      
      if (allTestsPassed) {
        // Success! Update scores and celebrate
        await celebrateSuccess(user.email, currentQuestion);
      }
      
      setIsSubmitting(false);
      
    } catch (error) {
      console.error('Error in handleSubmitSolution:', error);
      setDebugMsg('Error submitting solution. Please try again.');
      setIsSubmitting(false);
    }
  }, [user, currentQuestion]);
  
  // Function to celebrate success and update scores
  const celebrateSuccess = useCallback(async (
    userEmail: string, 
    problem: CodeProblem
  ) => {
    try {
      // Show confetti!
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      
      // Add to completed questions
      setCompletedQuestions(prev => {
        const updatedCompleted = { ...prev };
        if (!updatedCompleted[userEmail]) {
          updatedCompleted[userEmail] = [];
        }
        if (!updatedCompleted[userEmail].includes(problem.id)) {
          updatedCompleted[userEmail] = [...updatedCompleted[userEmail], problem.id];
        }
        return updatedCompleted;
      });
      
      // Update score (assuming problem difficulty determines points)
      const scoreToAdd = problem.difficulty === 'easy' ? 10 : 
                        problem.difficulty === 'medium' ? 20 : 30;
      
      const newScore = (playerScores[userEmail] || 0) + scoreToAdd;
      
      // Update local state first for responsive UI
      setPlayerScores(prev => ({
        ...prev,
        [userEmail]: newScore
      }));
      
      // Broadcast score update to all users
      const channel = supabase.channel('battle_scores_listener');
      await channel.subscribe();
      
      const result = await channel.send({
        type: 'broadcast',
        event: 'score_update',
        payload: { 
          scores: {
            ...playerScores,
            [userEmail]: newScore
          }
        }
      });
      
      console.log('Score update broadcast result:', result);
      
    } catch (error) {
      console.error('Error in celebrateSuccess:', error);
    }
  }, [playerScores]);
  
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
    celebrateSuccess,
    debugData
  };
}; 