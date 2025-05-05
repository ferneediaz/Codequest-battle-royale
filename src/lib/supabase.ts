import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// DEBUG: Log environment variable values
console.log('DEBUG: Supabase URL loaded:', supabaseUrl ? '✅ URL exists' : '❌ URL missing');
console.log('DEBUG: Supabase Anon Key:', supabaseAnonKey ? '✅ Key exists' : '❌ Key missing');
// Only show first few chars of key for security
if (supabaseAnonKey) {
  console.log('DEBUG: Key starts with:', supabaseAnonKey.substring(0, 5) + '...');
}

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env.local file.');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client with enhanced realtime configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
      // Improved reliability
      heartbeatIntervalMs: 5000 // Send heartbeats every 5 seconds
    }
  },
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  // Global error handler for better debugging
  global: {
    fetch: (...args) => {
      // DEBUG: Log request being made
      const url = args[0] instanceof Request ? args[0].url : String(args[0]);
      console.log(`DEBUG: Supabase fetch request to: ${url}`);
      
      // Log if apikey is present in the request
      const headers = args[0] instanceof Request ? args[0].headers : (args[1]?.headers || {});
      const hasApiKey = headers instanceof Headers 
        ? headers.has('apikey') 
        : Object.keys(headers).includes('apikey');
      console.log(`DEBUG: Request has API key header: ${hasApiKey ? '✅' : '❌'}`);
      
      // @ts-ignore
      return fetch(...args).catch(err => {
        console.error('Supabase fetch error:', err);
        throw err;
      });
    }
  }
});

console.log('DEBUG: Supabase client created');

// Test the connection during initialization
(async () => {
  try {
    console.log('DEBUG: Starting initial connection check...');
    
    // FIX: Changed from count(*) to a simpler query
    const { data, error } = await supabase
      .from('battle_sessions')
      .select('id')
      .limit(1);
    
    if (error) {
      console.warn('Initial connection check: Battle sessions table might not exist yet:', error.message);
      console.log('This is normal if the table doesn\'t exist yet and will be created during setup.');
      console.log('DEBUG: Full error object:', JSON.stringify(error));
    } else {
      console.log('Initial connection check: Successfully connected to Supabase.');
      console.log('DEBUG: Connection verified, data:', data);
    }
  } catch (err: any) {
    console.error('Error during initial connection check:', err?.message || err);
    console.error('DEBUG: Detailed error:', err);
  }
})(); 