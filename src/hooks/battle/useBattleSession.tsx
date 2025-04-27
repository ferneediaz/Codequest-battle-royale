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
  const initializeSession = async () => {
    setIsJoining(true);
    setDebugMsg('Connecting to battle arena...');

    try {
      // First check if we have a valid session
      if (sessionId) {
        console.log('Session already exists:', sessionId);
        setIsJoining(false);
        return;
      }

      // Try to join the battle
      if (user?.email) {
        try {
          console.log('Connecting user:', user.email);
          
          // Join battle using the battle service
          const session = await battleService.joinBattle(user.email);
          
          if (session) {
            console.log('Successfully connected:', session);
            const connectedEmails = session.connected_emails || [];
            setSessionId('default-battle-session');
            setConnectedUsers(connectedEmails);
            setPlayerCount(connectedEmails.length);
            setSetupStatus('verified');
            
            setDebugMsg(connectedEmails.length > 1 ? 
              `Connected with ${connectedEmails.length} warriors!` : 
              'Connected! Waiting for other warriors...');
              
            return session;
          } else {
            setDebugMsg('Error connecting to battle. Try again.');
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
        console.log('Sending heartbeat...');
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
            console.error('Error fetching session for heartbeat:', error);
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
    if (!user?.email) return;
    
    setDebugMsg('Leaving battle arena...');
    try {
      // Get current session data
      const { data: session } = await supabase
        .from('battle_sessions')
        .select('connected_emails')
        .eq('id', 'default-battle-session')
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
          .eq('id', 'default-battle-session');
          
        console.log('Successfully removed user from session');
      } else {
        console.log('Session not found when trying to leave');
      }
      
      // For backward compatibility, also call the battleService methods
      await battleService.leaveBattle(user.email);
      await battleService.syncUserCount();
      console.log('Successfully left battle');
      
      return true;
    } catch (e) {
      console.error('Error leaving battle:', e);
      return false;
    }
  };
  
  // Change battle state
  const changeBattleState = async (newState: BattleState) => {
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
        .eq('id', 'default-battle-session');
        
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