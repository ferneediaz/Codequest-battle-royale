-- Run this in the Supabase SQL Editor to create the coding_problems table

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.coding_problems (
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

-- Enable RLS
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;

-- Grant access to public
GRANT ALL ON public.coding_problems TO anon, authenticated;

-- Create policies for read access
DROP POLICY IF EXISTS "Allow public read access to coding_problems" ON public.coding_problems;
CREATE POLICY "Allow public read access to coding_problems"
  ON public.coding_problems
  FOR SELECT
  USING (true);

-- Create policies for insert access (admin only in production)
DROP POLICY IF EXISTS "Allow public insert to coding_problems" ON public.coding_problems;
CREATE POLICY "Allow public insert to coding_problems"
  ON public.coding_problems
  FOR INSERT
  WITH CHECK (true);
  
-- Create policies for update access (admin only in production)
DROP POLICY IF EXISTS "Allow public update to coding_problems" ON public.coding_problems;
CREATE POLICY "Allow public update to coding_problems"
  ON public.coding_problems
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
  
-- Add to realtime publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coding_problems;
  END IF;
END
$$; 