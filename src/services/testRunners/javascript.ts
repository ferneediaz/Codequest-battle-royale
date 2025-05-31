/**
 * JavaScript test runner for Judge0 submissions
 */
export function generateJavaScriptTestRunner(code: string): string {
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

// First remove comment blocks to avoid detecting functions in comments
const codeWithoutComments = ${JSON.stringify(code)}
  .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '') // Remove multi-line comments
  .replace(/\\/\\/.*$/gm, '');           // Remove single-line comments

debug("Code with comments removed (first 100 chars):", codeWithoutComments.substring(0, 100) + "...");

// Look for function definitions outside of comments
const fnMatch = /\\bfunction\\s+([a-zA-Z0-9_]+)\\s*\\(/.exec(codeWithoutComments) || 
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

// Detect if user wrote their own console.log
const userHasConsoleLog = /console\\.log\\s*\\(/.test(codeWithoutComments);

/**
 * Parses comma-separated string inputs into proper JavaScript arguments
 * 
 * @param input - A string like "\"anagram\", \"nagaram\"" or other formatted input
 * @returns The properly parsed arguments array
 */
function parseInputParameters(input) {
  // If input is already in array format, return it
  if (input.trim().startsWith('[') && input.trim().endsWith(']')) {
    try {
      return JSON.parse(input);
    } catch (e) {
      debug('Failed to parse input as JSON array:', e);
    }
  }

  // If input is comma-separated strings like "\"string1\", \"string2\""
  if (input.includes(',') && input.includes('"')) {
    // Extract quoted strings using regex
    const regex = /"([^"]*)"/g;
    const matches = [...input.matchAll(regex)];
    if (matches.length > 0) {
      debug('Extracted strings from quotes:', matches.map(m => m[1]));
      return matches.map(match => match[1]);
    }
  }

  // Return original input as single element array if all else fails
  return [input];
}

// Process input
let input = '';
rl.on('line', (line) => {
  input += line;
});

rl.on('close', () => {
  try {
    debug("Processing input:", input.substring(0, 100) + (input.length > 100 ? "..." : ""));
    
    // Parse the input data which contains test cases
    const testData = JSON.parse(input);
    const results = [];
    let directOutput = null;
    let allUserLogs = [];
    
    // Save the original console.log ONCE at the top level
    const originalConsoleLog = console.log;
    
    // Check if we have a testCases array
    const testCases = testData.testCases || [testData];
    debug("Processing", testCases.length, "test cases");
    
    // Process each test case
    testCases.forEach((test, index) => {
      // Create a completely isolated environment for each test
      let testLogs = [];
      
      // Override console.log for this test only
      console.log = function(...args) {
        const message = args.join(" ");
        testLogs.push(message);
        allUserLogs.push(message);
        console.error("USER LOG:", message);
      };
      
      try {
        debug("-------------------------------------------");
        debug("Processing test case:", index + 1);
        debug("Input:", test.input);
        debug("Expected:", test.expected);
        
        // Parse the input using our parameter parsing function
        const args = parseInputParameters(test.input);
        debug("Parsed arguments:", JSON.stringify(args));
        
        // Format arguments for eval
        const argsStr = args.map(arg => JSON.stringify(arg)).join(', ');
        debug("Formatted args string:", argsStr);
        
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
        if (isLinkedListProblem && Array.isArray(args) && args.length === 1 && Array.isArray(args[0])) {
          debug("Creating linked list from array for " + functionName);
          const linkedList = createLinkedList(args[0]);
          debug("Calling " + functionName + " with linked list");
          result = eval(\`\${functionName}(linkedList)\`);
          debug("Raw result from linked list call:", result);
        } else {
          // Use the parsed arguments
          debug("Calling " + functionName + " with parsed arguments");
          result = eval(\`\${functionName}(\${argsStr})\`);
          debug("Raw result:", result);
        }
        
        // Format the result for output
        let formattedResult;
        debug("Raw result type:", typeof result);
        debug("Raw result value:", JSON.stringify(result));
        
        // Special handling for linked list problems
        if (isLinkedListProblem) {
          debug("Processing result as a linked list result");
          if (result === null || result === undefined) {
            formattedResult = "[]";  // For linked lists, null should format to empty array
            debug("Null/undefined result formatted as empty array []");
          } else if (Array.isArray(result)) {
            formattedResult = JSON.stringify(result);
            debug("Result is already an array:", formattedResult);
          } else if (result && typeof result === 'object' && 'val' in result && 'next' in result) {
            debug("Result is a linked list, converting to array");
            const arr = [];
            let node = result;
            while (node) {
              arr.push(node.val);
              node = node.next;
            }
            formattedResult = JSON.stringify(arr);
            debug("Linked list converted to array:", formattedResult);
          } else {
            formattedResult = JSON.stringify(result);
            debug("Non-linked list result formatted as:", formattedResult);
          }
        } else {
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
        
        const expected = test.expected || "";
        const passed = formattedResult === expected;
        debug("Expected result:", expected);
        debug("Actual formatted result:", formattedResult);
        debug("Test passed:", passed);
        
        results.push({
          input: test.input,
          output: formattedResult,
          expected: expected,
          passed: passed,
          logs: testLogs.slice(), // Create a copy to ensure isolation
          originalIndex: index // Store the original index to maintain order
        });
        
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
          passed: false,
          logs: testLogs.slice(), // Create a copy to ensure isolation
          originalIndex: index
        });
      } finally {
        // Restore console.log for the next test
        console.log = originalConsoleLog;
      }
    });
    
    // Sort results to maintain original order
    results.sort((a, b) => a.originalIndex - b.originalIndex);
    
    // Create final output
    const output = {
      directOutput,
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length
      },
      userLogs: allUserLogs,
      debug: debugInfo
    };
    
    debug("Final summary:", output.summary.passed + "/" + output.summary.total + " tests passed");
    debug("Final output:", JSON.stringify(output).substring(0, 200) + "...");
    
    // Output the result
    console.log(JSON.stringify(output));
    
  } catch (error) {
    debug("FATAL ERROR:", error.message);
    debug("Error stack:", error.stack);
    console.log(JSON.stringify({
      error: error.message,
      debug: debugInfo,
      results: [],
      summary: { total: 0, passed: 0 }
    }));
  }
});
`;
} 