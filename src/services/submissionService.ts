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
    try {
      // Check if Judge0 is configured
      if (!JUDGE0_API_URL) {
        throw new Error('Judge0 API URL is not configured');
      }
      
      // Prepare code for submission by adding standard test runner
      const modifiedCode = this.addTestRunner(submission.source_code, submission.language_id);
      
      console.log('Submitting code to Judge0 at:', JUDGE0_API_URL);
      
      // Headers for the API request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add API key headers if they exist
      if (JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
        headers['X-RapidAPI-Host'] = JUDGE0_API_HOST || '';
      }
      
      // Create a submission
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
   * Adds a standard test runner to the code based on language
   */
  private addTestRunner(code: string, languageId: number): string {
    // JavaScript (Node.js) test runner
    if (languageId === LANGUAGE_IDS.javascript) {
      return `
${code}

// Standard test runner
const runTests = async (userCode) => {
  let input = '';
  process.stdin.setEncoding('utf8');

  // Read all data from stdin asynchronously
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  if (!input) {
      console.error(JSON.stringify({ error: "No input received via stdin" }));
      return;
  }
  
  try {
    // Parse test cases from input
    const testData = JSON.parse(input);
    
    // Determine function name by analyzing the code
    const fnMatch = userCode.match(/function\\s+([a-zA-Z0-9_]+)\\s*\\(/);
    const functionName = fnMatch ? fnMatch[1] : null;
    
    if (!functionName) {
      console.error(JSON.stringify({ error: "Could not detect function name" }));
      return;
    }
    
    // Execute the test cases
    const results = testData.testCases.map(test => {
      try {
        // Parse args from test input
        const args = JSON.parse(test.input);
        
        // Call the function with the test input
        const result = Array.isArray(args) 
          ? eval(functionName + '(' + args.map(JSON.stringify).join(',') + ')')
          : eval(functionName + '(' + JSON.stringify(args) + ')');
        
        // Format result for comparison
        const output = JSON.stringify(result);
        
        // Instead of hardcoding for specific problems, properly handle output vs. expected field name difference
        // The test case might have output field (from the JSON test files) but our test runner expects expected
        const expected = test.expected !== undefined ? test.expected : 
                         test.output !== undefined ? test.output : "undefined";
        
        return {
          input: test.input,
          output: output,
          expected: expected,
          passed: output === expected
        };
      } catch (e) {
        return {
          input: test.input,
          error: e.message,
          passed: false
        };
      }
    });
    
    // Output the results in JSON format
    console.log(JSON.stringify({
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length
      }
    }));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
  }
};

// Execute tests
runTests(${JSON.stringify(code)});
`;
    }
    
    // Python test runner
    if (languageId === LANGUAGE_IDS.python) {
      return `
${code}

# Standard test runner
import sys
import json

def run_tests():
    try:
        # Read input from stdin
        input_data = sys.stdin.read().strip()
        test_data = json.loads(input_data)
        
        # Get the function name from the code
        import re
        fn_match = re.search(r'def\\s+([a-zA-Z0-9_]+)\\s*\\(', globals()['__code__'])
        function_name = fn_match.group(1) if fn_match else None
        
        if not function_name or function_name not in globals():
            print(json.dumps({"error": "Could not detect function"}))
            return
            
        # Execute test cases
        results = []
        for test in test_data["testCases"]:
            try:
                args = json.loads(test["input"])
                func = globals()[function_name]
                
                # Call the function with args
                if isinstance(args, list):
                    result = func(*args)
                else:
                    result = func(args)
                    
                # Format output for comparison
                output = json.dumps(result)
                
                results.append({
                    "input": test["input"],
                    "output": output,
                    "expected": test["expected"],
                    "passed": output == test["expected"]
                })
            except Exception as e:
                results.append({
                    "input": test["input"],
                    "error": str(e),
                    "passed": False
                })
                
        # Output results
        print(json.dumps({
            "results": results,
            "summary": {
                "total": len(results),
                "passed": sum(1 for r in results if r.get("passed", False))
            }
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

# Save code for inspection
globals()['__code__'] = '''${code}'''

# Run tests
run_tests()`;
    }
    
    // For other languages, return the original code (placeholder for future implementations)
    return code;
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
      
      // Add API key headers if they exist
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
}

// Create and export a singleton instance
export const submissionService = new SubmissionService(); 