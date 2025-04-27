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
        
        // Parse the input
        let parsedInput = null;
        try {
          parsedInput = JSON.parse(test.input);
          debug("Successfully parsed JSON input:", JSON.stringify(parsedInput));
        } catch (e) {
          debug("Failed to parse as JSON, trying to handle legacy format:", test.input);
          // Handle the legacy format "[1,2,3], 4" by converting it to [[1,2,3], 4]
          const legacyMatch = test.input.match(/^(\\[.+\\]),\\s*(.+)$/);
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
        
        // Only inject debug log if user did NOT write their own console.log
        if (!userHasConsoleLog) {
          console.log("Function called with input:", Array.isArray(parsedInput) ? parsedInput.join(",") : parsedInput);
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
          originalIndex: index // Store the original index to maintain order
        });
      } finally {
        // No need to restore console.log here as we'll do it once at the end
        // We want to keep capturing logs across all tests
      }
    });

    // Don't sort the results - preserve the original order to maintain log correspondence
    // Or restore the original test order after sorting
    results.sort((a, b) => {
      // First preserve order by original index
      return a.originalIndex - b.originalIndex;
    });

    const output = {
      directOutput: directOutput,
      results: results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length
      },
      debug: debugInfo,
      userLogs: allUserLogs
    };
    debug("Final summary:", \`\${output.summary.passed}/\${output.summary.total} tests passed\`);
    debug("TEST RUNNER DEBUG ENDS");
    
    // Now restore the original console.log at the very end, after all tests
    console.log = originalConsoleLog;
    console.log(JSON.stringify(output));
  } catch (error) {
    debug("FATAL ERROR in test runner:", error.message);
    debug("Error stack:", error.stack);
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