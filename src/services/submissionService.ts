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
    // JavaScript test runner
    if (languageId === LANGUAGE_IDS.javascript) {
      return `
${code}

// Standard test runner for Judge0
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Get function name from the code
const fnMatch = /function\\s+([a-zA-Z0-9_]+)\\s*\\(/.exec(${JSON.stringify(code)});
const functionName = fnMatch ? fnMatch[1] : null;

if (!functionName) {
  console.log(JSON.stringify({
    error: "Could not detect function name",
    results: [],
    summary: { total: 0, passed: 0 }
  }));
  process.exit(1);
}

// Count parameters in function definition
const paramMatch = /function\\s+[a-zA-Z0-9_]+\\s*\\(([^)]*?)\\)/.exec(${JSON.stringify(code)});
const paramCount = paramMatch ? paramMatch[1].split(',').filter(p => p.trim()).length : 0;

// Process input
let input = '';
rl.on('line', (line) => {
  input += line;
});

rl.on('close', () => {
  try {
    // Parse the input data which contains test cases
    const testData = JSON.parse(input);
    const results = [];
    let directOutput = null;
    
    // Check if we have a testCases array
    const testCases = testData.testCases || [testData];
    
    // Process each test case
    testCases.forEach((test, index) => {
      try {
        // Parse the input for this test case as an array of arguments
        const args = JSON.parse(test.input);
        
        // Call the function with the arguments
        let result;
        if (Array.isArray(args)) {
          // Check if function expects a single array or multiple parameters
          if (paramCount === 1) {
            // Pass the array as a single parameter
            result = eval(\`\${functionName}(\${JSON.stringify(args)})\`);
          } else {
            // If args is an array of arguments, spread them when calling the function
            result = eval(\`\${functionName}(...\${JSON.stringify(args)})\`);
          }
        } else {
          // If args is a single argument, call directly
          result = eval(\`\${functionName}(\${JSON.stringify(args)})\`);
        }
        
        // Format the result for output
        let formattedResult;
        if (result === null || result === undefined) {
          formattedResult = "null";
        } else if (typeof result === 'boolean') {
          formattedResult = String(result).toLowerCase();
        } else if (typeof result === 'number') {
          formattedResult = String(result);
        } else {
          formattedResult = JSON.stringify(result);
        }
        
        // Compare with expected result
        const expected = test.expected || "";
        const passed = formattedResult === expected;
        
        // Add to results array
        results.push({
          input: test.input,
          output: formattedResult,
          expected: expected,
          passed: passed
        });
        
        // Store first result for direct output (Judge0 will use this)
        if (index === 0) {
          directOutput = formattedResult;
        }
      } catch (error) {
        results.push({
          input: test.input,
          output: "null",
          error: error.message,
          expected: test.expected || "",
          passed: false
        });
      }
    });
    
    // Output a single JSON object with all results
    const output = {
      directOutput: directOutput,
      results: results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length
      }
    };
    
    // Output the JSON result to stdout
    console.log(JSON.stringify(output));
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message,
      results: [],
      summary: { total: 0, passed: 0 }
    }));
  }
});`;
    }
    
    // Python test runner
    if (languageId === LANGUAGE_IDS.python) {
      return `
${code}

# Standard test runner for Judge0
import sys
import json
import traceback
import inspect

def process_test_cases():
    try:
        # Read all input from stdin
        input_data = sys.stdin.read().strip()
        
        # Parse the input data 
        test_data = json.loads(input_data)
        
        # Find all user-defined functions
        user_functions = [name for name, obj in globals().items() 
                         if callable(obj) and not name.startswith('__') 
                         and name != 'process_test_cases']
        
        # Find the main function - use the first user function
        function_name = user_functions[0] if user_functions else None
        
        if not function_name:
            print(json.dumps({
                "error": "Could not detect function",
                "results": [],
                "summary": {"total": 0, "passed": 0}
            }))
            return
        
        func = globals()[function_name]
        
        # Check function signature to determine if it expects a single list or multiple args
        # Get the number of required parameters
        signature = inspect.signature(func)
        param_count = sum(1 for p in signature.parameters.values() 
                        if p.default == inspect.Parameter.empty and 
                           p.kind == inspect.Parameter.POSITIONAL_OR_KEYWORD)
        
        # Extract test cases
        test_cases = test_data.get('testCases', [test_data])
        
        # Process each test case
        results = []
        direct_output = None
        
        for i, test in enumerate(test_cases):
            try:
                # Parse the input as an array of arguments
                args = json.loads(test.get('input', '[]'))
                
                # Call the function with appropriate arguments
                result = None
                if isinstance(args, list):
                    # Check if function expects a single list or multiple arguments
                    if param_count == 1:
                        # Pass the entire list as a single argument
                        result = func(args)
                    else:
                        # Unpack args as multiple arguments
                        result = func(*args)
                else:
                    # Pass as single argument
                    result = func(args)
                
                # Format the result
                if result is None:
                    formatted_result = "null"
                elif isinstance(result, bool):
                    formatted_result = str(result).lower()
                elif isinstance(result, (int, float)):
                    formatted_result = str(result)
                else:
                    formatted_result = json.dumps(result)
                
                # Save the first result as direct output
                if i == 0:
                    direct_output = formatted_result
                
                # Get expected output
                expected = test.get('expected', '')
                passed = formatted_result == expected
                
                # Add to results
                results.append({
                    "input": test.get('input', ''),
                    "output": formatted_result,
                    "expected": expected,
                    "passed": passed
                })
                
            except Exception as e:
                results.append({
                    "input": test.get('input', ''),
                    "output": "null",
                    "error": str(e),
                    "expected": test.get('expected', ''),
                    "passed": False
                })
        
        # Format output
        output = {
            "directOutput": direct_output,
            "results": results,
            "summary": {
                "total": len(results),
                "passed": sum(1 for r in results if r.get("passed", False))
            }
        }
        
        # Output as JSON
        print(json.dumps(output))
        
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "results": [],
            "summary": {"total": 0, "passed": 0}
        }))

# Run the processing
process_test_cases()`;
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
        
        // Log raw response for debugging
        console.log('Raw Judge0 response:', JSON.stringify(data, null, 2));
        
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