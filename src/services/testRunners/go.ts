/**
 * Go test runner for Judge0 submissions
 */
export function generateGoTestRunner(code: string): string {
  return `
${code}

// Standard test runner for Judge0
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"reflect"
	"strings"
)

// TestResult represents the result of a single test case
type TestResult struct {
	Input        string   \`json:"input"\`
	Output       string   \`json:"output"\`
	Expected     string   \`json:"expected"\`
	Passed       bool     \`json:"passed"\`
	Logs         []string \`json:"logs"\`
	OriginalIndex int     \`json:"originalIndex"\`
}

// TestSummary contains the summary of all tests
type TestSummary struct {
	Total  int \`json:"total"\`
	Passed int \`json:"passed"\`
}

// TestOutput represents the full output format
type TestOutput struct {
	DirectOutput string       \`json:"directOutput"\`
	Results      []TestResult \`json:"results"\`
	Summary      TestSummary  \`json:"summary"\`
	UserLogs     []string     \`json:"userLogs"\`
}

// OutputCapture redirects stdout to capture user print statements
type OutputCapture struct {
	oldStdout *os.File
	readPipe  *os.File
	writePipe *os.File
}

// StartCapture starts capturing stdout
func StartCapture() (*OutputCapture, error) {
	// Create a pipe
	readPipe, writePipe, err := os.Pipe()
	if err != nil {
		return nil, err
	}

	// Save the original stdout
	oldStdout := os.Stdout
	
	// Redirect stdout to the pipe
	os.Stdout = writePipe
	
	return &OutputCapture{
		oldStdout: oldStdout,
		readPipe:  readPipe,
		writePipe: writePipe,
	}, nil
}

// StopCapture stops capturing and returns the captured output
func (c *OutputCapture) StopCapture() (string, error) {
	// Flush stdout
	os.Stdout.Sync()
	
	// Create a buffer to hold the captured output
	var buf bytes.Buffer
	
	// Create a channel to signal when reading is done
	done := make(chan error)
	
	// Read from the pipe in a goroutine
	go func() {
		_, err := io.Copy(&buf, c.readPipe)
		done <- err
	}()
	
	// Close the write end of the pipe
	c.writePipe.Close()
	
	// Wait for reading to finish
	<-done
	
	// Restore the original stdout
	os.Stdout = c.oldStdout
	
	// Close the read end of the pipe
	c.readPipe.Close()
	
	return buf.String(), nil
}

// Main test runner function
func main() {
	debugf("Starting test runner")
	
	// Read all input from stdin
	inputData := ""
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		inputData += scanner.Text() + "\\n"
	}
	
	debugf("Processing input: %s...", inputData[:min(len(inputData), 100)])
	
	var allUserLogs []string
	
	try := func(f func() error) {
		if err := f(); err != nil {
			debugf("Fatal error in test runner: %v", err)
			// Output error as JSON
			errorOutput := map[string]interface{}{
				"error":   err.Error(),
				"results": []interface{}{},
				"summary": map[string]int{"total": 0, "passed": 0},
			}
			outputJSON(errorOutput)
			os.Exit(1)
		}
	}
	
	// Parse the input data
	var testData map[string]interface{}
	try(func() error {
		return json.Unmarshal([]byte(inputData), &testData)
	})
	
	// Get the test cases
	var testCases []map[string]interface{}
	if testCasesData, ok := testData["testCases"].([]interface{}); ok {
		for _, tc := range testCasesData {
			if tcMap, ok := tc.(map[string]interface{}); ok {
				testCases = append(testCases, tcMap)
			}
		}
	} else {
		// Single test case
		testCases = append(testCases, testData)
	}
	
	debugf("Processing %d test cases", len(testCases))
	
	// Process each test case
	var results []TestResult
	var directOutput string
	passedCount := 0
	
	for i, test := range testCases {
		debugf("Processing test case %d", i+1)
		
		// Initialize test-specific logs
		var testLogs []string
		
		// Start capturing stdout
		capture, err := StartCapture()
		if err != nil {
			debugf("Error setting up capture: %v", err)
			continue
		}
		
		// Handle the test case
		var result TestResult
		func() {
			defer func() {
				if r := recover(); r != nil {
					debugf("Test panicked: %v", r)
					result = TestResult{
						Input:         fmt.Sprintf("%v", test["input"]),
						Output:        "null",
						Expected:      fmt.Sprintf("%v", test["expected"]),
						Passed:        false,
						Logs:          testLogs,
						OriginalIndex: i,
					}
				}
			}()
			
			// Get the input
			inputStr, _ := test["input"].(string)
			if inputStr == "" {
				inputStr = "[]"
			}
			
			debugf("Input: %s", inputStr)
			
			// Parse the input
			var inputData interface{}
			err := json.Unmarshal([]byte(inputStr), &inputData)
			if err != nil {
				debugf("Error parsing input: %v", err)
				return
			}
			
			// Call the solution function - would be implemented based on code analysis
			// This is a placeholder
			outputData := "null" // Placeholder
			
			// Stop capturing stdout
			capturedOutput, err := capture.StopCapture()
			if err != nil {
				debugf("Error stopping capture: %v", err)
			}
			
			// Process captured output
			if capturedOutput != "" {
				debugf("Captured user output: %s", capturedOutput)
				lines := strings.Split(capturedOutput, "\\n")
				for _, line := range lines {
					if line = strings.TrimSpace(line); line != "" {
						testLogs = append(testLogs, line)
						allUserLogs = append(allUserLogs, line)
						debugf("USER LOG: %s", line)
					}
				}
			}
			
			// Format output
			expected, _ := test["expected"].(string)
			passed := outputData == expected
			if passed {
				passedCount++
			}
			
			debugf("Expected: %s", expected)
			debugf("Passed: %v", passed)
			
			// Set the result
			result = TestResult{
				Input:         inputStr,
				Output:        outputData,
				Expected:      expected,
				Passed:        passed,
				Logs:          testLogs,
				OriginalIndex: i,
			}
			
			// Save first result as direct output
			if i == 0 {
				directOutput = outputData
			}
		}()
		
		results = append(results, result)
	}
	
	// Create the final output
	output := TestOutput{
		DirectOutput: directOutput,
		Results:      results,
		Summary: TestSummary{
			Total:  len(testCases),
			Passed: passedCount,
		},
		UserLogs: allUserLogs,
	}
	
	debugf("Final summary: %d/%d tests passed", passedCount, len(testCases))
	
	// Output as JSON
	outputJSON(output)
}

// Helper functions
func debugf(format string, args ...interface{}) {
	fmt.Fprintf(os.Stderr, "DEBUG: "+format+"\\n", args...)
}

func outputJSON(data interface{}) {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		debugf("Error marshaling JSON: %v", err)
		return
	}
	fmt.Println(string(jsonData))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
`;
} 