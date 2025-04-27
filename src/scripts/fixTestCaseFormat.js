/**
 * This script directly fixes the test case formats in the Supabase database
 * Run with: node src/scripts/fixTestCaseFormat.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('Loading environment from .env.local');
  dotenv.config({ path: envPath });
} else {
  console.log('No .env.local found, using environment variables');
  dotenv.config();
}

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env.local file.');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to check if a test case input needs standardization
function needsStandardization(input) {
  // Check if it contains a comma outside of brackets
  return input.match(/\],\s*\d/) || input.match(/\],\s*"/) || input.match(/\],\s*\[/);
}

// Function to standardize a test case input
function standardizeInput(input) {
  // Handle binary search common format: "[1,2,3], 4"
  const searchMatch = input.match(/^\[(.*)\],\s*(.*)$/);
  if (searchMatch) {
    const array = searchMatch[1];
    const target = searchMatch[2];
    return `[[${array}], ${target}]`;
  }
  return input;
}

// Function to fix test case formats in the database
async function fixTestCaseFormats() {
  try {
    console.log('Fetching problems from database...');
    
    // Fetch all problems from Supabase
    const { data: problems, error } = await supabase
      .from('coding_problems')
      .select('*');
    
    if (error) {
      console.error('Error fetching problems:', error);
      return;
    }
    
    console.log(`Found ${problems.length} problems in database`);
    
    let problemsUpdated = 0;
    let testCasesUpdated = 0;
    
    // Process each problem
    for (const problem of problems) {
      let hasUpdates = false;
      
      if (!problem.testCases || !Array.isArray(problem.testCases)) {
        console.log(`Problem ${problem.id} has no test cases, skipping`);
        continue;
      }
      
      // Check if any test cases need standardization
      for (const testCase of problem.testCases) {
        if (testCase.input && needsStandardization(testCase.input)) {
          console.log(`Fixing test case format in problem ${problem.id}:`);
          console.log(`  Original: ${testCase.input}`);
          
          const standardizedInput = standardizeInput(testCase.input);
          testCase.input = standardizedInput;
          
          console.log(`  Fixed:    ${standardizedInput}`);
          hasUpdates = true;
          testCasesUpdated++;
        }
      }
      
      // Update the problem in the database if we made changes
      if (hasUpdates) {
        console.log(`Updating problem ${problem.id} in database...`);
        const { error: updateError } = await supabase
          .from('coding_problems')
          .update({ testCases: problem.testCases })
          .eq('id', problem.id);
        
        if (updateError) {
          console.error(`Error updating problem ${problem.id}:`, updateError);
        } else {
          console.log(`Successfully updated problem ${problem.id}`);
          problemsUpdated++;
        }
      }
    }
    
    console.log('\nSummary:');
    console.log(`${problemsUpdated} problems updated`);
    console.log(`${testCasesUpdated} test cases reformatted`);
    
  } catch (error) {
    console.error('Error in fix process:', error);
  }
}

// Run the script
fixTestCaseFormats()
  .catch(console.error)
  .finally(() => {
    console.log('Exiting...');
    setTimeout(() => process.exit(0), 1000);
  }); 