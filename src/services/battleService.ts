import { supabase } from '../lib/supabase';
import type { BattleSession } from '../lib/supabase-types';

// Default battle session ID - we'll use a single session for simplicity
// In a more complex app, you might create multiple battle sessions
const DEFAULT_BATTLE_SESSION_ID = 'default-battle-session';

// Helper function to normalize email for comparison
const normalizeEmail = (email: string): string => {
  const [localPart] = email.split('@');
  return localPart.toLowerCase();
};

export const battleService = {
  // Join a battle session
  async joinBattle(userEmail?: string): Promise<BattleSession | null> {
    try {
      console.log('Attempting to join battle session with email:', userEmail);
      
      if (!userEmail) {
        console.warn('No user email provided');
        return null;
      }

      // Get existing session
      const { data: existingSession, error: fetchError } = await supabase
        .from('battle_sessions')
        .select('*')
        .eq('id', DEFAULT_BATTLE_SESSION_ID)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching session:', fetchError.message);
        throw new Error(`Error fetching session: ${fetchError.message}`);
      }

      if (existingSession) {
        console.log('Found existing session with data:', existingSession);
        
        // Get the current list of emails, ensuring it's not null
        let connectedEmails = Array.isArray(existingSession.connected_emails) 
          ? existingSession.connected_emails 
          : [];

        // Remove any stale entries of this user
        connectedEmails = connectedEmails.filter((email: string) => 
          normalizeEmail(email) !== normalizeEmail(userEmail)
        );

        // Add the new user email
        connectedEmails.push(userEmail);
        console.log('Current connected users:', connectedEmails);
        
        // IMPORTANT: Always remove this user from ready_users when joining
        // This ensures a user is only ready when they explicitly click the ready button
        let readyUsers = Array.isArray(existingSession.ready_users) 
          ? [...existingSession.ready_users]
          : [];
          
        // Remove the joining user from ready_users
        readyUsers = readyUsers.filter((email: string) => email !== userEmail);
        console.log('Removed user from ready list on join:', userEmail);
        
        const { data: updatedSession, error: updateError } = await supabase
          .from('battle_sessions')
          .update({ 
            active_users: connectedEmails.length,
            connected_emails: connectedEmails,
            ready_users: readyUsers,
            updated_at: new Date().toISOString()
          })
          .eq('id', DEFAULT_BATTLE_SESSION_ID)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating session:', updateError.message);
          throw new Error(`Error updating session: ${updateError.message}`);
        }
        
        console.log('Updated session:', updatedSession);
        return updatedSession;
      }

      // Create new session if it doesn't exist
      console.log('Creating new session...');
      const initialEmails = [userEmail];
      
      const { data: newSession, error: insertError } = await supabase
        .from('battle_sessions')
        .insert({
          id: DEFAULT_BATTLE_SESSION_ID,
          active_users: 1,
          is_active: false,
          round: 1,
          time_remaining: 300,
          current_category: 'Binary Search Castle',
          connected_emails: initialEmails,
          ready_users: [], // Initialize with empty ready_users array
          battle_state: 'topic_selection',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error creating session:', insertError.message);
        throw new Error(`Error creating session: ${insertError.message}`);
      }
      
      console.log('Created new session:', newSession);
      return newSession;
    } catch (error) {
      console.error('Error joining battle:', error);
      throw error;
    }
  },

  // Leave a battle session
  async leaveBattle(userEmail?: string): Promise<void> {
    try {
      console.log('Leaving battle session, email:', userEmail);
      
      if (!userEmail) {
        console.warn('No user email provided when leaving, cannot update properly');
        return;
      }
      
      // Get the current session
      const { data: session, error: fetchError } = await supabase
        .from('battle_sessions')
        .select('*')
        .eq('id', DEFAULT_BATTLE_SESSION_ID)
        .single();
      
      if (fetchError) {
        console.error('Error fetching session to leave:', fetchError.message);
        return;
      }
      
      if (session) {
        // Convert to array if null
        let connectedEmails = Array.isArray(session.connected_emails) 
          ? session.connected_emails 
          : [];
        
        // Remove the user email
        if (userEmail && connectedEmails.includes(userEmail)) {
          connectedEmails = connectedEmails.filter((email: string) => email !== userEmail);
          console.log('Removing email from connected list:', userEmail);
        } else {
          console.log('Email not found in connected list:', userEmail);
        }
        
        // Always set active_users to match the email list length
        const newCount = connectedEmails.length;
        
        console.log('Updating session with new count:', newCount, 'and emails:', connectedEmails);
        const { error: updateError } = await supabase
          .from('battle_sessions')
          .update({ 
            active_users: newCount,
            connected_emails: connectedEmails
          })
          .eq('id', DEFAULT_BATTLE_SESSION_ID);
          
        if (updateError) {
          console.error('Error updating active users count:', updateError.message);
        } else {
          console.log('Successfully left battle session, new count:', newCount);
        }
      }
    } catch (error) {
      console.error('Error leaving battle:', error);
    }
  },

  // Start a battle
  async startBattle(): Promise<void> {
    try {
      console.log('Starting battle...');
      const { error } = await supabase
        .from('battle_sessions')
        .update({ 
          is_active: true,
        })
        .eq('id', DEFAULT_BATTLE_SESSION_ID);
        
      if (error) {
        console.error('Error starting battle:', error.message);
      } else {
        console.log('Battle started successfully');
      }
    } catch (error) {
      console.error('Error starting battle:', error);
    }
  },

  // Sync connected users with count
  async syncUserCount(sessionId: string = DEFAULT_BATTLE_SESSION_ID): Promise<void> {
    try {
      console.log(`Syncing user count with connected emails for session: ${sessionId}`);
      const { data: session, error: fetchError } = await supabase
        .from('battle_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
        
      if (fetchError) {
        console.error(`Error fetching session ${sessionId} to sync:`, fetchError.message);
        return;
      }
      
      if (session) {
        // Get the emails, ensure it's an array
        const connectedEmails = Array.isArray(session.connected_emails) 
          ? session.connected_emails 
          : [];
        
        // If count doesn't match emails, update it
        if (session.active_users !== connectedEmails.length) {
          console.log('Count mismatch! Updating from', session.active_users, 'to', connectedEmails.length);
          
          const { error: updateError } = await supabase
            .from('battle_sessions')
            .update({ active_users: connectedEmails.length })
            .eq('id', sessionId);
            
          if (updateError) {
            console.error('Error syncing user count:', updateError.message);
          } else {
            console.log('Successfully synced user count to', connectedEmails.length);
          }
        } else {
          console.log('User count already in sync:', session.active_users);
        }
      }
    } catch (error) {
      console.error('Error syncing user count:', error);
    }
  },

  // Subscribe to battle session changes
  subscribeToSession(
    callback: (session: BattleSession) => void, 
    sessionId: string = DEFAULT_BATTLE_SESSION_ID
  ): (() => void) {
    console.log(`Setting up realtime subscription to battle session: ${sessionId}`);
    
    // Use a consistent channel name instead of random
    const channelName = `battle_changes_${sessionId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battle_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Battle session updated:', payload);
          if (payload.new) {
            callback(payload.new as BattleSession);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      console.log(`Unsubscribing from battle session changes: ${sessionId}`);
      supabase.removeChannel(channel);
    };
  },

  // Add a method to clean up stale connections
  async cleanupStaleConnections(): Promise<void> {
    try {
      console.log('Cleaning up stale connections...');
      
      // First get the current session
      const { data: session, error: fetchError } = await supabase
        .from('battle_sessions')
        .select('*')
        .eq('id', DEFAULT_BATTLE_SESSION_ID)
        .single();
      
      if (fetchError) {
        console.error('Error fetching session for cleanup:', fetchError.message);
        return;
      }
      
      if (session) {
        // Get current timestamp
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000); // 5 minutes ago
        
        // Check if we need to remove the last_left user
        if (session.last_left && session.last_left_at) {
          const leftAt = new Date(session.last_left_at);
          // If they left recently, remove them from the connected list
          
          const connectedEmails = Array.isArray(session.connected_emails) 
            ? session.connected_emails 
            : [];
            
          // Remove the user who left
          if (session.last_left && connectedEmails.includes(session.last_left)) {
            console.log('Removing user who explicitly left:', session.last_left);
            const updatedEmails = connectedEmails.filter((email: string) => email !== session.last_left);
            
            // Update session with new emails list and count
            await supabase
              .from('battle_sessions')
              .update({
                connected_emails: updatedEmails,
                active_users: updatedEmails.length,
                last_left: null,
                last_left_at: null
              })
              .eq('id', DEFAULT_BATTLE_SESSION_ID);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up stale connections:', error);
    }
  }
}; 