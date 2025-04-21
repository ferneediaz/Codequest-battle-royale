import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const problemsDir = path.join(__dirname, '../data/problems');

// Standard problem schema
const problemSchema = {
  id: '',
  title: '',
  description: '',
  difficulty: '', // easy, medium, hard
  category: '',
  starterCode: {
    javascript: '',
    python: ''
  },
  solutionCode: {
    javascript: '',
    python: ''
  },
  constraints: [],
  examples: [],
  testCases: [
    {
      input: '',
      output: '',
      isHidden: false
    }
  ],
  timeLimit: 1000, // milliseconds
  memoryLimit: 128000 // kilobytes
};

function standardizeProblem(problem) {
  const standardized = { ...problemSchema };
  
  // Copy existing properties
  for (const key in problem) {
    if (key in standardized) {
      standardized[key] = problem[key];
    }
  }
  
  // Ensure required properties
  if (!standardized.id) {
    throw new Error('Problem must have an ID');
  }
  
  if (!standardized.title) {
    standardized.title = standardized.id.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  // Ensure difficulty is valid
  if (!['easy', 'medium', 'hard'].includes(standardized.difficulty.toLowerCase())) {
    standardized.difficulty = 'medium';
  } else {
    standardized.difficulty = standardized.difficulty.toLowerCase();
  }
  
  // Ensure starter code for both languages
  if (!standardized.starterCode.javascript) {
    standardized.starterCode.javascript = 
      "/**\n * Your solution\n */\nfunction solution() {\n  // Your code here\n}";
  }
  
  if (!standardized.starterCode.python) {
    standardized.starterCode.python = 
      "def solution():\n    \"\"\"\n    Your solution\n    \"\"\"\n    # Your code here\n    pass";
  }
  
  // Ensure test cases have proper format
  standardized.testCases = standardized.testCases.map(tc => ({
    input: tc.input || '',
    output: tc.output || '',
    isHidden: typeof tc.isHidden === 'boolean' ? tc.isHidden : false
  }));
  
  // Ensure at least one test case
  if (standardized.testCases.length === 0) {
    standardized.testCases.push({
      input: '',
      output: '',
      isHidden: false
    });
  }
  
  // Set default constraints for time and memory
  standardized.timeLimit = standardized.timeLimit || 1000;
  standardized.memoryLimit = standardized.memoryLimit || 128000;
  
  return standardized;
}

async function standardizeAllProblems() {
  console.log('Starting to standardize problems...');
  
  // Get all problem directories
  const categories = fs.readdirSync(problemsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  let problemCount = 0;
  let standardizedCount = 0;
  let errorCount = 0;

  for (const category of categories) {
    const categoryPath = path.join(problemsDir, category);
    const problemFiles = fs.readdirSync(categoryPath)
      .filter(file => file.endsWith('.json'));

    for (const problemFile of problemFiles) {
      try {
        const filePath = path.join(categoryPath, problemFile);
        const problemData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        problemCount++;
        
        try {
          // Standardize the problem
          const standardizedProblem = standardizeProblem(problemData);
          
          // Write back to file with pretty formatting
          fs.writeFileSync(
            filePath, 
            JSON.stringify(standardizedProblem, null, 2)
          );
          
          console.log(`Standardized problem: ${problemData.id}`);
          standardizedCount++;
        } catch (standardizeError) {
          console.error(`Error standardizing problem ${problemFile}:`, standardizeError.message);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${problemFile}:`, error.message);
        errorCount++;
      }
    }
  }

  console.log(`\nStandardization summary:`);
  console.log(`Total problems processed: ${problemCount}`);
  console.log(`Problems standardized: ${standardizedCount}`);
  console.log(`Errors encountered: ${errorCount}`);
}

standardizeAllProblems().catch(error => {
  console.error('Fatal error during standardization:', error);
  process.exit(1);
}); 