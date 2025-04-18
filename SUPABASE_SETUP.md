# Supabase Setup for CodeQuest Battle Royale

This document explains how to set up Supabase for the real-time player count functionality in the Battle Arena.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Create a new project
3. Note down your project URL and anon key (you'll need these for your `.env.local` file)

## 2. Set Up Authentication

1. Go to Authentication → Providers
2. Enable GitHub authentication:
   - Create a GitHub OAuth app at GitHub → Settings → Developer settings → OAuth Apps
   - Use your Supabase project's callback URL: `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`
   - Add the Client ID and Client Secret to the GitHub provider settings in Supabase
3. Enable Google authentication (if needed):
   - Create a Google OAuth client in the Google Cloud Console
   - Use your Supabase project's callback URL: `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`
   - Add the Client ID and Client Secret to the Google provider settings in Supabase

## 3. Create the Database Table

1. Go to the SQL Editor in your Supabase project
2. Copy and run the SQL from `setup-battle-sessions.sql` file in this repository
3. This will:
   - Create the battle_sessions table
   - Set up appropriate permissions
   - Enable Realtime for this table

## 4. Enable Realtime

1. Go to Database → Replication
2. Ensure that Realtime is turned ON
3. Make sure the `battle_sessions` table is included in the publication

## 5. Configure Your Application

1. Copy `.env.example` to `.env.local`
2. Update with your Supabase URL and anon key:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting

If real-time updates aren't working:

1. **Check Browser Console**: Look for any subscription errors
2. **Verify Realtime is Enabled**:
   - Go to Database → Replication
   - Ensure Realtime is ON
   - Check that the publication includes the `battle_sessions` table
3. **Check RLS Policies**:
   - Make sure the table has appropriate Row Level Security policies
   - Users need SELECT and UPDATE permissions
4. **Test with the Manual Refresh Button**:
   - Use the "Refresh Count" button in the Battle Arena to see if the data can be retrieved
5. **Check Network Tab**:
   - Look for WebSocket connections to Supabase
   - Ensure they're not being blocked by a firewall or network policy

## Important Notes

- Each browser session creates a separate WebSocket connection
- The player count is shared across all connected clients
- When users leave the page, their count should decrease automatically
- If the count isn't updating in real-time, check the browser console for errors 