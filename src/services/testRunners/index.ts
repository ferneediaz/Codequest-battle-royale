import { LANGUAGE_IDS } from '../submissionService';
import { generateJavaScriptTestRunner } from './javascript';
import { generatePythonTestRunner } from './python';

/**
 * Factory function to get the appropriate test runner for a language
 * @param code User submitted code
 * @param languageId Judge0 language ID
 * @returns Code with the appropriate test runner added
 */
export function getTestRunner(code: string, languageId: number): string {
  switch (languageId) {
    case LANGUAGE_IDS.javascript:
      return generateJavaScriptTestRunner(code);
    case LANGUAGE_IDS.python:
      return generatePythonTestRunner(code);
    // Add additional languages here as they are implemented
    default:
      console.warn(`No test runner available for language ID ${languageId}, returning original code`);
      return code;
  }
}

/**
 * Template for implementing a new language test runner
 * 
 * When implementing a new language test runner, ensure:
 * 1. It handles both single and multiple parameter formats consistently
 * 2. It captures console output from user code
 * 3. It properly formats results for comparison
 * 4. It includes per-test logging
 * 
 * Required output format:
 * {
 *   directOutput: string,      // First test result formatted for direct output
 *   results: [{                // Array of test results
 *     input: string,           // Test input
 *     output: string,          // Actual output 
 *     expected: string,        // Expected output
 *     passed: boolean,         // Whether the test passed
 *     logs: string[],          // Array of logs captured for this test
 *     originalIndex: number    // To maintain proper ordering
 *   }],
 *   summary: {                 // Summary of test results
 *     total: number,           // Total number of tests
 *     passed: number           // Number of tests passed
 *   },
 *   userLogs: string[]         // All captured logs
 * }
 */ 