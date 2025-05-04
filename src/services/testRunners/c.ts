/**
 * C test runner for Judge0 submissions
 */
export function generateCTestRunner(code: string): string {
  return `
${code}

// Standard test runner for Judge0
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

// Simple JSON parser for C
// Note: This is a basic implementation - in production would use a library like cJSON

// Structure to hold a single test case result
typedef struct {
    char* input;
    char* output;
    char* expected;
    bool passed;
    char** logs;
    int logCount;
    int originalIndex;
} TestResult;

// Structure to hold all results
typedef struct {
    char* directOutput;
    TestResult* results;
    int resultCount;
    int totalTests;
    int passedTests;
    char** userLogs;
    int userLogCount;
} TestOutput;

// Output capture functions
FILE* originalStdout = NULL;
char captureBuffer[10240]; // Buffer to hold captured output

void startCapture() {
    fflush(stdout);
    originalStdout = stdout;
    FILE* captureFile = fmemopen(captureBuffer, sizeof(captureBuffer), "w");
    stdout = captureFile;
    memset(captureBuffer, 0, sizeof(captureBuffer));
}

char* endCapture() {
    fflush(stdout);
    fclose(stdout);
    stdout = originalStdout;
    return strdup(captureBuffer);
}

// Main test runner
int main() {
    // Read all input from stdin
    char input[10240] = {0};
    char line[1024];
    
    while (fgets(line, sizeof(line), stdin)) {
        strcat(input, line);
    }
    
    fprintf(stderr, "DEBUG: Processing input: %.100s...\n", input);
    
    // Very simple input parsing - would be replaced by proper JSON parsing
    // This is just a simplified example
    
    // For real implementation, would call user functions here
    
    // Create test output structure
    TestOutput output;
    output.directOutput = "null"; // Default
    output.totalTests = 1;        // Example
    output.passedTests = 0;       // Example
    output.userLogCount = 0;
    
    // Output as JSON
    printf("{\\n");
    printf("  \\"directOutput\\": \\"%s\\",\\n", output.directOutput);
    printf("  \\"results\\": [\\n");

    // Example of one test result - real implementation would iterate through tests
    printf("    {\\n");
    printf("      \\"input\\": \\"example input\\",\\n");
    printf("      \\"output\\": \\"null\\",\\n");
    printf("      \\"expected\\": \\"expected result\\",\\n");
    printf("      \\"passed\\": false,\\n");
    printf("      \\"logs\\": [],\\n");
    printf("      \\"originalIndex\\": 0\\n");
    printf("    }\\n");
    
    printf("  ],\\n");
    printf("  \\"summary\\": {\\n");
    printf("    \\"total\\": %d,\\n", output.totalTests);
    printf("    \\"passed\\": %d\\n", output.passedTests);
    printf("  },\\n");
    printf("  \\"userLogs\\": []\\n");
    printf("}\\n");
    
    return 0;
}
`;
} 