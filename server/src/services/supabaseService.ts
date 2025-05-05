import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || supabaseUrl.includes('your-actual-project')) {
  console.error('⛔ ERROR: Missing or invalid SUPABASE_URL in .env file');
  console.error('You need to set your actual Supabase URL, not the placeholder value');
  console.error('1. Look in your frontend .env file for VITE_SUPABASE_URL');
  console.error('2. Copy that value to server/.env as SUPABASE_URL (without the VITE_ prefix)');
  process.exit(1);
}

if (!supabaseAnonKey || supabaseAnonKey.includes('your-actual-supabase')) {
  console.error('⛔ ERROR: Missing or invalid SUPABASE_ANON_KEY in .env file');
  console.error('You need to set your actual Supabase anon key, not the placeholder value');
  console.error('1. Look in your frontend .env file for VITE_SUPABASE_ANON_KEY');
  console.error('2. Copy that value to server/.env as SUPABASE_ANON_KEY (without the VITE_ prefix)');
  process.exit(1);
}

console.log('✅ Supabase credentials found in .env file');

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  auth: {
    autoRefreshToken: true,
    persistSession: false
  }
});

// Test the connection
export const testConnection = async () => {
  try {
    console.log(`Attempting connection with URL: ${supabaseUrl?.substring(0, 12)}...`);
    console.log('Environment variables available:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    
    // Try direct fetch to Supabase
    try {
      console.log('Testing direct fetch to Supabase health endpoint...');
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      
      if (res.ok) {
        console.log('Direct fetch successful! Status:', res.status);
      } else {
        console.warn('Direct fetch failed. Status:', res.status);
        console.warn('Response:', await res.text());
      }
    } catch (fetchErr: any) {
      console.warn('Direct fetch error:', fetchErr?.message);
    }
    
    // List available tables
    console.log('Attempting to list tables...');
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
        
      if (tablesError) {
        console.warn('Failed to list tables:', tablesError.message);
      } else {
        console.log('Available tables:', tables?.map(t => t.tablename).join(', ') || 'No tables found');
      }
    } catch (e: any) {
      console.warn('Error listing tables:', e?.message);
    }
    
    // Test with a simple query that doesn't use the coding_problems table
    console.log('Testing simple public query...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('count(*)')
        .limit(1)
        .single();
      
      if (testError) {
        console.log('Alternative table query failed:', testError.message);
      } else {
        console.log('Alternative table query succeeded:', testData);
      }
    } catch (e: any) {
      console.warn('Error in alternative query:', e?.message);
    }
    
    // Try a simple query on coding_problems
    console.log('Testing coding_problems query...');
    const { data, error } = await supabase
      .from('coding_problems')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.warn('Supabase coding_problems query failed:', error.message || 'No error message');
      console.warn('Full error:', JSON.stringify(error, null, 2));
      return false;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Query result:', data);
    return true;
  } catch (err: any) {
    console.error('Error connecting to Supabase:', err?.message || String(err));
    console.error('Full error object:', JSON.stringify(err, null, 2));
    return false;
  }
}; 