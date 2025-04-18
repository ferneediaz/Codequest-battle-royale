import { supabase } from './supabase';

export async function diagnoseSupabaseConnection(): Promise<string[]> {
  const results: string[] = [];
  results.push('Starting Supabase connection diagnosis...');
  
  try {
    // Check if we can connect to Supabase at all
    results.push('Checking basic Supabase connection...');
    const { data: version, error: versionError } = await supabase.rpc('version');
    
    if (versionError) {
      results.push(`❌ Basic connection error: ${versionError.message}`);
    } else {
      results.push('✅ Basic Supabase connection successful');
    }
    
    // Check if table exists
    results.push('Checking for battle_sessions table...');
    const { data: tables, error: tablesError } = await supabase.from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'battle_sessions');
    
    if (tablesError) {
      results.push(`❌ Error querying tables: ${tablesError.message}`);
    } else if (!tables || tables.length === 0) {
      results.push('❌ battle_sessions table not found in public schema');
    } else {
      results.push('✅ battle_sessions table exists');
    }
    
    // Try to query the table directly
    results.push('Attempting to query battle_sessions table...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('battle_sessions')
      .select('*')
      .limit(1);
    
    if (sessionsError) {
      results.push(`❌ Error querying battle_sessions: ${sessionsError.message}`);
    } else {
      results.push(`✅ Successfully queried battle_sessions table: ${sessions.length} records found`);
    }
    
    // Check realtime status
    results.push('Checking realtime setup...');
    const { data: publications, error: pubError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT pubname, tablename 
        FROM pg_publication p
        JOIN pg_publication_tables pt ON p.pubname = pt.pubname
        WHERE p.pubname = 'supabase_realtime'
          AND pt.tablename = 'battle_sessions';
      `
    });
    
    if (pubError) {
      results.push(`❌ Error checking realtime publications: ${pubError.message}`);
    } else if (!publications || publications.length === 0) {
      results.push('❌ battle_sessions not included in supabase_realtime publication');
    } else {
      results.push('✅ battle_sessions is properly set up for realtime');
    }
    
  } catch (error) {
    results.push(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  results.push('Diagnosis complete');
  return results;
}

export async function testRealtimeSubscription(): Promise<void> {
  console.log('Setting up test realtime subscription');
  
  const channel = supabase.channel('test-channel')
    .on(
      'postgres_changes',
      { 
        event: '*',
        schema: 'public', 
        table: 'battle_sessions',
      },
      (payload) => {
        console.log('✅ Received realtime update!', payload);
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to changes');
        
        // After subscription is confirmed, update the table to test
        setTimeout(async () => {
          console.log('Triggering a test update with special value 999 (for testing only)...');
          
          try {
            // First get the current state to preserve emails
            const { data: session } = await supabase
              .from('battle_sessions')
              .select('connected_emails')
              .eq('id', 'default-battle-session')
              .single();
              
            // Set test value but preserve emails
            const { data, error } = await supabase
              .from('battle_sessions')
              .update({ 
                active_users: 999, // Test value
                connected_emails: session?.connected_emails || []
              })
              .eq('id', 'default-battle-session')
              .select();
              
            if (error) {
              console.error('❌ Error triggering test update:', error);
            } else {
              console.log('✅ Test update sent:', data);
              console.log('NOTE: The value 999 is only for testing realtime. Use Reset Count to fix this.');
            }
          } catch (err) {
            console.error('❌ Exception during test update:', err);
          }
        }, 2000);
      }
    });
    
  console.log('Test subscription set up, watch console for results');
  console.log('NOTE: This will temporarily set the player count to 999 for testing purposes only.');
} 