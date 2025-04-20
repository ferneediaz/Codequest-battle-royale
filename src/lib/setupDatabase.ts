import { supabase } from './supabase';

export async function setupBattleSessionsTable(): Promise<{success: boolean, message: string}> {
  try {
    console.log('Setting up battle_sessions table...');
    
    // Check if we can use direct table operations instead of RPC
    const { error: directCreateError } = await supabase
      .from('battle_sessions')
      .insert({
        id: 'default-battle-session',
        active_users: 0,
        is_active: false,
        round: 1,
        time_remaining: 300,
        current_category: 'Binary Search Castle',
        connected_emails: []
      })
      .select()
      .single();
      
    // If direct operation worked, we're done
    if (!directCreateError) {
      console.log('Successfully created battle_sessions table using direct insert');
      return {
        success: true,
        message: 'Successfully created battle_sessions table. Realtime should be enabled in your Supabase dashboard.'
      };
    }
      
    console.log('Direct insert failed, trying RPC method:', directCreateError.message);
    
    // First check if the RPC function is available
    const { data: rpcFunctionsCheck, error: rpcCheckError } = await supabase.rpc('execute_sql', {
      sql_query: `SELECT 1;`
    });
    
    if (rpcCheckError) {
      console.error('RPC execute_sql function is not available:', rpcCheckError);
      return {
        success: false,
        message: `RPC function 'execute_sql' is not available: ${rpcCheckError.message}. You need to enable database functions in your Supabase project or contact support.`
      };
    }
    
    console.log('RPC check passed, function available:', rpcFunctionsCheck);
    
    // Try to create the table with connected_emails column
    const createTableResult = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Create the battle_sessions table if it doesn't exist
        CREATE TABLE IF NOT EXISTS public.battle_sessions (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          active_users INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT FALSE,
          round INTEGER DEFAULT 1,
          time_remaining INTEGER DEFAULT 300,
          current_category TEXT,
          connected_emails TEXT[] DEFAULT '{}'::TEXT[],
          last_left TEXT DEFAULT NULL,
          last_left_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
          ready_users TEXT[] DEFAULT '{}'::TEXT[],
          topic_selections JSONB DEFAULT '{}'::JSONB,
          selected_topics TEXT[] DEFAULT '{}'::TEXT[],
          battle_state TEXT DEFAULT 'topic_selection'
        );
        
        -- Add connected_emails column if it doesn't exist yet (for backward compatibility)
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'battle_sessions' 
            AND column_name = 'connected_emails'
          ) THEN
            ALTER TABLE public.battle_sessions ADD COLUMN connected_emails TEXT[] DEFAULT '{}'::TEXT[];
          END IF;
          
          -- Add last_left column if it doesn't exist
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'battle_sessions' 
            AND column_name = 'last_left'
          ) THEN
            ALTER TABLE public.battle_sessions ADD COLUMN last_left TEXT DEFAULT NULL;
          END IF;
          
          -- Add last_left_at column if it doesn't exist
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'battle_sessions' 
            AND column_name = 'last_left_at'
          ) THEN
            ALTER TABLE public.battle_sessions ADD COLUMN last_left_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
          END IF;
          
          -- Add updated_at column if it doesn't exist
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'battle_sessions' 
            AND column_name = 'updated_at'
          ) THEN
            ALTER TABLE public.battle_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
          END IF;
          
          -- Add ready_users column if it doesn't exist
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'battle_sessions' 
            AND column_name = 'ready_users'
          ) THEN
            ALTER TABLE public.battle_sessions ADD COLUMN ready_users TEXT[] DEFAULT '{}'::TEXT[];
          END IF;
          
          -- Add topic_selections column if it doesn't exist
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'battle_sessions' 
            AND column_name = 'topic_selections'
          ) THEN
            ALTER TABLE public.battle_sessions ADD COLUMN topic_selections JSONB DEFAULT '{}'::JSONB;
          END IF;
          
          -- Add selected_topics column if it doesn't exist
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'battle_sessions' 
            AND column_name = 'selected_topics'
          ) THEN
            ALTER TABLE public.battle_sessions ADD COLUMN selected_topics TEXT[] DEFAULT '{}'::TEXT[];
          END IF;
          
          -- Add battle_state column if it doesn't exist
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'battle_sessions' 
            AND column_name = 'battle_state'
          ) THEN
            ALTER TABLE public.battle_sessions ADD COLUMN battle_state TEXT DEFAULT 'topic_selection';
          END IF;
        END
        $$;
      `
    });
    
    if (createTableResult.error) {
      console.error('Error creating table:', createTableResult.error);
      return {
        success: false,
        message: `Error creating table: ${createTableResult.error.message}. RPC function 'execute_sql' may not be available. See setup instructions.`
      };
    }
    
    // Set up RLS
    const rlsResult = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Enable row level security
        ALTER TABLE public.battle_sessions ENABLE ROW LEVEL SECURITY;
        
        -- Make sure the table is included in the public schema
        GRANT ALL ON public.battle_sessions TO anon, authenticated;
        
        -- Create a policy to allow all users to read battle_sessions 
        DROP POLICY IF EXISTS "Allow all users to read battle_sessions" ON public.battle_sessions;
        CREATE POLICY "Allow all users to read battle_sessions"
          ON public.battle_sessions
          FOR SELECT
          USING (true);
        
        -- Create a policy to allow all users to update battle_sessions
        DROP POLICY IF EXISTS "Allow all users to update battle_sessions" ON public.battle_sessions;
        CREATE POLICY "Allow all users to update battle_sessions"
          ON public.battle_sessions
          FOR UPDATE
          USING (true)
          WITH CHECK (true);
        
        -- Create a policy to allow all users to insert into battle_sessions
        DROP POLICY IF EXISTS "Allow all users to insert into battle_sessions" ON public.battle_sessions;
        CREATE POLICY "Allow all users to insert into battle_sessions"
          ON public.battle_sessions
          FOR INSERT
          WITH CHECK (true);
      `
    });
    
    if (rlsResult.error) {
      console.error('Error setting up RLS:', rlsResult.error);
      return {
        success: false,
        message: `Table created but error setting up permissions: ${rlsResult.error.message}`
      };
    }
    
    // Set up realtime
    const realtimeResult = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Check if publication exists and add table if needed
        DO $$
        DECLARE
          realtime_status TEXT;
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
            -- Publication exists, add table if not already in the publication
            IF NOT EXISTS (
              SELECT 1 FROM pg_publication_tables 
              WHERE pubname = 'supabase_realtime' AND tablename = 'battle_sessions'
            ) THEN
              ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_sessions;
              realtime_status := 'Added battle_sessions to existing publication';
            ELSE
              realtime_status := 'Table already in publication';
            END IF;
          ELSE
            -- Publication doesn't exist, create it
            CREATE PUBLICATION supabase_realtime FOR TABLE public.battle_sessions;
            realtime_status := 'Created new publication for battle_sessions';
          END IF;
          
          -- Return status for logging
          RAISE NOTICE 'Realtime status: %', realtime_status;
          
          -- Enable full replica identity for better change tracking
          ALTER TABLE public.battle_sessions REPLICA IDENTITY FULL;
        END
        $$;
      `
    });
    
    if (realtimeResult.error) {
      console.error('Error setting up realtime:', realtimeResult.error);
      return {
        success: false,
        message: `Table created but error setting up realtime: ${realtimeResult.error.message}`
      };
    }
    
    console.log('Realtime setup completed:', realtimeResult);
    
    // First check if default session exists
    const { data: existingSession, error: existingSessionError } = await supabase
      .from('battle_sessions')
      .select('*')
      .eq('id', 'default-battle-session')
      .maybeSingle();
    
    if (existingSessionError && existingSessionError.code !== 'PGRST116') {
      console.error('Error checking for existing session:', existingSessionError);
      return {
        success: false,
        message: `Error checking for existing session: ${existingSessionError.message}`
      };
    }
    
    if (!existingSession) {
      // Insert default battle session if it doesn't exist
      const { error: insertError } = await supabase
        .from('battle_sessions')
        .insert({
          id: 'default-battle-session',
          active_users: 0,
          is_active: false,
          round: 1,
          time_remaining: 300,
          current_category: 'Binary Search Castle',
          connected_emails: []
        });
        
      if (insertError) {
        console.error('Error inserting default session:', insertError);
        return {
          success: false,
          message: `Table created but error inserting default session: ${insertError.message}`
        };
      }
    }
    
    // Set up battle_skill_effects table for skills
    const skillsTableResult = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Create battle_skill_effects table if it doesn't exist
        CREATE TABLE IF NOT EXISTS public.battle_skill_effects (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          from_user TEXT NOT NULL,
          target_user TEXT NOT NULL,
          skill_name TEXT NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          battle_session_id TEXT NOT NULL REFERENCES public.battle_sessions(id),
          is_active BOOLEAN DEFAULT TRUE
        );
        
        -- Enable RLS for battle_skill_effects
        ALTER TABLE public.battle_skill_effects ENABLE ROW LEVEL SECURITY;
        
        -- Make table accessible 
        GRANT ALL ON public.battle_skill_effects TO anon, authenticated;
        
        -- Create policies for battle_skill_effects
        DROP POLICY IF EXISTS "Allow all users to read battle_skill_effects" ON public.battle_skill_effects;
        CREATE POLICY "Allow all users to read battle_skill_effects"
          ON public.battle_skill_effects
          FOR SELECT
          USING (true);
          
        DROP POLICY IF EXISTS "Allow all users to insert into battle_skill_effects" ON public.battle_skill_effects;
        CREATE POLICY "Allow all users to insert into battle_skill_effects"
          ON public.battle_skill_effects
          FOR INSERT
          WITH CHECK (true);
          
        -- Add to realtime
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
            IF NOT EXISTS (
              SELECT 1 FROM pg_publication_tables 
              WHERE pubname = 'supabase_realtime' AND tablename = 'battle_skill_effects'
            ) THEN
              ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_skill_effects;
            END IF;
          END IF;
        END
        $$;
      `
    });
    
    if (skillsTableResult.error) {
      console.warn('Warning: Error setting up battle_skill_effects table:', skillsTableResult.error);
      // Continue anyway since this isn't critical
    }
    
    console.log('Successfully set up battle_sessions table');
    return {
      success: true,
      message: 'Successfully set up battle_sessions table and enabled realtime'
    };
    
  } catch (error) {
    console.error('Error setting up database:', error);
    return {
      success: false,
      message: `Error setting up database: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function checkTableExists(): Promise<boolean> {
  try {
    // First try a simple query to check if the table exists
    const { error } = await supabase
      .from('battle_sessions')
      .select('count(*)', { count: 'exact', head: true });
    
    if (!error) {
      console.log('Table exists and is accessible');
      return true;
    }
    
    console.log('Table check failed with error:', error);
    
    // If that fails, try a more direct approach using raw SQL query
    // to check if the table exists in the database schema
    const { data, error: sqlError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'battle_sessions'
        );
      `
    });
    
    if (sqlError) {
      console.error('Error checking table existence with SQL:', sqlError);
      if (sqlError.message.includes('execute_sql')) {
        console.error('The execute_sql RPC function is not available. Please follow setup instructions.');
      }
      return false;
    }
    
    console.log('SQL check result:', data);
    return data && data.length > 0 && data[0].exists === true;
  } catch (error) {
    console.error('Error checking if table exists:', error);
    return false;
  }
}

/**
 * Sets up the coding_problems table in Supabase
 */
export async function setupCodingProblemsTable() {
  try {
    // Create the coding_problems table if it doesn't exist using raw SQL
    // First check if the table exists
    const { data: tableExists, error: checkError } = await supabase
      .from('coding_problems')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.log('Table does not exist yet or there was an error, creating it now...');
      
      // Since we can't easily create functions via API, use raw SQL to create the tables
      const { error: createTableError } = await supabase.rpc('create_table_if_not_exists', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS coding_problems (
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
        
          -- Create the code_submissions table for tracking submissions
          CREATE TABLE IF NOT EXISTS code_submissions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "problemId" TEXT NOT NULL REFERENCES coding_problems(id),
            "userId" UUID NOT NULL REFERENCES auth.users(id),
            code TEXT NOT NULL,
            language TEXT NOT NULL,
            status TEXT NOT NULL,
            "passedTestCases" INTEGER,
            "totalTestCases" INTEGER,
            "executionTime" FLOAT,
            "memoryUsed" INTEGER,
            results JSONB,
            "submittedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (createTableError) {
        console.error('Error creating tables:', createTableError);
        
        // Fallback: Try direct query
        const { error: directQueryError } = await supabase.rpc('exec_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS coding_problems (
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
        });
        
        if (directQueryError) {
          console.error('Error with direct SQL query:', directQueryError);
          return { success: false, message: 'Could not create coding_problems table' };
        }
      }
    } else {
      console.log('coding_problems table already exists');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in setupCodingProblemsTable:', error);
    return { success: false, message: error.message };
  }
} 