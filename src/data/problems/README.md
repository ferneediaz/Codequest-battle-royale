# CodeQuest Battle Royale Problem Format

This document describes the standardized format for coding problems in CodeQuest Battle Royale. Each problem is defined in a JSON file and follows a specific schema to ensure compatibility with the Judge0 system.

## Problem File Structure

Problems are organized in category-based directories and defined in JSON files:

```
src/data/problems/
├── binary-search-castle/
│   ├── binary-search.json
│   └── search-in-rotated-sorted-array.json
├── dynamic-programming-peaks/
│   └── min-cost-climbing-stairs.json
└── ...
```

## Problem Schema

Each problem JSON file must follow this schema:

```json
{
  "id": "unique-problem-id",
  "title": "Problem Title",
  "description": "Detailed problem description with Markdown support",
  "difficulty": "easy|medium|hard",
  "category": "Category Name",
  "starterCode": {
    "javascript": "// JS starter code",
    "python": "# Python starter code"
  },
  "solutionCode": {
    "javascript": "// JS solution code",
    "python": "# Python solution code"
  },
  "constraints": [
    "Constraint 1",
    "Constraint 2"
  ],
  "examples": [
    "Example 1 description",
    "Example 2 description"
  ],
  "testCases": [
    {
      "input": "Input for test case 1",
      "output": "Expected output for test case 1",
      "isHidden": false
    },
    {
      "input": "Input for test case 2",
      "output": "Expected output for test case 2",
      "isHidden": true
    }
  ],
  "timeLimit": 1000,
  "memoryLimit": 128000
}
```

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the problem. Used in URLs and database references. Should be kebab-case. |
| `title` | string | Human-readable title of the problem. |
| `description` | string | Detailed description of the problem. Supports Markdown formatting. |
| `difficulty` | string | Difficulty level: "easy", "medium", or "hard". |
| `category` | string | Category name that groups related problems. |
| `starterCode` | object | Initial code provided to the user. Contains language-specific templates. |
| `solutionCode` | object | Reference solutions used for testing and hints. Contains language-specific implementations. |
| `constraints` | array | List of problem constraints. |
| `examples` | array | List of example inputs/outputs with explanations. |
| `testCases` | array | Test cases used to validate user solutions. |
| `timeLimit` | number | Maximum execution time in milliseconds. |
| `memoryLimit` | number | Maximum memory usage in kilobytes. |

## Test Case Format

Each test case has this structure:

```json
{
  "input": "Input string in the format expected by the solution function",
  "output": "Expected output string that will be compared against the solution's output",
  "isHidden": boolean
}
```

- `input`: String representation of input parameters. For multiple parameters, use comma-separated values.
- `output`: Expected output as a string. Must match the solution's output exactly.
- `isHidden`: If true, this test case is used for validation but not shown to users.

## Judge0 Integration Requirements

For proper integration with Judge0:

1. Ensure inputs and outputs are consistently formatted as strings.
2. JavaScript function should return the result rather than just printing it.
3. Python functions should return the result as well.
4. Test case inputs should match the parameter format of the solution function.
5. Test case outputs must match the expected return value format exactly.

## Adding New Problems

To add a new problem:

1. Create a JSON file in the appropriate category folder.
2. Follow the schema defined above.
3. Run the standardization script: `npm run standardize-problems`
4. Run the reload script to update the database: `npm run reload-problems`

## Test Case Best Practices

1. Include basic test cases visible to users (isHidden: false).
2. Include edge cases as hidden tests (isHidden: true).
3. Test both valid and invalid inputs.
4. Ensure output formats are consistent (e.g., array representations). 