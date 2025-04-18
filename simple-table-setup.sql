-- Simple script to create the battle_sessions table
-- This avoids complex transactions and focuses only on the essentials

-- Create the table (dropping first to ensure a clean slate)
DROP TABLE IF EXISTS public.battle_sessions;

CREATE TABLE public.battle_sessions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active_users INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT FALSE,
  round INTEGER DEFAULT 1,
  time_remaining INTEGER DEFAULT 300,
  current_category TEXT,
  connected_emails TEXT[] DEFAULT '{}'::TEXT[]
);

-- Grant permissions
GRANT ALL ON public.battle_sessions TO anon, authenticated;

-- Enable RLS but with permissive policies
ALTER TABLE public.battle_sessions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to do everything (for testing purposes)
CREATE POLICY "battle_sessions_all_access"
  ON public.battle_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default session
INSERT INTO public.battle_sessions (id, active_users, is_active, round, time_remaining, current_category, connected_emails)
VALUES ('default-battle-session', 0, false, 1, 300, 'Binary Search Castle', '{}'::TEXT[]);

-- Set up realtime using a DO block (PL/pgSQL) instead of CASE expression
DO $$
BEGIN
  -- Check if publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Publication exists, add table if not already in the publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'battle_sessions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_sessions;
    END IF;
  ELSE
    -- Publication doesn't exist, create it
    CREATE PUBLICATION supabase_realtime FOR TABLE public.battle_sessions;
  END IF;
END
$$; 