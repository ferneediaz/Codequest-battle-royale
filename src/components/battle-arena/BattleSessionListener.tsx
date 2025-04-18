import { useEffect } from 'react';
import { battleService } from '../../services/battleService';
import { BattleSession } from '../../lib/supabase-types';
import { BattleCategory } from '../../constants/battleConstants';

interface BattleSessionListenerProps {
  userEmail: string | undefined;
  setConnectedUsers: (users: string[]) => void;
  setPlayerCount: (count: number) => void;
  setReadyUsers: (users: string[]) => void;
  setSelectedTopics?: (topics: BattleCategory[]) => void;
}

const BattleSessionListener: React.FC<BattleSessionListenerProps> = ({
  userEmail,
  setConnectedUsers,
  setPlayerCount,
  setReadyUsers,
  setSelectedTopics
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
      
      // Update ready users
      if (session.ready_users) {
        const readyList = Array.isArray(session.ready_users) 
          ? session.ready_users 
          : [];
          
        console.log('🔄 Updating ready users:', readyList);
        setReadyUsers(readyList);
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
  }, [userEmail, setConnectedUsers, setPlayerCount, setReadyUsers, setSelectedTopics]);
  
  // This component doesn't render anything
  return null;
};

export default BattleSessionListener; 