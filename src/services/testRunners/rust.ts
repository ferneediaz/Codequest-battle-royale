/**
 * Rust test runner for Judge0 submissions
 */
export function generateRustTestRunner(code: string): string {
  return `
${code}

// Standard test runner for Judge0
use std::io::{self, Read};
use std::fmt;
use serde::{Serialize, Deserialize};
use serde_json::{self, Value, json};
use std::sync::{Arc, Mutex};
use std::cell::RefCell;

// Define test results structure
#[derive(Serialize, Deserialize, Debug)]
struct TestResult {
    input: String,
    output: String,
    expected: String,
    passed: bool,
    logs: Vec<String>,
    #[serde(rename = "originalIndex")]
    original_index: usize,
}

#[derive(Serialize, Deserialize, Debug)]
struct TestSummary {
    total: usize,
    passed: usize,
}

#[derive(Serialize, Deserialize, Debug)]
struct TestOutput {
    #[serde(rename = "directOutput")]
    direct_output: String,
    results: Vec<TestResult>,
    summary: TestSummary,
    #[serde(rename = "userLogs")]
    user_logs: Vec<String>,
}

// Struct to capture println! output
struct OutputCapture {
    buffer: Arc<Mutex<Vec<String>>>,
}

impl OutputCapture {
    fn new() -> Self {
        OutputCapture {
            buffer: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    fn get_logs(&self) -> Vec<String> {
        let buffer = self.buffer.lock().unwrap();
        buffer.clone()
    }
}

// Custom print macro for the test runner
#[macro_export]
macro_rules! capture_println {
    ($capture:expr, $($arg:tt)*) => {
        {
            let message = format!($($arg)*);
            if let Ok(mut buffer) = $capture.buffer.lock() {
                buffer.push(message.clone());
            }
            eprintln!("USER LOG: {}", message);
        }
    };
}

// Debug macro that writes to stderr
macro_rules! debug {
    ($($arg:tt)*) => {
        eprintln!("DEBUG: {}", format!($($arg)*));
    };
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Read all input from stdin
    let mut input = String::new();
    io::stdin().read_to_string(&mut input)?;
    
    debug!("Processing input: {}...", &input[..input.len().min(100)]);
    
    // Initialize logs collection
    let all_user_logs: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    
    // Parse the input data
    let test_data: Value = serde_json::from_str(&input)?;
    
    // Extract test cases
    let test_cases = if test_data["testCases"].is_array() {
        test_data["testCases"].as_array().unwrap().clone()
    } else {
        vec![test_data.clone()]
    };
    
    debug!("Processing {} test cases", test_cases.len());
    
    // Process each test case
    let mut results = Vec::new();
    let mut direct_output = "null".to_string();
    let mut passed_count = 0;
    
    for (i, test) in test_cases.iter().enumerate() {
        debug!("Processing test case {}", i + 1);
        
        // Create capture for this test's logs
        let output_capture = OutputCapture::new();
        let test_logs_capture = output_capture.buffer.clone();
        
        // Setup thread_local capture buffer for println macro
        thread_local! {
            static CAPTURE_BUFFER: RefCell<Option<Arc<Mutex<Vec<String>>>>> = RefCell::new(None);
        }
        
        CAPTURE_BUFFER.with(|cell| {
            *cell.borrow_mut() = Some(test_logs_capture.clone());
        });
        
        let result = std::panic::catch_unwind(|| {
            let input_str = test["input"].as_str().unwrap_or("[]");
            debug!("Input: {}", input_str);
            
            // Parse the input
            let parsed_input: Value = serde_json::from_str(input_str).unwrap_or(json!(null));
            
            // Call the solution function - would need to be customized based on code analysis
            // This is just a placeholder
            let result_value = json!(null);
            
            // Format the result
            let formatted_result = match result_value {
                Value::Null => "null".to_string(),
                Value::Bool(b) => b.to_string().to_lowercase(),
                Value::Number(n) => n.to_string(),
                _ => result_value.to_string(),
            };
            
            // Get the logs from this test
            let test_logs = output_capture.get_logs();
            
            // Add logs to the global collection
            if let Ok(mut all_logs) = all_user_logs.lock() {
                all_logs.extend(test_logs.clone());
            }
            
            // Get expected output
            let expected = test["expected"].as_str().unwrap_or("").to_string();
            let passed = formatted_result == expected;
            
            if passed {
                passed_count += 1;
            }
            
            debug!("Expected: {}", expected);
            debug!("Formatted result: {}", formatted_result);
            debug!("Passed: {}", passed);
            
            // Save first result as direct output
            if i == 0 {
                direct_output = formatted_result.clone();
            }
            
            // Create test result
            TestResult {
                input: input_str.to_string(),
                output: formatted_result,
                expected,
                passed,
                logs: test_logs,
                original_index: i,
            }
        });
        
        // Get the result or handle panic
        match result {
            Ok(test_result) => {
                results.push(test_result);
            },
            Err(e) => {
                debug!("Error processing test: {:?}", e);
                
                // Get the logs before panic
                let test_logs = if let Ok(logs) = test_logs_capture.lock() {
                    logs.clone()
                } else {
                    Vec::new()
                };
                
                // Create error result
                results.push(TestResult {
                    input: test["input"].as_str().unwrap_or("").to_string(),
                    output: "null".to_string(),
                    expected: test["expected"].as_str().unwrap_or("").to_string(),
                    passed: false,
                    logs: test_logs,
                    original_index: i,
                });
            }
        }
    }
    
    // Create final output
    let all_logs = if let Ok(logs) = all_user_logs.lock() {
        logs.clone()
    } else {
        Vec::new()
    };
    
    let output = TestOutput {
        direct_output,
        results,
        summary: TestSummary {
            total: test_cases.len(),
            passed: passed_count,
        },
        user_logs: all_logs,
    };
    
    debug!("Final summary: {}/{} tests passed", passed_count, test_cases.len());
    
    // Output as JSON
    println!("{}", serde_json::to_string(&output)?);
    
    Ok(())
}
`;
} 