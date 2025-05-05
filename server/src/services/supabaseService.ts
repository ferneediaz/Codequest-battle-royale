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
    
    const { data, error } = await supabase
      .from('coding_problems')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.warn('Supabase connection issue:', error.message);
      console.warn('Full error:', JSON.stringify(error));
      return false;
    }
    
    console.log('Successfully connected to Supabase');
    return true;
  } catch (err) {
    console.error('Error connecting to Supabase:', err?.message || err);
    return false;
  }
}; 