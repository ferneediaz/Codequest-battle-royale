-- Enable realtime for the battle_sessions table specifically
BEGIN;
  -- First check if the publication exists
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
      -- Create publication
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- Add the table to the publication if not already added
  ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_sessions;
COMMIT; 