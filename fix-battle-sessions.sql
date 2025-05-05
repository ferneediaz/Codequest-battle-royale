-- Add missing columns to battle_sessions table

-- First, check if columns exist and add them if they don't
DO $$
BEGIN
    -- Add connected_emails column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'battle_sessions' AND column_name = 'connected_emails') THEN
        ALTER TABLE public.battle_sessions ADD COLUMN connected_emails TEXT[] DEFAULT '{}';
    END IF;

    -- Add ready_users column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'battle_sessions' AND column_name = 'ready_users') THEN
        ALTER TABLE public.battle_sessions ADD COLUMN ready_users TEXT[] DEFAULT '{}';
    END IF;

    -- Add topic_selections column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'battle_sessions' AND column_name = 'topic_selections') THEN
        ALTER TABLE public.battle_sessions ADD COLUMN topic_selections JSONB DEFAULT '{}';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'battle_sessions' AND column_name = 'updated_at') THEN
        ALTER TABLE public.battle_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add battle_state column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'battle_sessions' AND column_name = 'battle_state') THEN
        ALTER TABLE public.battle_sessions ADD COLUMN battle_state TEXT DEFAULT 'topic_selection';
    END IF;

    -- Add selected_topics column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'battle_sessions' AND column_name = 'selected_topics') THEN
        ALTER TABLE public.battle_sessions ADD COLUMN selected_topics TEXT[] DEFAULT '{}';
    END IF;

    -- Add last_state_change column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'battle_sessions' AND column_name = 'last_state_change') THEN
        ALTER TABLE public.battle_sessions ADD COLUMN last_state_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add state_changed_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'battle_sessions' AND column_name = 'state_changed_by') THEN
        ALTER TABLE public.battle_sessions ADD COLUMN state_changed_by TEXT;
    END IF;
END $$;

-- Reset the ready_users array to fix issues
UPDATE public.battle_sessions 
SET ready_users = '{}'
WHERE id = 'default-battle-session';

-- Make sure realtime is enabled for the table
BEGIN;
  -- Drop publication if it exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create publication for all tables
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT; 