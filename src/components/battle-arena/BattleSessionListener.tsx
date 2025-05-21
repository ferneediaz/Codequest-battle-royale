import { useEffect } from 'react';
import { battleService } from '../../services/battleService';
import { BattleSession } from '../../lib/supabase-types';
import { BattleCategory } from '../../constants/battleConstants';
import { supabase } from '../../lib/supabase';

interface BattleSessionListenerProps {
  userEmail: string | undefined;
  sessionId?: string | null;
  setConnectedUsers: (users: string[]) => void;
  setPlayerCount: (count: number) => void;
  setReadyUsers: (users: string[]) => void;
  setSelectedTopics?: (topics: BattleCategory[]) => void;
  setTopicSelections?: (selections: Record<string, BattleCategory[]>) => void;
}

const BattleSessionListener: React.FC<BattleSessionListenerProps> = ({
  userEmail,
  sessionId = 'default-battle-session',
  setConnectedUsers,
  setPlayerCount,
  setReadyUsers,
  setSelectedTopics,
  setTopicSelections
}) => {
  useEffect(() => {
    if (!userEmail) return;
    
    console.log(`🔄 Battle session listener: setting up subscription for ${sessionId}`);
    
    // Subscribe to battle session changes
    const unsubscribe = battleService.subscribeToSession((session: BattleSession) => {
      console.log('🔄 Battle session update received:', session);
      
      // Update connected users
      if (session.connected_emails) {
        const emails = Array.isArray(session.connected_emails) 
          ? session.connected_emails 
          : [];
          
        console.log('🔄 Updating connected users:', emails);
        setConnectedUsers(emails);
        setPlayerCount(emails.length);
      }
      
      // Update topic selections FIRST so we can validate ready users against them
      if (setTopicSelections && session.topic_selections) {
        console.log('🔄 Updating topic selections:', session.topic_selections);
        setTopicSelections(session.topic_selections as Record<string, BattleCategory[]>);
      }
      
      // CRITICAL: Extremely strict validation of ready users
      // Users are ONLY ready if:
      // 1. They are in the ready_users array
      // 2. They have topic selections with exactly 2 topics
      // 3. They are still connected
      if (session.ready_users) {
        // Get the list of users marked as ready
        const readyList = Array.isArray(session.ready_users) 
          ? session.ready_users 
          : [];
        
        // Get the list of currently connected users
        const connectedEmails = Array.isArray(session.connected_emails) 
          ? session.connected_emails 
          : [];
        
        // Get the topic selections
        const topicSelections = session.topic_selections || {};
        
        console.log('🔄 Battle session update:', sessionId);
        console.log('🔄 Connected users:', connectedEmails);
        console.log('🔄 Raw ready users list:', readyList);
        console.log('🔄 Topic selections:', topicSelections);
        
        // A user is only truly ready if:
        // 1. They are in the ready_users list AND
        // 2. They are still connected
        // Relaxing the topic selection requirement to be more lenient
        const validReadyUsers = readyList.filter(email => 
          connectedEmails.includes(email)  // Still connected
        );
        
        console.log('🔄 Validated ready users:', validReadyUsers);
        
        // Log users who failed validation
        const invalidReadyUsers = readyList.filter(email => !validReadyUsers.includes(email));
        if (invalidReadyUsers.length > 0) {
          console.log('🔄 Users failed ready validation:', invalidReadyUsers);
        }
        
        // Update local state with validated ready users
        setReadyUsers(validReadyUsers);
        
        // Find users who are connected but not ready
        const notReadyUsers = connectedEmails.filter(email => !validReadyUsers.includes(email));
        if (notReadyUsers.length > 0) {
          console.log('🔄 Connected users who are not ready:', notReadyUsers);
        } else if (validReadyUsers.length > 0) {
          console.log('🔄 All connected users are ready!');
        }
        
        // Only perform database corrections if truly needed
        const needsDatabaseCorrection = readyList.some(email => !validReadyUsers.includes(email));
        
        // If any users are incorrectly marked as ready, fix the database
        if (needsDatabaseCorrection) {
          console.warn('⚠️ Correcting invalid ready status in database');
          
          // Immediately remove these users from the ready_users list in the database
          (async () => {
            try {
              // Update ready_users list in database, removing incorrect entries
              await supabase
                .from('battle_sessions')
                .update({ 
                  ready_users: validReadyUsers,
                  updated_at: new Date().toISOString()
                })
                .eq('id', sessionId);
                
              console.log('✅ Fixed incorrect ready status in database');
            } catch (error) {
              console.error('❌ Error fixing ready status:', error);
            }
          })();
        }
      }
      
      // Update selected topics if needed, but be very cautious about overriding user selections
      if (setSelectedTopics && session.selected_topics) {
        const topics = Array.isArray(session.selected_topics) 
          ? session.selected_topics as BattleCategory[] 
          : [];
          
        if (topics.length > 0) {
          console.log('🔄 Database has selected_topics:', topics);
          // IMPORTANT: Don't override user's explicit selections from topic_selections
          // Only use selected_topics as a fallback
          const hasMadeExplicitSelection = userEmail && 
                                          session.topic_selections && 
                                          session.topic_selections[userEmail] &&
                                          Array.isArray(session.topic_selections[userEmail]) &&
                                          session.topic_selections[userEmail].length === 2;
          
          if (!hasMadeExplicitSelection) {
            console.log('🔄 Using default selected_topics as user has no explicit selections');
            setSelectedTopics(topics);
          } else {
            console.log('🔄 Keeping user\'s explicit topic selections instead of default');
          }
        }
      }
      
      // Process user's explicit topic selections with highest priority
      if (setSelectedTopics && userEmail && session.topic_selections && session.topic_selections[userEmail]) {
        // Get the user's topic selections from the database
        const userTopics = session.topic_selections[userEmail] as BattleCategory[];
        if (Array.isArray(userTopics) && userTopics.length === 2) {
          console.log('🔄 Setting topics to user\'s explicit selections from database:', userTopics);
          // Apply the user's selections to local state
          setSelectedTopics(userTopics);
        }
      }
    }, sessionId);
    
    // Clean up subscription on unmount
    return () => {
      console.log(`🔄 Battle session listener: cleaning up subscription for ${sessionId}`);
      unsubscribe();
    };
  }, [userEmail, sessionId, setConnectedUsers, setPlayerCount, setReadyUsers, setSelectedTopics, setTopicSelections]);
  
  // Add an additional effect to clean up stale users
  useEffect(() => {
    if (!userEmail) return;
    
    // Function to check for and remove stale users
    const checkStaleUsers = async () => {
      try {
        // Get current session data
        const { data: session, error } = await supabase
          .from('battle_sessions')
          .select('connected_emails, updated_at')
          .eq('id', sessionId)
          .single();
          
        if (error) {
          console.error(`Error fetching session ${sessionId} for stale check:`, error);
          return;
        }
        
        if (session) {
          const emails = Array.isArray(session.connected_emails) 
            ? session.connected_emails 
            : [];
            
          // If we're not in the list but should be, add ourselves
          if (!emails.includes(userEmail)) {
            console.log('Re-adding ourselves to connected users list');
            const updatedEmails = [...emails, userEmail];
            
            try {
              await supabase
                .from('battle_sessions')
                .update({ 
                  connected_emails: updatedEmails,
                  active_users: updatedEmails.length,
                  updated_at: new Date().toISOString()
                })
                .eq('id', sessionId);
                
              console.log('Successfully re-added to user list');
            } catch (err) {
              console.error('Error re-adding to connected users:', err);
            }
          }
          
          // Check last update timestamp
          const now = new Date();
          const lastUpdate = session.updated_at 
            ? new Date(session.updated_at) 
            : now;
          
          // Calculate time difference in seconds
          const timeDiff = (now.getTime() - lastUpdate.getTime()) / 1000;
          
          // If last activity was more than 60 seconds ago
          // We need to refresh our data from the server
          if (timeDiff > 60) {
            console.log('Session inactive for over 60 seconds, refreshing data');
            
            // Refresh battle session data
            try {
              await battleService.syncUserCount(sessionId);
              console.log('Refreshed session data');
            } catch (err) {
              console.error('Error refreshing session data:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error in stale user check:', err);
      }
    };
    
    // Run the check initially
    checkStaleUsers();
    
    // Set up interval to check for stale users
    const intervalId = setInterval(checkStaleUsers, 15000); // Every 15 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [userEmail, sessionId]);
  
  // Add an additional effect specifically for ready state reconciliation
  useEffect(() => {
    if (!userEmail || !sessionId) return;
    
    // Function to check and reconcile ready state
    const syncReadyState = async () => {
      console.log(`🔄 Reconciling ready state for session ${sessionId}`);
      
      try {
        // Get current session data
        const { data: session, error } = await supabase
          .from('battle_sessions')
          .select('ready_users, connected_emails, topic_selections')
          .eq('id', sessionId)
          .single();
          
        if (error) {
          console.error('Error fetching session for ready state reconciliation:', error);
          return;
        }
        
        if (session) {
          // Get current values
          const readyList = Array.isArray(session.ready_users) ? session.ready_users : [];
          const connectedEmails = Array.isArray(session.connected_emails) ? session.connected_emails : [];
          
          // Verify that user is properly represented in both lists
          const isConnected = connectedEmails.includes(userEmail);
          
          // If we're supposed to be connected but aren't
          if (!isConnected && userEmail) {
            console.log('🛠️ Correcting connection status - adding user to connected_emails');
            
            try {
              const updatedConnectedEmails = [...connectedEmails, userEmail];
              await supabase
                .from('battle_sessions')
                .update({ 
                  connected_emails: updatedConnectedEmails,
                  active_users: updatedConnectedEmails.length,
                  updated_at: new Date().toISOString()
                })
                .eq('id', sessionId);
            } catch (err) {
              console.error('Error updating connection status:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error in ready state reconciliation:', err);
      }
    };
    
    // Initial sync
    syncReadyState();
    
    // Set up interval for periodic checks
    const intervalId = setInterval(syncReadyState, 5000); // Every 5 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [userEmail, sessionId, setReadyUsers]);
  
  // This component doesn't render anything
  return null;
};

export default BattleSessionListener; 