/**
 * Python test runner for Judge0 submissions
 */
export function generatePythonTestRunner(code: string): string {
  return `
${code}

# Standard test runner for Judge0
import sys
import json
import traceback
import inspect
import io
import re
from contextlib import redirect_stdout

def parse_input_parameters(input_str):
    """
    Parse input parameters from various formats
    
    Args:
        input_str: A string like "\"anagram\", \"nagaram\"" or other formatted input
        
    Returns:
        The properly parsed arguments list
    """
    # First try to parse as JSON
    try:
        # If it's a valid JSON array, return it directly
        if input_str.strip().startswith('[') and input_str.strip().endswith(']'):
            return json.loads(input_str)
    except Exception as e:
        print(f"DEBUG: Failed to parse as JSON: {e}", file=sys.stderr)
    
    # If input is comma-separated strings like "\"string1\", \"string2\""
    if ',' in input_str and '"' in input_str:
        # Extract quoted strings using regex
        matches = re.findall(r'"([^"]*)"', input_str)
        if matches:
            print(f"DEBUG: Extracted strings from quotes: {matches}", file=sys.stderr)
            return matches
    
    # Return original input as single element list if all else fails
    return [input_str]

def process_test_cases():
    try:
        # Read all input from stdin
        input_data = sys.stdin.read().strip()
        
        # Log to stderr for debugging
        print("DEBUG: Processing input: " + input_data[:100] + "...", file=sys.stderr)
        
        # Setup for capturing print statements safely
        all_user_logs = []
        
        # Parse the input data 
        test_data = json.loads(input_data)
        
        # Find all user-defined functions
        user_functions = [name for name, obj in globals().items() 
                         if callable(obj) and not name.startswith('__') 
                         and name != 'process_test_cases'
                         and name != 'parse_input_parameters']
        
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
        
        # For debugging - try to use the original print function to log
        original_print = print
        
        for i, test in enumerate(test_cases):
            # Initialize test-specific logs
            test_logs = []
            
            try:
                print("DEBUG: Processing test case " + str(i+1), file=sys.stderr)
                print("DEBUG: Input: " + test.get('input', ''), file=sys.stderr)
                
                # Parse the input using our custom parser
                args = parse_input_parameters(test.get('input', '[]'))
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
                    print("PYTHON USER OUTPUT: " + captured_output, file=sys.stderr)  # Force to stderr for visibility
                    captured_lines = captured_output.strip().split('\\n')
                    test_logs.extend(captured_lines)
                    all_user_logs.extend(captured_lines)
                else:
                    print("DEBUG: No captured output for this test", file=sys.stderr)
                
                print("DEBUG: Raw result type:", type(result), file=sys.stderr)
                print("DEBUG: Raw result value:", result, file=sys.stderr)
                
                # Format the result based on its type
                if result is None:
                    formatted_result = "null"
                elif isinstance(result, bool):
                    formatted_result = str(result).lower()
                elif isinstance(result, (int, float)):
                    formatted_result = str(result)
                else:
                    # For all other types, convert to JSON
                    # Note: collections.Counter will not work correctly with equality comparisons
                    formatted_result = json.dumps(result)
                
                print("DEBUG: Formatted result: " + formatted_result, file=sys.stderr)
                print("DEBUG: Test logs collected: " + str(test_logs), file=sys.stderr)
                
                # Save the first result as direct output
                if i == 0:
                    direct_output = formatted_result
                
                # Check if test passed
                passed = formatted_result == test.get('expected', '')
                print("DEBUG: Expected: " + test.get('expected', ''), file=sys.stderr)
                print("DEBUG: Passed: " + str(passed), file=sys.stderr)
                
                # Add to results with logs for this specific test
                results.append({
                    "input": test.get('input', ''),
                    "output": formatted_result,
                    "expected": test.get('expected', ''),
                    "passed": passed,
                    "logs": test_logs.copy(),  # Make a copy to ensure isolation
                    "originalIndex": i  # Store original index for sorting
                })
                
            except Exception as e:
                print("DEBUG: Error processing test: " + str(e), file=sys.stderr)
                print(traceback.format_exc(), file=sys.stderr)
                results.append({
                    "input": test.get('input', ''),
                    "output": "null",
                    "error": str(e),
                    "expected": test.get('expected', ''),
                    "passed": False,
                    "logs": test_logs.copy(),  # Make a copy to ensure isolation
                    "originalIndex": i  # Store original index for sorting
                })
        
        # Sort results to maintain original order
        results.sort(key=lambda x: x["originalIndex"])
        
        # Format output
        output = {
            "directOutput": direct_output,
            "results": results,
            "summary": {
                "total": len(results),
                "passed": sum(1 for r in results if r.get("passed", False))
            },
            "userLogs": all_user_logs
        }
        
        print("DEBUG: Final summary: " + str(output["summary"]["passed"]) + "/" + 
              str(output["summary"]["total"]) + " tests passed", file=sys.stderr)
        print("DEBUG: All collected logs: " + str(all_user_logs), file=sys.stderr)
        print("DEBUG: Final results with logs: " + str(results), file=sys.stderr)
        
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

# For Python, print a warning about string concatenation
print('# Note: Use f-strings or str() for combining values in Python', file=sys.stderr)
print('# CORRECT: print(f"Array: {prices}, Value: {123123}")', file=sys.stderr)
print('# WRONG: print(prices + "here i am" + 123123)', file=sys.stderr)
print('# WARNING: collections.Counter equality (Counter(s) == Counter(t)) is not supported in the test runner', file=sys.stderr)
print('# Instead, use sorted(s) == sorted(t) for anagram checking', file=sys.stderr)

# Run the processing
process_test_cases()
`;
} 