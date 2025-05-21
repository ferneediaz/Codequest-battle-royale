import { useState, useEffect, useRef } from 'react';
import { battleService } from '../../services/battleService';
import { supabase } from '../../lib/supabase';
import { BattleState } from '../../constants/battleConstants';

/**
 * Custom hook to manage battle session state and user connections
 */
export const useBattleSession = (user: any) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [setupStatus, setSetupStatus] = useState<'unknown' | 'verified' | 'error'>('unknown');
  const [isJoining, setIsJoining] = useState(false);
  const [debugMsg, setDebugMsg] = useState('');
  const [battleState, setBattleState] = useState<BattleState>('topic_selection');
  
  const lastHeartbeatRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  
  // Initialize the battle session
  const initializeSession = async (customSessionId?: string) => {
    setIsJoining(true);
    setDebugMsg('Connecting to battle arena...');
    
    // Set the session ID, either custom or default
    const activeSessionId = customSessionId || 'default-battle-session';
    setSessionId(activeSessionId);

    try {
      // First check if we have a valid session
      if (sessionId === activeSessionId) {
        console.log('Session already exists:', sessionId);
        setIsJoining(false);
        return;
      }

      // Try to join the battle
      if (user?.email) {
        try {
          console.log('Connecting user:', user.email);
          
          // Check if the session exists
          const { data: existingSession, error: fetchError } = await supabase
            .from('battle_sessions')
            .select('*')
            .eq('id', activeSessionId)
            .single();
            
          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking for session:', fetchError.message);
            setDebugMsg(`Error connecting: ${fetchError.message}`);
            setIsJoining(false);
            return null;
          }
          
          if (existingSession) {
            console.log('Found existing session:', existingSession);
            // Update the existing session to add this user
            
            // Get the current list of emails, ensuring it's not null
            let connectedEmails = Array.isArray(existingSession.connected_emails) 
              ? existingSession.connected_emails 
              : [];

            // Remove any stale entries of this user
            connectedEmails = connectedEmails.filter((email: string) => email !== user.email);

            // Add the new user email
            connectedEmails.push(user.email);
            console.log('Updated connected users:', connectedEmails);
            
            // Update ready users - remove this user from ready list when joining
            let readyUsers = Array.isArray(existingSession.ready_users) 
              ? [...existingSession.ready_users]
              : [];
              
            // Remove the joining user from ready_users
            readyUsers = readyUsers.filter((email: string) => email !== user.email);
            
            const { data: updatedSession, error: updateError } = await supabase
              .from('battle_sessions')
              .update({ 
                active_users: connectedEmails.length,
                connected_emails: connectedEmails,
                ready_users: readyUsers,
                updated_at: new Date().toISOString()
              })
              .eq('id', activeSessionId)
              .select()
              .single();
            
            if (updateError) {
              console.error('Error updating session:', updateError.message);
              setDebugMsg(`Error connecting: ${updateError.message}`);
              setIsJoining(false);
              return null;
            }
            
            if (updatedSession) {
              setBattleState(updatedSession.battle_state as BattleState || 'topic_selection');
              setConnectedUsers(connectedEmails);
              setPlayerCount(connectedEmails.length);
              setSetupStatus('verified');
              
              setDebugMsg(connectedEmails.length > 1 ? 
                `Connected with ${connectedEmails.length} warriors!` : 
                'Connected! Waiting for other warriors...');
                
              setIsJoining(false);
              return updatedSession;
            }
          } else {
            // Create a new session
            console.log('Creating new session with ID:', activeSessionId);
            const initialEmails = [user.email];
            
            const { data: newSession, error: insertError } = await supabase
              .from('battle_sessions')
              .insert({
                id: activeSessionId,
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
              setDebugMsg(`Error creating room: ${insertError.message}`);
              setIsJoining(false);
              return null;
            }
            
            if (newSession) {
              console.log('Created new session:', newSession);
              setConnectedUsers(initialEmails);
              setPlayerCount(1);
              setSetupStatus('verified');
              
              setDebugMsg('Room created! Waiting for warriors to join...');
              
              setIsJoining(false);
              return newSession;
            }
          }
        } catch (err: any) {
          console.error('Connection error:', err);
          setDebugMsg(`Connection error: ${err.message}`);
        } finally {
          setIsJoining(false);
        }
      } else {
        setDebugMsg('Cannot connect without user email. Please sign in.');
        setIsJoining(false);
      }
    } catch (error: any) {
      console.error('Battle initialization error:', error);
      setDebugMsg(`Error connecting: ${error.message}`);
      setIsJoining(false);
    }
    
    return null;
  };
  
  // Handle heartbeat for user presence
  useEffect(() => {
    if (!user?.email || !sessionId) return;
    
    // Function to send a heartbeat
    const sendHeartbeat = async () => {
      try {
        console.log(`Sending heartbeat for session ${sessionId}...`);
        lastHeartbeatRef.current = Date.now();
        
        // Try-catch each database operation to prevent chain failures
        try {
          // First, check if we're in the connected users list
          const { data: session, error } = await supabase
            .from('battle_sessions')
            .select('connected_emails, updated_at')
            .eq('id', sessionId)
            .single();
            
          if (error) {
            console.error(`Error fetching session ${sessionId} for heartbeat:`, error);
            return;
          }
          
          if (session) {
            try {
              // Get the connected emails
              const emails = Array.isArray(session.connected_emails) 
                ? session.connected_emails 
                : [];
                
              // If we're not in the list but should be, add ourselves
              if (!emails.includes(user.email)) {
                // We need to re-add ourselves to the connected users
                const updatedEmails = [...emails, user.email];
                const { error: connectError } = await supabase
                  .from('battle_sessions')
                  .update({ 
                    connected_emails: updatedEmails,
                    active_users: updatedEmails.length,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sessionId);
                  
                if (connectError) {
                  console.error('Error re-adding user to session:', connectError);
                  return;
                }
                
                console.log('Successfully re-added to connected users list');
              } else {
                // We're already in the list, just update the timestamp to show we're active
                // This is a minimal update that doesn't try to use non-existent columns
                const { error: updateError } = await supabase
                  .from('battle_sessions')
                  .update({ 
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sessionId);
                  
                if (updateError) {
                  console.error('Error updating timestamp:', updateError);
                }
              }
            } catch (err) {
              console.error('Error in user presence update:', err);
            }
          }
        } catch (sessionErr) {
          console.error('Error in session fetch:', sessionErr);
        }
      } catch (outerError) {
        console.error('Unhandled error in heartbeat:', outerError);
      }
    };
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Set up interval to send heartbeats
    const intervalId = window.setInterval(sendHeartbeat, 5000); // Every 5 seconds
    heartbeatIntervalRef.current = intervalId as unknown as number;
    
    return () => {
      if (heartbeatIntervalRef.current) {
        window.clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [user?.email, sessionId]);
  
  // Handle leaving the session
  const leaveSession = async () => {
    if (!user?.email || !sessionId) return;
    
    setDebugMsg('Leaving battle arena...');
    try {
      // Get current session data
      const { data: session } = await supabase
        .from('battle_sessions')
        .select('connected_emails')
        .eq('id', sessionId)
        .single();
        
      if (session && session.connected_emails) {
        const emails = Array.isArray(session.connected_emails) 
          ? session.connected_emails 
          : [];
          
        // Remove current user
        const updatedEmails = emails.filter(email => email !== user.email);
        
        // Update session
        await supabase
          .from('battle_sessions')
          .update({ 
            connected_emails: updatedEmails,
            active_users: updatedEmails.length,
            updated_at: new Date().toISOString(),
            last_left: user.email,
            last_left_at: new Date().toISOString()
          })
          .eq('id', sessionId);
          
        console.log('Successfully removed user from session');
      } else {
        console.log('Session not found when trying to leave');
      }
      
      return true;
    } catch (e) {
      console.error('Error leaving battle:', e);
      return false;
    }
  };
  
  // Change battle state
  const changeBattleState = async (newState: BattleState) => {
    if (!sessionId) return false;
    
    try {
      // Update battle state in database
      const { error: updateError } = await supabase
        .from('battle_sessions')
        .update({ 
          battle_state: newState,
          updated_at: new Date().toISOString(),
          last_state_change: new Date().toISOString(),
          state_changed_by: user?.email
        })
        .eq('id', sessionId);
        
      if (updateError) {
        console.error('Error updating battle state:', updateError);
        setDebugMsg('Error changing battle state: ' + updateError.message);
        return false;
      }

      // Update local state
      setBattleState(newState);
      return true;
    } catch (err) {
      console.error('Error changing battle state:', err);
      setDebugMsg('Error changing battle state. Please try again.');
      return false;
    }
  };
  
  return {
    sessionId,
    connectedUsers,
    setConnectedUsers,
    playerCount,
    setPlayerCount,
    setupStatus,
    isJoining,
    debugMsg,
    setDebugMsg,
    battleState,
    setBattleState,
    hasInitializedRef,
    initializeSession,
    leaveSession,
    changeBattleState
  };
}; 