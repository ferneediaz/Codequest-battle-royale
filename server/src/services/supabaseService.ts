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
        console.log('Available tables from REST endpoint:');
        const tables = await res.json();
        console.log(JSON.stringify(tables, null, 2));
      } else {
        console.warn('Direct fetch failed. Status:', res.status);
        console.warn('Response:', await res.text());
      }
    } catch (fetchErr: any) {
      console.warn('Direct fetch error:', fetchErr?.message);
    }
    
    // Try a very simple query for any table
    console.log('Testing tables list via RPC...');
    try {
      const { data, error } = await supabase.rpc('get_tables');
      if (error) {
        console.log('RPC failed:', error.message);
      } else {
        console.log('Available tables:', data);
      }
    } catch (e: any) {
      console.log('RPC exception:', e?.message);
    }
    
    // Try the most basic query possible
    console.log('Attempting most basic query...');
    try {
      const { data, error } = await supabase
        .from('coding_problems')
        .select('*')
        .limit(1);
      
      if (error) {
        console.warn('Basic query failed:', error.message);
        console.warn('Error code:', error.code);
        console.warn('Full error:', JSON.stringify(error));
        return false;
      } else {
        console.log('Basic query succeeded!');
        console.log('Data:', data);
        return true;
      }
    } catch (err: any) {
      console.error('Exception during basic query:', err?.message || String(err));
      console.error('Full error object:', JSON.stringify(err, null, 2));
      return false;
    }
  } catch (err: any) {
    console.error('Error connecting to Supabase:', err?.message || String(err));
    console.error('Full error object:', JSON.stringify(err, null, 2));
    return false;
  }
}; 