import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
      // @ts-ignore
      return fetch(...args).catch(err => {
        console.error('Supabase fetch error:', err);
        throw err;
      });
    }
  }
});

// Test the connection during initialization
(async () => {
  try {
    const { data, error } = await supabase
      .from('battle_sessions')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.warn('Initial connection check: Battle sessions table might not exist yet:', error.message);
      console.log('This is normal if the table doesn\'t exist yet and will be created during setup.');
    } else {
      console.log('Initial connection check: Successfully connected to Supabase.');
    }
  } catch (err: any) {
    console.error('Error during initial connection check:', err?.message || err);
  }
})(); 