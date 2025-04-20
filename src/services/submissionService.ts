import { supabase } from '../lib/supabase';

// Judge0 language IDs
export const LANGUAGE_IDS = {
  javascript: 63,  // JavaScript (Node.js v12.14.0)
  python: 71,      // Python (3.8.1)
  java: 62,        // Java (OpenJDK 13.0.1)
  cpp: 54,         // C++ (GCC 9.2.0)
  c: 50,           // C (GCC 9.2.0)
  ruby: 72,        // Ruby (2.7.0)
  go: 60,          // Go (1.13.5)
  rust: 73,        // Rust (1.40.0)
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

// Access the Judge0 API URL from environment variables
const JUDGE0_API_URL = import.meta.env.VITE_JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = import.meta.env.VITE_JUDGE0_API_KEY;
const JUDGE0_API_HOST = import.meta.env.VITE_JUDGE0_API_HOST;

class SubmissionService {
  /**
   * Submit code to Judge0 and get results
   */
  async submitCode(submission: JudgeSubmission): Promise<JudgeResult> {
    // If no Judge0 API key is configured, use mock mode or connect to local instance
    // But always use the API if running against a local Judge0 instance
    if (!JUDGE0_API_KEY && !JUDGE0_API_URL.includes('localhost')) {
      console.log('No Judge0 API key found, using mock mode');
      return this.mockSubmission(submission);
    }
    
    try {
      // Prepare code for submission - add output for array problems
      let modifiedCode = submission.source_code;
      
      // For array problems like the merge function, add auto-printing of result
      if (submission.stdin.includes('[') && (
          modifiedCode.includes('function merge(') || 
          modifiedCode.includes('var merge =') || 
          modifiedCode.includes('const merge =')
      )) {
        // Add a wrapper that processes the input and prints output
        modifiedCode = this.addPrintOutputForMergeProblem(modifiedCode, submission.stdin);
      }
      
      console.log('Submitting code to Judge0 at:', JUDGE0_API_URL);
      
      // Headers for the API request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Only add API key headers if they exist
      if (JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
        headers['X-RapidAPI-Host'] = JUDGE0_API_HOST || '';
      }
      
      // First create a submission
      const response = await fetch(`${JUDGE0_API_URL}/submissions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...submission,
          source_code: modifiedCode
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create submission: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      const submissionData = await response.json();
      
      if (!submissionData.token) {
        throw new Error('No submission token received');
      }
      
      // Poll for results
      return await this.getSubmissionResult(submissionData.token);
      
    } catch (error) {
      console.error('Error submitting code:', error);
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
   * Add code to print the output for the merge problem
   */
  private addPrintOutputForMergeProblem(code: string, input: string): string {
    // Create a version of the code that includes printing the output
    const originalCode = code;
    
    // Extract the input parameters - updated regex to handle empty arrays
    const match = input.match(/(\[.*?\])\s*,\s*(\d+)\s*,\s*(\[.*?\])\s*,\s*(\d+)/);
    if (!match) return code;
    
    const [_, nums1Str, mStr, nums2Str, nStr] = match;
    
    // Create a complete solution with the original code plus output printing
    return `${originalCode}

// Auto-added output code for Judge0
const nums1 = ${nums1Str};
const m = ${mStr};
const nums2 = ${nums2Str};
const n = ${nStr};

merge(nums1, m, nums2, n);

// Print the result for Judge0 to check
console.log(JSON.stringify(nums1));`;
  }
  
  /**
   * Get results of a previous submission
   */
  private async getSubmissionResult(token: string): Promise<JudgeResult> {
    try {
      let result: JudgeResult | null = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      // Headers for the API request
      const headers: Record<string, string> = {};
      
      // Only add API key headers if they exist
      if (JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
        headers['X-RapidAPI-Host'] = JUDGE0_API_HOST || '';
      }
      
      // Poll for results with exponential backoff
      while (!result && attempts < maxAttempts) {
        const response = await fetch(`${JUDGE0_API_URL}/submissions/${token}`, {
          method: 'GET',
          headers
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get submission result: ${response.status} ${response.statusText}\n${errorText}`);
        }
        
        const data = await response.json();
        
        // Check if processing is complete
        if (data.status.id !== 1 && data.status.id !== 2) {
          // Status is not In Queue or Processing, so we have a result
          result = data;
        } else {
          // Still processing, wait before retrying
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      
      if (!result) {
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
      console.error('Error getting submission result:', error);
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
  
  /**
   * Mock submission for testing without Judge0
   */
  private mockSubmission(submission: JudgeSubmission): JudgeResult {
    console.log('Mocking submission:', submission);
    
    // Simple mock implementation for JavaScript
    if (submission.language_id === LANGUAGE_IDS.javascript) {
      try {
        // DANGER: Don't do this in production!
        // This is just for local development without Judge0
        // eslint-disable-next-line no-eval
        const mockEval = new Function('input', `
          // Mock console.log to capture output
          let output = '';
          const originalLog = console.log;
          console.log = (...args) => {
            output += args.join(' ') + '\\n';
          };
          
          try {
            ${submission.source_code}
            
            // Parse input - handle array problems specifically
            const inputStr = \`${submission.stdin}\`;
            console.log("Processing input:", inputStr);
            
            // For Merge Sorted Array problem
            if (inputStr.includes('[') && inputStr.includes(']')) {
              try {
                // Try to parse as JSON arrays and numbers
                const parts = inputStr.split(',').map(part => part.trim());
                const params = [];
                
                let currentStr = '';
                let bracketCount = 0;
                
                // Parse input ensuring we handle nested arrays correctly
                for (let i = 0; i < parts.length; i++) {
                  const part = parts[i];
                  
                  currentStr += (i > 0 ? ',' : '') + part;
                  
                  bracketCount += (part.match(/\\[/g) || []).length;
                  bracketCount -= (part.match(/\\]/g) || []).length;
                  
                  if (bracketCount === 0 && currentStr.trim() !== '') {
                    // Try to parse as JSON, fall back to string if it fails
                    try {
                      // If it's a complete array
                      if (currentStr.trim().startsWith('[') && currentStr.trim().endsWith(']')) {
                        params.push(JSON.parse(currentStr));
                      } else {
                        // If it's just a number
                        params.push(parseInt(currentStr));
                      }
                    } catch (e) {
                      params.push(currentStr);
                    }
                    currentStr = '';
                  }
                }
                
                // Find merge function
                if (submission.source_code.includes('function merge') && params.length >= 3) {
                  const result = merge(...params);
                  
                  // The result should already be logged by the function itself
                  // We don't need to do anything extra here
                }
              } catch (e) {
                console.error("Error parsing input:", e);
                output += "Error: " + e.message + "\\n";
              }
            } else {
              // Fall back to generic function detection
              const fnMatch = ${submission.source_code}.match(/function\\s+([a-zA-Z0-9_]+)\\s*\\(/);
              if (fnMatch && fnMatch[1]) {
                try {
                  // Simple string splitting for basic input parsing
                  const inputParts = inputStr.split(',').map(p => p.trim());
                  const result = eval(fnMatch[1] + '(' + inputParts.join(',') + ')');
                  if (result !== undefined && typeof result !== 'undefined') {
                    console.log(JSON.stringify(result));
                  }
                } catch (e) {
                  console.error("Error calling function:", e);
                  output += "Error: " + e.message + "\\n";
                }
              }
            }
            
            // Restore console.log
            console.log = originalLog;
            return output;
          } catch (e) {
            // Restore console.log
            console.log = originalLog;
            throw e;
          }
        `);
        
        const stdout = mockEval('');
        
        // Compare with expected output if provided
        if (submission.expected_output && stdout.trim() !== submission.expected_output.trim()) {
          return {
            status: {
              id: JUDGE_STATUS.WRONG_ANSWER,
              description: 'Wrong Answer'
            },
            stdout,
            time: '0.01',
            memory: 9388
          };
        }
        
        return {
          status: {
            id: JUDGE_STATUS.ACCEPTED,
            description: 'Accepted'
          },
          stdout,
          time: '0.01',
          memory: 9388
        };
      } catch (error) {
        return {
          status: {
            id: JUDGE_STATUS.RUNTIME_ERROR,
            description: 'Runtime Error'
          },
          stderr: `${error instanceof Error ? error.message : 'Unknown error'}`,
          time: '0.01',
          memory: 9388
        };
      }
    }
    
    // For other languages, return a dummy result
    if (Math.random() > 0.3) {
      return {
        status: {
          id: JUDGE_STATUS.ACCEPTED,
          description: 'Accepted'
        },
        stdout: submission.expected_output || 'Mocked output',
        time: '0.02',
        memory: 10240
      };
    } else {
      return {
        status: {
          id: JUDGE_STATUS.WRONG_ANSWER,
          description: 'Wrong Answer'
        },
        stdout: 'Mocked incorrect output',
        time: '0.02',
        memory: 10240
      };
    }
  }
  
  /**
   * Run test cases for a solution
   */
  async runTestCases(code: string, language: string, testCases: any[]): Promise<{
    passed: number;
    total: number;
    results: JudgeResult[];
    failedTests?: Array<{
      input: string;
      expected: string;
      actual: string;
      index: number;
    }>;
  }> {
    const languageId = LANGUAGE_IDS[language as keyof typeof LANGUAGE_IDS];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    const results: JudgeResult[] = [];
    let passed = 0;
    const failedTests: Array<{
      input: string;
      expected: string;
      actual: string;
      index: number;
    }> = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const result = await this.submitCode({
        source_code: code,
        language_id: languageId,
        stdin: testCase.input,
        expected_output: testCase.output,
        cpu_time_limit: 5, // 5 seconds
        memory_limit: 128000 // 128 MB
      });
      
      results.push(result);
      
      if (result.status.id === JUDGE_STATUS.ACCEPTED) {
        passed++;
      } else {
        // Collect details about failed test
        failedTests.push({
          input: testCase.input,
          expected: testCase.output,
          actual: result.stdout || "No output",
          index: i + 1
        });
      }
    }
    
    return {
      passed,
      total: testCases.length,
      results,
      failedTests: failedTests.length > 0 ? failedTests : undefined
    };
  }
}

// Create and export a singleton instance
export const submissionService = new SubmissionService(); 