import { supabase } from '../lib/supabase';

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
 * 2. Add an appropriate test runner in addTestRunner() that handles both multiple-parameter
 *    and single-parameter formats consistently
 * 3. Ensure the test runner follows the same output format for proper result comparison
 */

/**
 * USER CODE CONSOLE LOG CAPTURE SYSTEM
 * -----------------------------------
 * The test runners capture console.log/print statements from user code to help with debugging.
 * This is implemented differently for each language while following these principles:
 * 
 * 1. SAFETY: We never permanently override built-in functions
 * 2. CLEANUP: Always restore original functionality, especially in error cases
 * 3. ISOLATION: Only capture logs during the actual test execution
 * 4. CONSISTENCY: Provide a unified 'userLogs' array in the output format
 * 
 * Currently implemented for:
 * - JavaScript: Uses try/finally to safely wrap console.log override
 * - Python: Uses redirect_stdout from contextlib to capture print output
 * 
 * When adding support for a new language:
 * 
 * 1. CHOOSE THE RIGHT METHOD FOR THE LANGUAGE:
 *    - Prefer standard library methods for capturing output (e.g. stream redirection)
 *    - If overriding print functions, use try/finally or equivalent to ensure cleanup
 *    - For compiled languages, consider adding compiler flags or wrappers
 * 
 * 2. IMPLEMENT THE CAPTURE:
 *    - Create a userLogs array or equivalent to store captured output
 *    - Set up the capture mechanism before running user code
 *    - Ensure it doesn't interfere with the test runner's own output
 * 
 * 3. ENSURE PROPER CLEANUP:
 *    - Always restore original functions/streams in a finally block
 *    - Handle errors appropriately without breaking the test runner
 * 
 * 4. FORMAT THE OUTPUT:
 *    - Include captured logs in the output JSON as 'userLogs' array
 *    - Logs should be an array of strings, one per log line
 *    - Ensure the output structure matches the JavaScript and Python implementations
 * 
 * The UI expects userLogs in the output JSON and will display them in a collapsible section.
 */

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
      
      console.log('JUDGE0 DEBUG - Original code:', submission.source_code);
      console.log('JUDGE0 DEBUG - Modified code with test runner:', modifiedCode.substring(0, 500) + '... (truncated)');
      console.log('JUDGE0 DEBUG - Submitting to Judge0 with language_id:', submission.language_id);
      console.log('JUDGE0 DEBUG - Stdin input:', submission.stdin);
      
      // Headers for the API request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add API key headers if they exist
      if (JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
        headers['X-RapidAPI-Host'] = JUDGE0_API_HOST || '';
      }
      
      console.log('JUDGE0 DEBUG - Request headers:', JSON.stringify(headers));
      
      // Create a submission
      const response = await fetch(`${JUDGE0_API_URL}/submissions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...submission,
          source_code: modifiedCode
        })
      });
      
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
   * Adds a standard test runner to the code based on language
   * 
   * Test runners need to handle standardized input formats:
   * - For multiple parameters: Nested array format [[array], value]
   * - For single parameters: Standard JSON array [1,2,3]
   * - For special data structures: Standard formats that will be converted
   * 
   * @param code The user's source code
   * @param languageId The Judge0 language ID
   * @returns The code with the test runner added
   */
  private addTestRunner(code: string, languageId: number): string {
    console.log('JUDGE0 DEBUG - Adding test runner for language ID:', languageId);
    
    // JavaScript test runner
    if (languageId === LANGUAGE_IDS.javascript) {
      console.log('JUDGE0 DEBUG - Adding JavaScript test runner');
      
      return `
${code}

// Standard test runner for Judge0
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Debug to both console.error (for debugger) and a debug variable (for output inspection)
let debugInfo = ["TEST RUNNER DEBUG STARTS"];
function debug(...args) {
  const message = args.join(" ");
  debugInfo.push(message);
  console.error(message);
}

// Capture user's console.log statements in a safe way
let userLogs = [];
const originalConsoleLog = console.log;

// First remove comment blocks to avoid detecting functions in comments
const codeWithoutComments = ${JSON.stringify(code)}
  .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '') // Remove multi-line comments
  .replace(/\\/\\/.*$/gm, '');           // Remove single-line comments

debug("Code with comments removed (first 100 chars):", codeWithoutComments.substring(0, 100) + "...");

// Look for function definitions outside of comments
const fnMatch = /function\\s+([a-zA-Z0-9_]+)\\s*\\(/.exec(codeWithoutComments) || 
                /var\\s+([a-zA-Z0-9_]+)\\s*=\\s*function/.exec(codeWithoutComments) ||
                /const\\s+([a-zA-Z0-9_]+)\\s*=\\s*function/.exec(codeWithoutComments) ||
                /let\\s+([a-zA-Z0-9_]+)\\s*=\\s*function/.exec(codeWithoutComments);

const functionName = fnMatch ? fnMatch[1] : null;

debug("Detected function name:", functionName);

if (!functionName || functionName === 'ListNode') {
  debug("ERROR: Could not detect valid function name in code");
  console.log(JSON.stringify({
    error: "Could not detect valid solution function",
    debug: debugInfo,
    results: [],
    summary: { total: 0, passed: 0 }
  }));
  process.exit(1);
}

// Support for linked list problems - detect and create necessary constructors
const isLinkedListProblem = ${JSON.stringify(code)}.includes('Definition for singly-linked list');
if (isLinkedListProblem) {
  debug("Detected linked list problem definition");
  
  // Create ListNode constructor if not defined
  if (typeof ListNode === 'undefined') {
    function ListNode(val, next) {
      this.val = (val === undefined ? 0 : val);
      this.next = (next === undefined ? null : next);
    }
    global.ListNode = ListNode;
    debug("Created ListNode constructor");
  }
}

// Process input
let input = '';
rl.on('line', (line) => {
  input += line;
});

rl.on('close', () => {
  try {
    debug("Processing input:", input.substring(0, 100) + (input.length > 100 ? "..." : ""));
    
    // Override console.log safely with try/finally to guarantee cleanup
    try {
      console.log = function(...args) {
        const message = args.join(" ");
        userLogs.push(message);
        console.error("USER LOG:", message);
      };
    
      // Parse the input data which contains test cases
      const testData = JSON.parse(input);
      const results = [];
      let directOutput = null;
      
      // Check if we have a testCases array
      const testCases = testData.testCases || [testData];
      debug("Processing", testCases.length, "test cases");
      
      // Process each test case
      testCases.forEach((test, index) => {
        try {
          debug("-------------------------------------------");
          debug("Processing test case:", index + 1);
          debug("Input:", test.input);
          debug("Expected:", test.expected);
          
          // Parse the input
          let parsedInput = null;
          try {
            parsedInput = JSON.parse(test.input);
            debug("Successfully parsed JSON input:", JSON.stringify(parsedInput));
          } catch (e) {
            debug("Failed to parse as JSON, trying to handle legacy format:", test.input);
            
            // Handle the legacy format "[1,2,3], 4" by converting it to [[1,2,3], 4]
            const legacyMatch = test.input.match(/^(\[.+\]),\s*(.+)$/);
            if (legacyMatch) {
              try {
                const arrayPart = JSON.parse(legacyMatch[1]);
                const valuePart = JSON.parse(legacyMatch[2]);
                parsedInput = [arrayPart, valuePart];
                debug("Successfully converted legacy format to:", JSON.stringify(parsedInput));
              } catch (e2) {
                debug("Failed to parse legacy format:", e2.message);
                parsedInput = test.input;
              }
            } else {
              debug("Using input as-is (not valid JSON):", test.input);
              parsedInput = test.input;
            }
          }
          
          // Attempt to call the function
          let result = null;
          
          // Helper function to create a linked list
          function createLinkedList(arr) {
            if (!arr || arr.length === 0) return null;
            const dummy = new ListNode(0);
            let current = dummy;
            for (const val of arr) {
              current.next = new ListNode(val);
              current = current.next;
            }
            return dummy.next;
          }
          
          // Handle linked list input for linked list problems
          if (isLinkedListProblem && Array.isArray(parsedInput)) {
            debug("Creating linked list from array for " + functionName);
            const linkedList = createLinkedList(parsedInput);
            debug("Calling " + functionName + " with linked list");
            result = eval(\`\${functionName}(linkedList)\`);
            debug("Raw result from linked list call:", result);
          } 
          // Handle array with 2 elements where first is array - common for binary search etc
          else if (Array.isArray(parsedInput) && parsedInput.length === 2 && Array.isArray(parsedInput[0])) {
            debug("Calling " + functionName + " with array and value");
            result = eval(\`\${functionName}(\${JSON.stringify(parsedInput[0])}, \${JSON.stringify(parsedInput[1])})\`);
          }
          // Just pass array directly as the most common case
          else if (Array.isArray(parsedInput)) {
            debug("Calling " + functionName + " with array");
            result = eval(\`\${functionName}(\${JSON.stringify(parsedInput)})\`);
          }
          // Not an array
          else {
            debug("Calling " + functionName + " with single value");
            result = eval(\`\${functionName}(\${JSON.stringify(parsedInput)})\`);
          }
          
          // Format the result for output
          let formattedResult;
          debug("Raw result type:", typeof result);
          debug("Raw result value:", JSON.stringify(result));
          
          // Special handling for linked list problems
          if (isLinkedListProblem) {
            debug("Processing result as a linked list result");
            
            // Handle null and undefined (empty list case)
            if (result === null || result === undefined) {
              formattedResult = "[]";  // For linked lists, null should format to empty array
              debug("Null/undefined result formatted as empty array []");
            }
            // Handle when result is already an array (user returned array instead of linked list)
            else if (Array.isArray(result)) {
              formattedResult = JSON.stringify(result);
              debug("Result is already an array:", formattedResult);
            }
            // Handle when result is a linked list
            else if (result && typeof result === 'object' && 'val' in result && 'next' in result) {
              debug("Result is a linked list, converting to array");
              // Convert linked list to array for comparison
              const arr = [];
              let node = result;
              while (node) {
                arr.push(node.val);
                node = node.next;
              }
              formattedResult = JSON.stringify(arr);
              debug("Linked list converted to array:", formattedResult);
            }
            // Handle other types
            else {
              formattedResult = JSON.stringify(result);
              debug("Non-linked list result formatted as:", formattedResult);
            }
          }
          // Standard handling for non-linked list problems
          else {
            if (result === null || result === undefined) {
              formattedResult = "null";
              debug("Formatted as null");
            } else if (typeof result === 'boolean') {
              formattedResult = String(result).toLowerCase();
              debug("Formatted as boolean:", formattedResult);
            } else if (typeof result === 'number') {
              formattedResult = String(result);
              debug("Formatted as number:", formattedResult);
            } else {
              formattedResult = JSON.stringify(result);
              debug("Formatted as JSON:", formattedResult);
            }
          }
          
          // Compare with expected result
          const expected = test.expected || "";
          const passed = formattedResult === expected;
          debug("Expected result:", expected);
          debug("Actual formatted result:", formattedResult);
          debug("Test passed:", passed);
          
          // Add to results array
          results.push({
            input: test.input,
            output: formattedResult,
            expected: expected,
            passed: passed
          });
          
          // Store first result for direct output
          if (index === 0) {
            directOutput = formattedResult;
          }
        } catch (error) {
          debug("ERROR processing test case:", error.message);
          debug("Error stack:", error.stack);
          results.push({
            input: test.input,
            output: "null",
            error: error.message,
            expected: test.expected || "",
            passed: false
          });
        }
      });
      
      // Sort results to ensure consistent order - always show failing tests first
      results.sort((a, b) => {
        // First by pass/fail status (failing tests first)
        if (a.passed !== b.passed) {
          return a.passed ? 1 : -1;
        }
        // Then by input length (shorter inputs first)
        return a.input.length - b.input.length;
      });
      
      // Output a single JSON object with all results
      const output = {
        directOutput: directOutput,
        results: results,
        summary: {
          total: results.length,
          passed: results.filter(r => r.passed).length
        },
        debug: debugInfo,
        userLogs: userLogs
      };
      
      debug("Final summary:", \`\${output.summary.passed}/\${output.summary.total} tests passed\`);
      debug("TEST RUNNER DEBUG ENDS");
      
      // Output ONLY the JSON result to stdout
      console.log = originalConsoleLog; // Restore original console.log before final output
      console.log(JSON.stringify(output));
    } finally {
      // Always restore the original console.log function
      console.log = originalConsoleLog;
    }
  } catch (error) {
    debug("FATAL ERROR in test runner:", error.message);
    debug("Error stack:", error.stack);
    // Make sure to restore original console.log even in case of error
    console.log = originalConsoleLog;
    console.log(JSON.stringify({
      error: error.message,
      debug: debugInfo,
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
import io
from contextlib import redirect_stdout

def process_test_cases():
    try:
        # Read all input from stdin
        input_data = sys.stdin.read().strip()
        
        # Log to stderr for debugging
        print("DEBUG: Processing input: " + input_data[:100] + "...", file=sys.stderr)
        
        # Setup for capturing print statements safely
        user_logs = []
        
        # Parse the input data 
        test_data = json.loads(input_data)
        
        # Find all user-defined functions
        user_functions = [name for name, obj in globals().items() 
                         if callable(obj) and not name.startswith('__') 
                         and name != 'process_test_cases']
        
        print("DEBUG: Found functions: " + str(user_functions), file=sys.stderr)
        
        # Find the main function - use the first user function
        function_name = user_functions[0] if user_functions else None
        
        if not function_name:
            print("DEBUG: No function found", file=sys.stderr)
            print(json.dumps({
                "error": "Could not detect function",
                "results": [],
                "summary": {"total": 0, "passed": 0}
            }))
            return
        
        print("DEBUG: Using function: " + function_name, file=sys.stderr)
        func = globals()[function_name]
        
        # Extract test cases
        test_cases = test_data.get('testCases', [test_data])
        print("DEBUG: Processing " + str(len(test_cases)) + " test cases", file=sys.stderr)
        
        # Process each test case
        results = []
        direct_output = None
        
        for i, test in enumerate(test_cases):
            try:
                print("DEBUG: Processing test case " + str(i+1), file=sys.stderr)
                print("DEBUG: Input: " + test.get('input', ''), file=sys.stderr)
                
                # Parse the input as an array of arguments
                args = json.loads(test.get('input', '[]'))
                print("DEBUG: Parsed args: " + str(args), file=sys.stderr)
                
                # Use redirect_stdout to safely capture print statements
                stdout_capture = io.StringIO()
                
                # Call the function and capture any prints
                with redirect_stdout(stdout_capture):
                    # Try multiple ways to call the function
                    result = None
                    if isinstance(args, list):
                        # Try first with unpacking
                        try:
                            print("DEBUG: Trying to unpack args", file=sys.stderr)
                            result = func(*args)
                        except Exception as e:
                            print("DEBUG: Unpacking failed: " + str(e), file=sys.stderr)
                            print("DEBUG: Trying as single argument", file=sys.stderr)
                            # If that fails, try as single arg
                            result = func(args)
                    else:
                        # Pass as single argument
                        print("DEBUG: Calling with single arg", file=sys.stderr)
                        result = func(args)
                
                # Get captured print statements
                captured_output = stdout_capture.getvalue()
                if captured_output.strip():
                    # Add to log if there was any output
                    print("DEBUG: Captured user print: " + captured_output, file=sys.stderr)
                    user_logs.extend(captured_output.strip().split('\\n'))
                
                print("DEBUG: Raw result: " + str(result), file=sys.stderr)
                
                # Format the result
                if result is None:
                    formatted_result = "null"
                elif isinstance(result, bool):
                    formatted_result = str(result).lower()
                elif isinstance(result, (int, float)):
                    formatted_result = str(result)
                else:
                    formatted_result = json.dumps(result)
                
                print("DEBUG: Formatted result: " + formatted_result, file=sys.stderr)
                
                # Save the first result as direct output
                if i == 0:
                    direct_output = formatted_result
                
                # Get expected output
                expected = test.get('expected', '')
                passed = formatted_result == expected
                print("DEBUG: Expected: " + expected, file=sys.stderr)
                print("DEBUG: Passed: " + str(passed), file=sys.stderr)
                
                # Add to results
                results.append({
                    "input": test.get('input', ''),
                    "output": formatted_result,
                    "expected": expected,
                    "passed": passed
                })
                
            except Exception as e:
                print("DEBUG: Error processing test: " + str(e), file=sys.stderr)
                print(traceback.format_exc(), file=sys.stderr)
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
            },
            "userLogs": user_logs
        }
        
        print("DEBUG: Final summary: " + str(output["summary"]["passed"]) + "/" + 
              str(output["summary"]["total"]) + " tests passed", file=sys.stderr)
        
        # Output as JSON
        print(json.dumps(output))
        
    except Exception as e:
        print("DEBUG: Fatal error in test runner: " + str(e), file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        print(json.dumps({
            "error": str(e),
            "results": [],
            "summary": {"total": 0, "passed": 0}
        }))

# Run the processing
process_test_cases()`;
    }
    
    // For other languages, return the original code
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
      
      console.log('JUDGE0 DEBUG - Polling for results with token:', token);
      
      // Headers for the API request
      const headers: Record<string, string> = {};
      
      // Add API key headers if they exist
      if (JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
        headers['X-RapidAPI-Host'] = JUDGE0_API_HOST || '';
      }
      
      // Poll for results with exponential backoff
      while (!result && attempts < maxAttempts) {
        console.log(`JUDGE0 DEBUG - Polling attempt ${attempts + 1}/${maxAttempts}`);
        
        const response = await fetch(`${JUDGE0_API_URL}/submissions/${token}`, {
          method: 'GET',
          headers
        });
        
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