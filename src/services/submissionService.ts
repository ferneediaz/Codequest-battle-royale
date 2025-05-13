import { supabase } from '../lib/supabase';
import { getTestRunner } from './testRunners';

/**
 * STANDARDIZED FORMAT FOR JUDGE0 TEST CASES
 * ----------------------------------------
 * This service processes code submissions using the Judge0 API.
 * To ensure consistent behavior across languages, test cases must follow these formats:
 * 
 * 1. For functions with MULTIPLE PARAMETERS:
 *    "input": "[[array], value]" -> [[1,2,3,4], 5]
 *    This format allows both JS and Python test runners to correctly unpack arguments
 * 
 * 2. For functions with SINGLE PARAMETER:
 *    "input": "[1,2,3,4]" for arrays or "[1,2,3,4,5]" for linked lists
 * 
 * 3. For string inputs:
 *    "input": "\"example string\""
 * 
 * When adding support for a new language:
 * 1. Add the language ID to LANGUAGE_IDS
 * 2. Add an appropriate test runner in the testRunners directory
 * 3. Update the testRunners/index.ts factory to include the new language
 * 4. Ensure the test runner follows the same output format for proper result comparison
 */

/**
 * USER CODE CONSOLE LOG CAPTURE SYSTEM
 * -----------------------------------
 * The test runners capture console.log/print statements from user code to help with debugging.
 * This is implemented differently for each language while following these principles:
 * 
 * 1. SAFETY: We never permanently override built-in functions
 * 2. CLEANUP: Always restore original functionality, especially in error cases
 * 3. ISOLATION: Capture logs per test case so each test has its own logs
 * 4. CONSISTENCY: Provide both per-test logs and a global 'userLogs' array
 * 
 * Currently implemented for:
 * - JavaScript: 
 *   - Captures logs per test case using a test-specific buffer
 *   - Preserves original console.log and restores it after all tests
 *   - Each test result includes its own 'logs' array
 *   - User logs are attached directly to the test that generated them
 * 
 * - Python: 
 *   - Uses redirect_stdout from contextlib for clean capture
 *   - Captures stdout separately for each test case
 *   - Each test result includes its own 'logs' array
 *   - Warning messages for common mistakes (string concatenation, etc.)
 * 
 * When adding support for a new language:
 * 
 * 1. CHOOSE THE RIGHT METHOD FOR THE LANGUAGE:
 *   - Prefer standard library methods for capturing output (e.g. stream redirection)
 *   - If overriding print functions, use try/finally or equivalent to ensure cleanup
 *   - For compiled languages, consider adding compiler flags or wrappers
 * 
 * 2. IMPLEMENT PER-TEST CAPTURE:
 *   - Create a separate logs array for each test case
 *   - Capture output independently for each test run
 *   - Clear the capture buffer between tests to prevent leakage
 * 
 * 3. ENSURE PROPER CLEANUP:
 *   - Always restore original functions/streams in a finally block
 *   - Handle errors appropriately without breaking the test runner
 * 
 * 4. FORMAT THE OUTPUT:
 *   - Include the test-specific logs in each test result as 'logs'
 *   - Also include a global 'userLogs' array for compatibility
 *   - Maintain the original order of tests with 'originalIndex'
 *   - Ensure each test result follows this structure:
 *     {
 *       input: string,
 *       output: string,
 *       expected: string,
 *       passed: boolean,
 *       logs: string[],      // Array of logs specific to this test
 *       originalIndex: number // To maintain proper ordering
 *     }
 * 
 * The frontend will display each test's logs in its own collapsible section.
 */

// Judge0 language IDs
export const LANGUAGE_IDS = {
  javascript: 63,  // JavaScript (Node.js v12.14.0)
  python: 71,      // Python (3.8.1)
};

export interface JudgeSubmission {
  source_code: string;
  language_id: number;
  stdin: string;
  expected_output?: string;
  cpu_time_limit?: number;   // Optional: in seconds
  memory_limit?: number;     // Optional: in KB
  enable_network?: boolean;  // Optional: whether to allow network access
}

export interface JudgeResult {
  status: {
    id: number;
    description: string;
  };
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  message?: string;
  time?: string;
  memory?: number;
  token?: string;
}

export interface SubmissionDetails {
  problemId: string;
  userId: string;
  code: string;
  language: string;
  status: string;
  passedTestCases?: number;
  totalTestCases?: number;
  executionTime?: number;
  memoryUsed?: number;
  submittedAt: string;
  results?: JudgeResult[];
}

// Status IDs from Judge0
export const JUDGE_STATUS = {
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR: 7,
  INTERNAL_ERROR: 8,
  EXEC_FORMAT_ERROR: 9,
  MEMORY_LIMIT_EXCEEDED: 10
};

// Access the Judge0 API URL from environment variables only
// Do NOT hardcode the URL for security reasons
const JUDGE0_API_URL = import.meta.env.VITE_JUDGE0_API_URL ? import.meta.env.VITE_JUDGE0_API_URL.replace(/\/+$/, '') : '';
const JUDGE0_API_KEY = import.meta.env.VITE_JUDGE0_API_KEY;
const JUDGE0_API_HOST = import.meta.env.VITE_JUDGE0_API_HOST;

// Log but don't expose the full URL
console.log('JUDGE0 DEBUG - Judge0 API URL configured:', JUDGE0_API_URL ? 'Yes' : 'No');

class SubmissionService {
  /**
   * Submit code to Judge0 and get results
   */
  async submitCode(submission: JudgeSubmission): Promise<JudgeResult> {
    try {
      // Check if Judge0 is configured
      if (!JUDGE0_API_URL) {
        throw new Error('Judge0 API URL is not configured');
      }
      
      // Prepare code for submission by adding standard test runner
      const modifiedCode = getTestRunner(submission.source_code, submission.language_id);
      
      console.log('JUDGE0 DEBUG - Original code:', submission.source_code);
      console.log('JUDGE0 DEBUG - Modified code with test runner:', modifiedCode.substring(0, 500) + '... (truncated)');
      console.log('JUDGE0 DEBUG - Submitting to Judge0 with language_id:', submission.language_id);
      console.log('JUDGE0 DEBUG - Stdin input:', submission.stdin);
      
      // Headers for the API request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Only add RapidAPI headers if we're using the RapidAPI endpoint
      if (JUDGE0_API_URL.includes('rapidapi.com') && JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
        headers['X-RapidAPI-Host'] = JUDGE0_API_HOST || '';
      }
      
      console.log('JUDGE0 DEBUG - Request headers:', JSON.stringify(headers));
      
      // Create a submission
      console.log('JUDGE0 DEBUG - Sending request to:', `${JUDGE0_API_URL}/submissions`);
      
      let response;
      try {
        response = await fetch(`${JUDGE0_API_URL}/submissions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...submission,
            source_code: modifiedCode
          })
        });
      } catch (fetchError) {
        console.error('JUDGE0 DEBUG - Network error connecting to Judge0:', fetchError);
        throw new Error(`Failed to connect to Judge0 API at ${JUDGE0_API_URL}: ${fetchError.message}`);
      }
      
      console.log('JUDGE0 DEBUG - Submission response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('JUDGE0 DEBUG - Submission error:', errorText);
        throw new Error(`Failed to create submission: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      const submissionData = await response.json();
      console.log('JUDGE0 DEBUG - Submission data:', JSON.stringify(submissionData));
      
      if (!submissionData.token) {
        throw new Error('No submission token received');
      }
      
      // Poll for results
      return await this.getSubmissionResult(submissionData.token);
      
    } catch (error) {
      console.error('JUDGE0 DEBUG - Error submitting code:', error);
      return {
        status: {
          id: JUDGE_STATUS.INTERNAL_ERROR,
          description: 'Internal Error'
        },
        message: `Error submitting code: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Get results of a previous submission
   */
  private async getSubmissionResult(token: string): Promise<JudgeResult> {
    try {
      let result: JudgeResult | null = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      console.log('JUDGE0 DEBUG - Polling for results with token:', token);
      
      // Headers for the API request
      const headers: Record<string, string> = {};
      
      // Only add RapidAPI headers if we're using the RapidAPI endpoint
      if (JUDGE0_API_URL.includes('rapidapi.com') && JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
        headers['X-RapidAPI-Host'] = JUDGE0_API_HOST || '';
      }
      
      // Poll for results with exponential backoff
      while (!result && attempts < maxAttempts) {
        console.log(`JUDGE0 DEBUG - Polling attempt ${attempts + 1}/${maxAttempts}`);
        console.log('JUDGE0 DEBUG - Polling URL:', `${JUDGE0_API_URL}/submissions/${token}`);
        
        let response;
        try {
          response = await fetch(`${JUDGE0_API_URL}/submissions/${token}`, {
            method: 'GET',
            headers
          });
        } catch (fetchError) {
          console.error('JUDGE0 DEBUG - Network error polling Judge0:', fetchError);
          throw new Error(`Failed to connect to Judge0 API at ${JUDGE0_API_URL}: ${fetchError.message}`);
        }
        
        console.log('JUDGE0 DEBUG - Poll response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('JUDGE0 DEBUG - Poll error:', errorText);
          throw new Error(`Failed to get submission result: ${response.status} ${response.statusText}\n${errorText}`);
        }
        
        const data = await response.json();
        
        // Log raw response for debugging
        console.log('JUDGE0 DEBUG - Raw Judge0 response:', JSON.stringify(data, null, 2));
        
        // Check if processing is complete
        if (data.status.id !== 1 && data.status.id !== 2) {
          // Status is not In Queue or Processing, so we have a result
          console.log(`JUDGE0 DEBUG - Received final result with status: ${data.status.id} (${data.status.description})`);
          result = data;
          
          // Parse stdout if available to show test results
          if (data.stdout) {
            try {
              // Fix: Check if stdout starts with debug logs and extract the JSON part
              // Look for the JSON object which starts with {
              const stdout = data.stdout;
              console.log('JUDGE0 DEBUG - Raw stdout:', stdout);
              
              // Find the first { which likely indicates the start of JSON
              const jsonStartIndex = stdout.indexOf('{');
              if (jsonStartIndex !== -1) {
                const jsonPart = stdout.substring(jsonStartIndex);
                try {
                  const parsedOutput = JSON.parse(jsonPart);
                  console.log('JUDGE0 DEBUG - Parsed stdout results:', JSON.stringify(parsedOutput, null, 2));
                  
                  // Check specific fields important for binary search and linked list problems
                  if (parsedOutput.directOutput !== undefined) {
                    console.log('JUDGE0 DEBUG - Direct output:', parsedOutput.directOutput);
                  }
                  
                  if (parsedOutput.results && parsedOutput.results.length > 0) {
                    console.log('JUDGE0 DEBUG - First test case result:', JSON.stringify(parsedOutput.results[0]));
                    console.log('JUDGE0 DEBUG - Pass/fail summary:', 
                      `${parsedOutput.summary?.passed || 0}/${parsedOutput.summary?.total || 0} tests passed`);
                  }

                  // Update the stdout to just include the JSON part so other functions can parse it correctly
                  data.stdout = jsonPart;
                } catch (innerError) {
                  console.error('JUDGE0 DEBUG - Failed to parse JSON part:', innerError);
                }
              } else {
                console.error('JUDGE0 DEBUG - Could not find JSON start in stdout');
              }
            } catch (e) {
              console.error('JUDGE0 DEBUG - Failed to parse stdout JSON:', e);
              console.log('JUDGE0 DEBUG - Raw stdout:', data.stdout);
            }
          } else {
            console.log('JUDGE0 DEBUG - No stdout in response');
          }
          
          if (data.stderr) {
            console.log('JUDGE0 DEBUG - Stderr:', data.stderr);
          }
          
          if (data.compile_output) {
            console.log('JUDGE0 DEBUG - Compile output:', data.compile_output);
          }
        } else {
          // Still processing, wait before retrying
          console.log(`JUDGE0 DEBUG - Status still processing: ${data.status.id} (${data.status.description})`);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      
      if (!result) {
        console.log('JUDGE0 DEBUG - Timed out waiting for result');
        return {
          status: {
            id: JUDGE_STATUS.INTERNAL_ERROR,
            description: 'Timeout'
          },
          message: 'Timed out waiting for submission result'
        };
      }
      
      return result;
      
    } catch (error) {
      console.error('JUDGE0 DEBUG - Error getting submission result:', error);
      return {
        status: {
          id: JUDGE_STATUS.INTERNAL_ERROR,
          description: 'Internal Error'
        },
        message: `Error getting submission result: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Record a submission to Supabase for history/leaderboard
   */
  async saveSubmission(details: SubmissionDetails): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('code_submissions')
        .insert([details]);
        
      if (error) {
        console.error('Error saving submission:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving submission:', error);
      return false;
    }
  }
  
  /**
   * Get submission history for a user
   */
  async getUserSubmissions(userId: string): Promise<SubmissionDetails[]> {
    try {
      const { data, error } = await supabase
        .from('code_submissions')
        .select('*')
        .eq('userId', userId)
        .order('submittedAt', { ascending: false });
        
      if (error) {
        console.error('Error getting user submissions:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting user submissions:', error);
      return [];
    }
  }
}

// Create and export a singleton instance
export const submissionService = new SubmissionService();