/**
 * Java test runner for Judge0 submissions
 */
export function generateJavaTestRunner(code: string): string {
  return `
${code}

// Standard test runner for Judge0
import java.io.*;
import java.util.*;
import org.json.*;

public class TestRunner {
    public static void main(String[] args) throws Exception {
        // Read all input from stdin
        StringBuilder inputBuilder = new StringBuilder();
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        String line;
        while ((line = reader.readLine()) != null) {
            inputBuilder.append(line).append("\\n");
        }
        String input = inputBuilder.toString().trim();
        
        // Debug output to stderr
        System.err.println("DEBUG: Processing input: " + input.substring(0, Math.min(input.length(), 100)) + "...");
        
        try {
            // List to collect all user logs
            List<String> allUserLogs = new ArrayList<>();
            
            // Parse the input data
            JSONObject testData = new JSONObject(input);
            
            // Find the main solution method by reflection
            Class<?> solutionClass = findSolutionClass();
            if (solutionClass == null) {
                System.err.println("DEBUG: No solution class found");
                JSONObject errorObj = new JSONObject();
                errorObj.put("error", "Could not detect solution class");
                errorObj.put("results", new JSONArray());
                JSONObject summary = new JSONObject();
                summary.put("total", 0);
                summary.put("passed", 0);
                errorObj.put("summary", summary);
                System.out.println(errorObj.toString());
                return;
            }
            
            System.err.println("DEBUG: Found solution class: " + solutionClass.getName());
            
            // Get all test cases
            JSONArray testCasesArray = testData.has("testCases") ? 
                testData.getJSONArray("testCases") : 
                new JSONArray(Collections.singletonList(testData));
            
            System.err.println("DEBUG: Processing " + testCasesArray.length() + " test cases");
            
            // Save the original System.out and System.err
            PrintStream originalOut = System.out;
            PrintStream originalErr = System.err;
            
            // Process each test case
            JSONArray results = new JSONArray();
            String directOutput = null;
            int passedCount = 0;
            
            for (int i = 0; i < testCasesArray.length(); i++) {
                // List for collecting logs for this specific test
                List<String> testLogs = new ArrayList<>();
                
                // Create a special PrintStream that will capture output for this test
                ByteArrayOutputStream logCapture = new ByteArrayOutputStream();
                PrintStream captureStream = new PrintStream(logCapture);
                
                // Redirect System.out to our capture stream
                System.setOut(captureStream);
                
                try {
                    JSONObject test = testCasesArray.getJSONObject(i);
                    System.err.println("DEBUG: Processing test case " + (i + 1));
                    System.err.println("DEBUG: Input: " + test.optString("input", ""));
                    
                    // Parse the input based on the format
                    String inputStr = test.optString("input", "[]");
                    Object result = null;
                    
                    // Detect ListNode for linked list problems
                    boolean isLinkedListProblem = code.contains("class ListNode");
                    
                    // Find the solution method
                    result = callSolutionMethod(solutionClass, inputStr, isLinkedListProblem);
                    
                    // Collect stdout logs
                    String capturedOutput = logCapture.toString();
                    if (!capturedOutput.isEmpty()) {
                        System.err.println("DEBUG: Captured user output: " + capturedOutput);
                        String[] lines = capturedOutput.split("\\\\n");
                        for (String capturedLine : lines) {
                            if (!capturedLine.trim().isEmpty()) {
                                testLogs.add(capturedLine.trim());
                                allUserLogs.add(capturedLine.trim());
                                System.err.println("USER LOG: " + capturedLine.trim());
                            }
                        }
                    }
                    
                    // Format the result
                    String formattedResult = formatResult(result, isLinkedListProblem);
                    System.err.println("DEBUG: Formatted result: " + formattedResult);
                    
                    // Save first result as direct output
                    if (i == 0) {
                        directOutput = formattedResult;
                    }
                    
                    // Check if the result matches the expected output
                    String expected = test.optString("expected", "");
                    boolean passed = formattedResult.equals(expected);
                    if (passed) passedCount++;
                    
                    System.err.println("DEBUG: Expected: " + expected);
                    System.err.println("DEBUG: Passed: " + passed);
                    
                    // Add to results
                    JSONObject resultObj = new JSONObject();
                    resultObj.put("input", test.optString("input", ""));
                    resultObj.put("output", formattedResult);
                    resultObj.put("expected", expected);
                    resultObj.put("passed", passed);
                    
                    // Add logs specific to this test
                    JSONArray logsArray = new JSONArray();
                    for (String log : testLogs) {
                        logsArray.put(log);
                    }
                    resultObj.put("logs", logsArray);
                    resultObj.put("originalIndex", i);
                    
                    results.put(resultObj);
                    
                } catch (Exception e) {
                    System.err.println("DEBUG: Error processing test: " + e.getMessage());
                    e.printStackTrace(originalErr);
                    
                    // Create error result
                    JSONObject errorResult = new JSONObject();
                    errorResult.put("input", testCasesArray.getJSONObject(i).optString("input", ""));
                    errorResult.put("output", "null");
                    errorResult.put("error", e.getMessage());
                    errorResult.put("expected", testCasesArray.getJSONObject(i).optString("expected", ""));
                    errorResult.put("passed", false);
                    
                    // Add logs specific to this test
                    JSONArray logsArray = new JSONArray();
                    for (String log : testLogs) {
                        logsArray.put(log);
                    }
                    errorResult.put("logs", logsArray);
                    errorResult.put("originalIndex", i);
                    
                    results.put(errorResult);
                } finally {
                    // Restore stdout for the next test
                    System.setOut(originalOut);
                }
            }
            
            // Restore original print streams
            System.setOut(originalOut);
            System.setErr(originalErr);
            
            // Create final output JSON
            JSONObject output = new JSONObject();
            output.put("directOutput", directOutput);
            output.put("results", results);
            
            // Add summary
            JSONObject summary = new JSONObject();
            summary.put("total", testCasesArray.length());
            summary.put("passed", passedCount);
            output.put("summary", summary);
            
            // Add all user logs
            JSONArray userLogsArray = new JSONArray();
            for (String log : allUserLogs) {
                userLogsArray.put(log);
            }
            output.put("userLogs", userLogsArray);
            
            System.err.println("DEBUG: Final summary: " + passedCount + "/" + testCasesArray.length() + " tests passed");
            
            // Output as JSON
            System.out.println(output.toString());
            
        } catch (Exception e) {
            System.err.println("DEBUG: Fatal error in test runner: " + e.getMessage());
            e.printStackTrace();
            
            JSONObject errorObj = new JSONObject();
            errorObj.put("error", e.getMessage());
            errorObj.put("results", new JSONArray());
            JSONObject summary = new JSONObject();
            summary.put("total", 0);
            summary.put("passed", 0);
            errorObj.put("summary", summary);
            
            System.out.println(errorObj.toString());
        }
    }
    
    // Helper methods would go here
    private static Class<?> findSolutionClass() {
        // Find the solution class (not TestRunner)
        for (Class<?> cls : getAllLoadedClasses()) {
            if (!cls.getName().equals("TestRunner") && !cls.getName().startsWith("java.") 
                && !cls.getName().startsWith("org.") && !cls.getName().startsWith("sun.")) {
                return cls;
            }
        }
        return null;
    }
    
    private static Set<Class<?>> getAllLoadedClasses() {
        // This is a simplified placeholder - in a real environment, 
        // you would need to use reflection or ClassLoader tools
        return new HashSet<>(Arrays.asList(TestRunner.class.getClass().getClasses()));
    }
    
    private static Object callSolutionMethod(Class<?> solutionClass, String inputStr, boolean isLinkedListProblem) {
        // Implementation to call the solution method would go here
        // This is simplified and would need to handle different parameter types
        return null;
    }
    
    private static String formatResult(Object result, boolean isLinkedListProblem) {
        // Implementation to format results based on their type
        if (result == null) {
            return "null";
        } else if (result instanceof Boolean) {
            return Boolean.toString((Boolean)result).toLowerCase();
        } else if (result instanceof Number) {
            return result.toString();
        } else {
            return new JSONObject(result).toString();
        }
    }
}

// Run the test runner
new TestRunner().main(new String[0]);
`;
} 