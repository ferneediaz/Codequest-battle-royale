import { useEffect } from 'react';
import { battleService } from '../../services/battleService';
import { BattleSession } from '../../lib/supabase-types';
import { BattleCategory } from '../../constants/battleConstants';
import { supabase } from '../../lib/supabase';

interface BattleSessionListenerProps {
  userEmail: string | undefined;
  setConnectedUsers: (users: string[]) => void;
  setPlayerCount: (count: number) => void;
  setReadyUsers: (users: string[]) => void;
  setSelectedTopics?: (topics: BattleCategory[]) => void;
  setTopicSelections?: (selections: Record<string, BattleCategory[]>) => void;
}

const BattleSessionListener: React.FC<BattleSessionListenerProps> = ({
  userEmail,
  setConnectedUsers,
  setPlayerCount,
  setReadyUsers,
  setSelectedTopics,
  setTopicSelections
}) => {
  useEffect(() => {
    if (!userEmail) return;
    
    console.log('🔄 Battle session listener: setting up subscription');
    
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
        
        // A user is only truly ready if:
        // 1. They are in the ready_users list AND
        // 2. They are still connected AND
        // 3. They have selected exactly 2 topics
        const validReadyUsers = readyList.filter(email => 
          connectedEmails.includes(email) && // Still connected
          topicSelections[email] && // Has topic selections
          Array.isArray(topicSelections[email]) && // Topic selections is an array
          topicSelections[email].length === 2 // Has selected exactly 2 topics
        );
        
        console.log('🔄 Updating ready users with strict validation:', validReadyUsers);
        console.log('   Original ready users:', readyList);
        console.log('   Filtered out:', readyList.filter(email => !validReadyUsers.includes(email)));
        
        // Update local state with validated ready users
        setReadyUsers(validReadyUsers);
        
        // Find users who are ready without topic selections
        const incorrectlyReadyUsers = readyList.filter(email => 
          connectedEmails.includes(email) && 
          (!topicSelections[email] || 
           !Array.isArray(topicSelections[email]) || 
           topicSelections[email].length !== 2)
        );
        
        // If any users are incorrectly marked as ready, fix the database
        if (incorrectlyReadyUsers.length > 0) {
          console.warn('⚠️ CRITICAL: Users incorrectly marked as ready:', incorrectlyReadyUsers);
          
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
                .eq('id', 'default-battle-session');
                
              console.log('✅ Fixed incorrect ready status in database');
            } catch (error) {
              console.error('❌ Error fixing ready status:', error);
            }
          })();
        }
      }
      
      // Update selected topics if needed
      if (setSelectedTopics && session.selected_topics) {
        const topics = Array.isArray(session.selected_topics) 
          ? session.selected_topics as BattleCategory[] 
          : [];
          
        if (topics.length > 0) {
          console.log('🔄 Updating selected topics:', topics);
          setSelectedTopics(topics);
        }
      }
    });
    
    // Clean up subscription on unmount
    return () => {
      console.log('🔄 Battle session listener: cleaning up subscription');
      unsubscribe();
    };
  }, [userEmail, setConnectedUsers, setPlayerCount, setReadyUsers, setSelectedTopics, setTopicSelections]);
  
  // This component doesn't render anything
  return null;
};

export default BattleSessionListener; 