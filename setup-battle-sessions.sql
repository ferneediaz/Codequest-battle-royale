-- Create the battle_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.battle_sessions (
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

-- Create a policy to allow all users to read battle_sessions 
DROP POLICY IF EXISTS "Allow all users to read battle_sessions" ON public.battle_sessions;
CREATE POLICY "Allow all users to read battle_sessions"
  ON public.battle_sessions
  FOR SELECT
  USING (true);

-- Create a policy to allow all users to update battle_sessions (changing from authenticated to all users)
DROP POLICY IF EXISTS "Allow all users to update battle_sessions" ON public.battle_sessions;
CREATE POLICY "Allow all users to update battle_sessions"
  ON public.battle_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create a policy to allow all users to insert into battle_sessions (changing from authenticated to all users)
DROP POLICY IF EXISTS "Allow all users to insert into battle_sessions" ON public.battle_sessions;
CREATE POLICY "Allow all users to insert into battle_sessions"
  ON public.battle_sessions
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for the table
BEGIN;
  -- Drop publication if it exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create publication for all tables including battle_sessions
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;

-- Insert default battle session if it doesn't exist
INSERT INTO public.battle_sessions (id, active_users, is_active, round, time_remaining, current_category)
VALUES ('default-battle-session', 0, false, 1, 300, 'Binary Search Castle')
ON CONFLICT (id) DO NOTHING; 