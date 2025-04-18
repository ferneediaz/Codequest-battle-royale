# CodeQuest Database Scripts

This directory contains scripts for setting up and populating the Supabase database with coding problems.

## Prerequisites

Before using these scripts, ensure you have:

1. A Supabase account and project
2. The project's URL and anon key
3. A `.env.local` file at the root of your project with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Node.js installed (v14+ recommended)
5. Required dependencies installed via `npm install`

## Available Scripts

### 1. Setup Coding Problems Table

This script creates the `coding_problems` table in your Supabase project with the correct schema and permissions.

```bash
npm run setup-coding-problems
```

**What it does:**
- Creates a `coding_problems` table if it doesn't exist
- Sets up appropriate columns and data types
- Configures Row Level Security (RLS)
- Creates policies for read, insert, and update operations
- Adds the table to realtime publication if it exists

**When to use it:**
- When setting up the project for the first time
- If you need to recreate the table

### 2. Populate Problems

This script loads problem data from JSON files in the problem category directories and uploads them to your Supabase database.

```bash
npm run populate-problems
```

**What it does:**
- Checks if the `coding_problems` table exists
- Loads all problem JSON files from the `/src/data/problems/` directories
- Upserts the problems into the Supabase table (uses the problem ID as the conflict key)
- Reports progress and any errors during the upload

**When to use it:**
- After creating the table with `setup-coding-problems`
- Whenever you add or modify problem JSON files

## Adding New Problems

To add new problems:

1. Create a new JSON file in the appropriate category folder under `src/data/problems/`
2. Follow the existing problem format:
   ```json
   {
     "id": "unique-problem-id",
     "title": "Problem Title",
     "description": "Problem description with markdown support",
     "difficulty": "easy|medium|hard",
     "category": "Category Name",
     "starterCode": {
       "javascript": "function solution(params) {\n  // Your code here\n}",
       "python": "def solution(params):\n    # Your code here\n    pass"
     },
     "solutionCode": {
       "javascript": "function solution(params) {\n  // Solution\n}",
       "python": "def solution(params):\n    # Solution\n    pass"
     },
     "constraints": ["Constraint 1", "Constraint 2"],
     "examples": ["Example 1", "Example 2"],
     "testCases": [
       {
         "input": "test input",
         "output": "expected output",
         "isHidden": false
       }
     ]
   }
   ```
3. Run the populate script to upload the new problem:
   ```bash
   npm run populate-problems
   ```

## Troubleshooting

### Table Creation Issues

If the table creation script fails:

1. Check your Supabase credentials in `.env.local`
2. Ensure your Supabase project has the required permissions
3. Try running the SQL manually in the Supabase SQL Editor:
   - Find the SQL in `src/scripts/setupCodingProblemsTable.ts`
   - Copy the SQL query and run it in Supabase's SQL Editor

### Population Issues

If the population script fails:

1. Verify that the table exists by checking in Supabase dashboard
2. Ensure your JSON files follow the correct format
3. Check for console errors to identify specific problems

## Categories

The system currently supports the following problem categories:

1. Forest of Arrays
2. Hashmap Dungeons
3. Binary Search Castle
4. Linked List Gardens
5. Tree of Wisdom
6. Graph Adventures
7. Dynamic Programming Peaks
8. Stack & Queue Tavern
9. String Sorcery
10. Sorting Sanctuary

Each category has a corresponding folder in `src/data/problems/`. 