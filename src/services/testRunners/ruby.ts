/**
 * Ruby test runner for Judge0 submissions
 */
export function generateRubyTestRunner(code: string): string {
  return `
${code}

# Standard test runner for Judge0
require 'json'
require 'stringio'

def process_test_cases
  begin
    # Read all input from stdin
    input = $stdin.read.strip
    
    # Debug to stderr
    $stderr.puts "DEBUG: Processing input: #{input[0..100]}..."
    
    # Array to collect all user logs
    all_user_logs = []
    
    # Parse the input data
    test_data = JSON.parse(input)
    
    # Find the solution method
    # This is a simplification - in a real environment would need
    # to detect methods more reliably
    method_name = nil
    methods = global_functions - standard_ruby_methods
    method_name = methods.first if methods.any?
    
    if method_name.nil?
      $stderr.puts "DEBUG: No solution method found"
      puts JSON.generate({
        error: "Could not detect solution method",
        results: [],
        summary: { total: 0, passed: 0 }
      })
      return
    end
    
    $stderr.puts "DEBUG: Found solution method: #{method_name}"
    
    # Get all test cases
    test_cases = test_data['testCases'] || [test_data]
    
    $stderr.puts "DEBUG: Processing #{test_cases.count} test cases"
    
    # Save original stdout
    original_stdout = $stdout
    
    # Process each test case
    results = []
    direct_output = nil
    passed_count = 0
    
    test_cases.each_with_index do |test, index|
      # Array for logs specific to this test
      test_logs = []
      
      # Redirect stdout to capture output
      capture_io = StringIO.new
      $stdout = capture_io
      
      begin
        $stderr.puts "DEBUG: Processing test case #{index + 1}"
        $stderr.puts "DEBUG: Input: #{test['input']}"
        
        # Parse the input
        input_str = test['input'] || '[]'
        parsed_input = JSON.parse(input_str)
        
        $stderr.puts "DEBUG: Parsed input: #{parsed_input.inspect}"
        
        # Call the solution method
        result = nil
        
        if parsed_input.is_a?(Array) && parsed_input.length > 1 && parsed_input[0].is_a?(Array)
          # Array with another array as first element - like [[1,2,3], 5]
          $stderr.puts "DEBUG: Calling with unpacked array + value"
          result = send(method_name, *parsed_input)
        elsif parsed_input.is_a?(Array)
          # Just a regular array
          $stderr.puts "DEBUG: Calling with array"
          result = send(method_name, parsed_input)
        else
          # Single value
          $stderr.puts "DEBUG: Calling with single value"
          result = send(method_name, parsed_input)
        end
        
        # Get any captured output
        captured_output = capture_io.string
        
        if !captured_output.empty?
          $stderr.puts "DEBUG: Captured user output: #{captured_output}"
          captured_output.split("\\n").each do |line|
            unless line.strip.empty?
              test_logs << line.strip
              all_user_logs << line.strip
              $stderr.puts "USER LOG: #{line.strip}"
            end
          end
        end
        
        # Format the result
        formatted_result = format_result(result)
        $stderr.puts "DEBUG: Formatted result: #{formatted_result}"
        
        # Save first result as direct output
        direct_output = formatted_result if index == 0
        
        # Check against expected
        expected = test['expected'] || ''
        passed = formatted_result == expected
        passed_count += 1 if passed
        
        $stderr.puts "DEBUG: Expected: #{expected}"
        $stderr.puts "DEBUG: Passed: #{passed}"
        
        # Add to results
        results << {
          input: test['input'] || '',
          output: formatted_result,
          expected: expected,
          passed: passed,
          logs: test_logs.clone,
          originalIndex: index
        }
        
      rescue => e
        $stderr.puts "DEBUG: Error processing test: #{e.message}"
        $stderr.puts e.backtrace
        
        results << {
          input: test['input'] || '',
          output: 'null',
          error: e.message,
          expected: test['expected'] || '',
          passed: false,
          logs: test_logs.clone,
          originalIndex: index
        }
      ensure
        # Reset stdout for next test
        $stdout = original_stdout
      end
    end
    
    # Create final output JSON
    output = {
      directOutput: direct_output,
      results: results,
      summary: {
        total: test_cases.count,
        passed: passed_count
      },
      userLogs: all_user_logs
    }
    
    $stderr.puts "DEBUG: Final summary: #{passed_count}/#{test_cases.count} tests passed"
    
    # Output as JSON
    puts JSON.generate(output)
    
  rescue => e
    $stderr.puts "DEBUG: Fatal error in test runner: #{e.message}"
    $stderr.puts e.backtrace
    
    puts JSON.generate({
      error: e.message,
      results: [],
      summary: { total: 0, passed: 0 }
    })
  end
end

# Helper methods
def standard_ruby_methods
  # List of standard methods to exclude when looking for the solution method
  Object.methods + Kernel.methods + BasicObject.methods
end

def global_functions
  # Get list of globally available methods
  Kernel.methods
end

def format_result(result)
  if result.nil?
    'null'
  elsif result.is_a?(TrueClass) || result.is_a?(FalseClass)
    result.to_s.downcase
  elsif result.is_a?(Numeric)
    result.to_s
  else
    JSON.generate(result)
  end
end

# Print warnings for common Ruby mistakes
$stderr.puts '# Note: Use string interpolation instead of + for string concatenation in Ruby'
$stderr.puts '# CORRECT: puts "Array: #{array}, Value: #{value}"'
$stderr.puts '# WRONG: puts array + " is my array, value: " + value'

# Run the test processing
process_test_cases
`;
} 