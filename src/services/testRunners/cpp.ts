/**
 * C++ test runner for Judge0 submissions
 */
export function generateCppTestRunner(code: string): string {
  return `
${code}

// Standard test runner for Judge0
#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <sstream>
#include <functional>
#include <chrono>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Redirect cout to capture output
class OutputCapture {
private:
    std::streambuf* originalCoutBuffer;
    std::ostringstream capturedStream;
    
public:
    OutputCapture() : originalCoutBuffer(std::cout.rdbuf()) {
        std::cout.rdbuf(capturedStream.rdbuf());
    }
    
    ~OutputCapture() {
        std::cout.rdbuf(originalCoutBuffer);
    }
    
    std::string getOutput() {
        return capturedStream.str();
    }
};

// Main test runner
int main() {
    try {
        // Read all input from stdin
        std::string input;
        std::string line;
        while (std::getline(std::cin, line)) {
            input += line + "\\n";
        }
        
        std::cerr << "DEBUG: Processing input: " << input.substr(0, 100) << "..." << std::endl;
        
        // Parse the input data
        json testData = json::parse(input);
        
        // Find the solution function to call
        // This is a simplification - would need to be adapted based on actual code structure
        
        // Extract test cases
        std::vector<json> testCases;
        if (testData.contains("testCases")) {
            testCases = testData["testCases"].get<std::vector<json>>();
        } else {
            testCases.push_back(testData);
        }
        
        std::cerr << "DEBUG: Processing " << testCases.size() << " test cases" << std::endl;
        
        // Process each test case
        json results = json::array();
        std::string directOutput;
        std::vector<std::string> allLogs;
        int passedCount = 0;
        
        for (size_t i = 0; i < testCases.size(); i++) {
            std::cerr << "DEBUG: Processing test case " << (i + 1) << std::endl;
            
            // Prepare for capturing console output
            OutputCapture capture;
            std::vector<std::string> testLogs;
            
            try {
                json& test = testCases[i];
                std::string inputStr = test.value("input", "[]");
                std::cerr << "DEBUG: Input: " << inputStr << std::endl;
                
                // Parse the input
                json inputJson = json::parse(inputStr);
                
                // Call the solution function and get result
                // This is the part that needs custom implementation per problem type
                
                // Get captured console output
                std::string capturedOutput = capture.getOutput();
                
                // Extract logs if any
                if (!capturedOutput.empty()) {
                    std::cerr << "DEBUG: Captured output: " << capturedOutput << std::endl;
                    std::istringstream logStream(capturedOutput);
                    std::string logLine;
                    while (std::getline(logStream, logLine)) {
                        if (!logLine.empty()) {
                            testLogs.push_back(logLine);
                            allLogs.push_back(logLine);
                            std::cerr << "USER LOG: " << logLine << std::endl;
                        }
                    }
                }
                
                // Format the result
                std::string formattedResult = "null"; // Placeholder
                
                // Save first result as direct output
                if (i == 0) {
                    directOutput = formattedResult;
                }
                
                // Check against expected
                std::string expected = test.value("expected", "");
                bool passed = (formattedResult == expected);
                if (passed) passedCount++;
                
                // Add to results
                json resultObj;
                resultObj["input"] = test.value("input", "");
                resultObj["output"] = formattedResult;
                resultObj["expected"] = expected;
                resultObj["passed"] = passed;
                
                // Add logs
                json logsArray = json::array();
                for (const auto& log : testLogs) {
                    logsArray.push_back(log);
                }
                resultObj["logs"] = logsArray;
                resultObj["originalIndex"] = i;
                
                results.push_back(resultObj);
                
            } catch (std::exception& e) {
                std::cerr << "DEBUG: Error processing test: " << e.what() << std::endl;
                
                json errorResult;
                errorResult["input"] = testCases[i].value("input", "");
                errorResult["output"] = "null";
                errorResult["error"] = e.what();
                errorResult["expected"] = testCases[i].value("expected", "");
                errorResult["passed"] = false;
                
                // Add logs
                json logsArray = json::array();
                for (const auto& log : testLogs) {
                    logsArray.push_back(log);
                }
                errorResult["logs"] = logsArray;
                errorResult["originalIndex"] = i;
                
                results.push_back(errorResult);
            }
        }
        
        // Create final output JSON
        json output;
        output["directOutput"] = directOutput;
        output["results"] = results;
        
        // Add summary
        json summary;
        summary["total"] = testCases.size();
        summary["passed"] = passedCount;
        output["summary"] = summary;
        
        // Add all user logs
        json userLogsArray = json::array();
        for (const auto& log : allLogs) {
            userLogsArray.push_back(log);
        }
        output["userLogs"] = userLogsArray;
        
        std::cerr << "DEBUG: Final summary: " << passedCount << "/" << testCases.size() << " tests passed" << std::endl;
        
        // Output as JSON
        std::cout << output.dump() << std::endl;
        
    } catch (std::exception& e) {
        std::cerr << "DEBUG: Fatal error in test runner: " << e.what() << std::endl;
        
        json errorObj;
        errorObj["error"] = e.what();
        errorObj["results"] = json::array();
        
        json summary;
        summary["total"] = 0;
        summary["passed"] = 0;
        errorObj["summary"] = summary;
        
        std::cout << errorObj.dump() << std::endl;
    }
    
    return 0;
}
`;
} 