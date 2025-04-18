-- Drop the existing table if it exists
DROP TABLE IF EXISTS public.battle_sessions;

-- Create the battle_sessions table
CREATE TABLE public.battle_sessions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active_users INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT FALSE,
  round INTEGER DEFAULT 1,
  time_remaining INTEGER DEFAULT 300,
  current_category TEXT
);

-- Enable row level security
ALTER TABLE public.battle_sessions ENABLE ROW LEVEL SECURITY;

-- Make sure the table is included in the public schema
GRANT ALL ON public.battle_sessions TO anon, authenticated;

-- Create policies with unrestricted access for testing
-- Allow all users to read
DROP POLICY IF EXISTS "Allow all users to read battle_sessions" ON public.battle_sessions;
CREATE POLICY "Allow all users to read battle_sessions"
  ON public.battle_sessions
  FOR SELECT
  USING (true);

-- Allow all users to update
DROP POLICY IF EXISTS "Allow all users to update battle_sessions" ON public.battle_sessions;
CREATE POLICY "Allow all users to update battle_sessions"
  ON public.battle_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow all users to insert
DROP POLICY IF EXISTS "Allow all users to insert battle_sessions" ON public.battle_sessions;
CREATE POLICY "Allow all users to insert battle_sessions"
  ON public.battle_sessions
  FOR INSERT
  WITH CHECK (true);

-- Allow all users to delete
DROP POLICY IF EXISTS "Allow all users to delete battle_sessions" ON public.battle_sessions;
CREATE POLICY "Allow all users to delete battle_sessions"
  ON public.battle_sessions
  FOR DELETE
  USING (true);

-- Enable realtime for the table
DO $$
BEGIN
  -- Drop the publication if it exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create a new publication
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
END
$$;

-- Insert default battle session
INSERT INTO public.battle_sessions (id, active_users, is_active, round, time_remaining, current_category)
VALUES ('default-battle-session', 0, false, 1, 300, 'Binary Search Castle')
ON CONFLICT (id) DO NOTHING;

-- Reset the active_users count to 0
UPDATE public.battle_sessions SET active_users = 0 WHERE id = 'default-battle-session'; 