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
    // If no Judge0 API key is configured, use mock mode
    if (!JUDGE0_API_KEY) {
      console.log('No Judge0 API key found, using mock mode');
      return this.mockSubmission(submission);
    }
    
    try {
      // First create a submission
      const response = await fetch(`${JUDGE0_API_URL}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': JUDGE0_API_KEY,
          'X-RapidAPI-Host': JUDGE0_API_HOST
        },
        body: JSON.stringify(submission)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create submission: ${response.statusText}`);
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
   * Get results of a previous submission
   */
  private async getSubmissionResult(token: string): Promise<JudgeResult> {
    try {
      let result: JudgeResult | null = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      // Poll for results with exponential backoff
      while (!result && attempts < maxAttempts) {
        const response = await fetch(`${JUDGE0_API_URL}/submissions/${token}`, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': JUDGE0_API_KEY,
            'X-RapidAPI-Host': JUDGE0_API_HOST
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to get submission result: ${response.statusText}`);
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
            
            // For testing, assume the last expression is the function call
            // This is very naive and just for demonstration
            const inputLines = \`${submission.stdin}\`.split('\\n');
            const parsed = inputLines.map(line => {
              try { return JSON.parse(line); } 
              catch { return line; }
            });
            
            // Try to find a function to call
            const fnMatch = ${submission.source_code}.match(/function\\s+([a-zA-Z0-9_]+)\\s*\\(/);
            if (fnMatch && fnMatch[1]) {
              const result = eval(fnMatch[1] + '(' + parsed + ')');
              if (result !== undefined) {
                console.log(JSON.stringify(result));
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
  }> {
    const languageId = LANGUAGE_IDS[language as keyof typeof LANGUAGE_IDS];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    const results: JudgeResult[] = [];
    let passed = 0;
    
    for (const testCase of testCases) {
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
      }
    }
    
    return {
      passed,
      total: testCases.length,
      results
    };
  }
}

// Create and export a singleton instance
export const submissionService = new SubmissionService(); 