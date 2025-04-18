/**
 * Direct SQL script to populate Supabase with coding problems
 * Run with: node src/scripts/directPopulate.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

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

// Define the problem categories and their folder names
const categories = [
  { name: "Forest of Arrays", folder: "forest-of-arrays" },
  { name: "Hashmap Dungeons", folder: "hashmap-dungeons" },
  { name: "Binary Search Castle", folder: "binary-search-castle" },
  { name: "Linked List Gardens", folder: "linked-list-gardens" },
  { name: "Tree of Wisdom", folder: "tree-of-wisdom" },
  { name: "Graph Adventures", folder: "graph-adventures" },
  { name: "Dynamic Programming Peaks", folder: "dynamic-programming-peaks" },
  { name: "Stack & Queue Tavern", folder: "stack-queue-tavern" },
  { name: "String Sorcery", folder: "string-sorcery" },
  { name: "Sorting Sanctuary", folder: "sorting-sanctuary" }
];

// Function to load problems from JSON files
async function loadProblems() {
  const problems = [];
  const problemsDir = path.resolve(__dirname, '../../src/data/problems');
  
  console.log('Loading problems from:', problemsDir);
  
  for (const category of categories) {
    const categoryDir = path.join(problemsDir, category.folder);
    
    if (!fs.existsSync(categoryDir)) {
      console.warn(`Category directory does not exist: ${categoryDir}`);
      continue;
    }
    
    const files = fs.readdirSync(categoryDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(categoryDir, file);
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const problem = JSON.parse(fileContent);
          problems.push(problem);
          console.log(`Loaded problem: ${problem.id} - ${problem.title}`);
        } catch (error) {
          console.error(`Error loading problem from ${filePath}:`, error);
        }
      }
    }
  }
  
  return problems;
}

// Function to populate the database with problems
async function populateProblems() {
  try {
    // Check if the table exists
    const { error: checkError } = await supabase
      .from('coding_problems')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('Error accessing coding_problems table:', checkError);
      console.log('Please make sure the table exists before running this script.');
      return;
    }
    
    // Load problems from JSON files
    const problems = await loadProblems();
    
    if (problems.length === 0) {
      console.error('No problems found in JSON files');
      return;
    }
    
    console.log(`Found ${problems.length} problems to upload`);
    
    // Insert problems into Supabase
    for (const problem of problems) {
      console.log(`Uploading problem: ${problem.id} - ${problem.title}`);
      
      const { error } = await supabase
        .from('coding_problems')
        .upsert(problem, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error uploading problem ${problem.id}:`, error);
      } else {
        console.log(`Successfully uploaded problem: ${problem.id}`);
      }
    }
    
    console.log('Finished populating Supabase with coding problems');
  } catch (error) {
    console.error('Error in population process:', error);
  }
}

// Run the script
populateProblems()
  .catch(console.error)
  .finally(() => {
    console.log('Exiting...');
    setTimeout(() => process.exit(0), 1000);
  }); 