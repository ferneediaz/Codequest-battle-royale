/**
 * Script to set up the coding_problems table in Supabase
 * Run with: npm run setup-coding-problems
 */

import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local file
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

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env.local file.');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupCodingProblemsTable() {
  console.log('Setting up coding_problems table...');
  
  try {
    // Try to create the table directly with single query
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.coding_problems (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          category TEXT NOT NULL,
          "starterCode" JSONB NOT NULL,
          "solutionCode" JSONB,
          constraints TEXT[],
          examples TEXT[],
          "testCases" JSONB NOT NULL,
          "timeLimit" INTEGER,
          "memoryLimit" INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
        
        -- Grant access to public
        GRANT ALL ON public.coding_problems TO anon, authenticated;
        
        -- Create policies for read access
        DROP POLICY IF EXISTS "Allow public read access to coding_problems" ON public.coding_problems;
        CREATE POLICY "Allow public read access to coding_problems"
          ON public.coding_problems
          FOR SELECT
          USING (true);
        
        -- Create policies for insert access (admin only in production)
        DROP POLICY IF EXISTS "Allow public insert to coding_problems" ON public.coding_problems;
        CREATE POLICY "Allow public insert to coding_problems"
          ON public.coding_problems
          FOR INSERT
          WITH CHECK (true);
          
        -- Create policies for update access (admin only in production)
        DROP POLICY IF EXISTS "Allow public update to coding_problems" ON public.coding_problems;
        CREATE POLICY "Allow public update to coding_problems"
          ON public.coding_problems
          FOR UPDATE
          USING (true)
          WITH CHECK (true);
          
        -- Add to realtime publication if it exists
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.coding_problems;
          END IF;
        END
        $$;
      `
    });
    
    if (error) {
      console.log('RPC method failed, trying direct SQL...');
      
      // If the RPC method fails, try direct SQL using pg_dump
      const { error: pgError } = await supabase.functions.invoke('execute-sql', {
        body: {
          query: `
            CREATE TABLE IF NOT EXISTS public.coding_problems (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              difficulty TEXT NOT NULL,
              category TEXT NOT NULL,
              "starterCode" JSONB NOT NULL,
              "solutionCode" JSONB,
              constraints TEXT[],
              examples TEXT[],
              "testCases" JSONB NOT NULL,
              "timeLimit" INTEGER,
              "memoryLimit" INTEGER,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        }
      });
      
      if (pgError) {
        console.error('Failed to create table using all methods:', pgError);
        
        // As a last resort, try to check if the table already exists
        // by attempting to query from it
        const { error: checkError } = await supabase
          .from('coding_problems')
          .select('id')
          .limit(1);
          
        if (checkError) {
          console.error('Table does not exist and could not be created. Manual SQL needed:', checkError);
          console.log('\n-----------------------------');
          console.log('IMPORTANT: You need to execute the following SQL in the Supabase SQL Editor:');
          console.log(`
CREATE TABLE IF NOT EXISTS public.coding_problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  category TEXT NOT NULL,
  "starterCode" JSONB NOT NULL,
  "solutionCode" JSONB,
  constraints TEXT[],
  examples TEXT[],
  "testCases" JSONB NOT NULL,
  "timeLimit" INTEGER,
  "memoryLimit" INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;

-- Grant access to public
GRANT ALL ON public.coding_problems TO anon, authenticated;

-- Create policies for read access
CREATE POLICY "Allow public read access to coding_problems"
  ON public.coding_problems
  FOR SELECT
  USING (true);

-- Create policies for insert access (admin only in production)
CREATE POLICY "Allow public insert to coding_problems"
  ON public.coding_problems
  FOR INSERT
  WITH CHECK (true);
  
-- Create policies for update access (admin only in production)
CREATE POLICY "Allow public update to coding_problems"
  ON public.coding_problems
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
          `);
          console.log('-----------------------------');
          return false;
        } else {
          console.log('Table appears to exist already');
          return true;
        }
      }
    }
    
    console.log('Successfully set up coding_problems table');
    return true;
    
  } catch (error) {
    console.error('Error setting up coding_problems table:', error);
    return false;
  }
}

async function main() {
  try {
    const success = await setupCodingProblemsTable();
    if (success) {
      console.log('Coding problems table setup complete');
    } else {
      console.error('Failed to set up coding problems table');
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main(); 