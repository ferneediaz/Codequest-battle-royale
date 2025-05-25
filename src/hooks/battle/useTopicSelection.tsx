import { useState, useEffect } from 'react';
import { BattleCategory, BattleState } from '../../constants/battleConstants';
import { supabase } from '../../lib/supabase';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook for managing battle topic selection and user readiness
 */
export const useTopicSelection = (user: any) => {
  // Add useLocation hook to get the current location
  const location = useLocation();
  
  // Topic selection state
  const [selectedTopics, setSelectedTopics] = useState<BattleCategory[]>([]);
  const [showTopicSelection, setShowTopicSelection] = useState<boolean>(true);
  const [isTopicSelectionComplete, setIsTopicSelectionComplete] = useState<boolean>(false);
  
  // Session state
  const [readyUsers, setReadyUsers] = useState<string[]>([]);
  const [topicSelections, setTopicSelections] = useState<Record<string, BattleCategory[]>>({});
  
  // Utility function to get room ID from location
  const getRoomIdFromLocation = () => {
    // Get the pathname from location (for HashRouter, this is the path after the #)
    const pathname = location.pathname;
    const pathParts = pathname.split('/');
    
    // Look for "battle" in the path and get the next segment
    const roomIndex = pathParts.findIndex(part => part === 'battle');
    const roomId = roomIndex >= 0 && roomIndex + 1 < pathParts.length ? 
        pathParts[roomIndex + 1] : null;
    
    console.log("Got room ID from location:", roomId);
    return roomId;
  };
  
  // Handle topic selection
  const handleTopicSelect = (topic: BattleCategory) => {
    setSelectedTopics(prev => {
      // If already selected, remove it
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic);
      }
      
      // If already have 2 selected, replace the oldest one
      if (prev.length >= 2) {
        return [prev[1], topic];
      }
      
      // Otherwise add it
      return [...prev, topic];
    });
    
    // Remove the automatic ready state setting when topics change
    // This ensures user must explicitly click the Ready button
    if (isTopicSelectionComplete) {
      setIsTopicSelectionComplete(false);
      
      // If user was previously marked as ready, remove them from ready list
      if (user?.email && readyUsers.includes(user.email)) {
        const updatedReadyUsers = readyUsers.filter(email => email !== user.email);
        setReadyUsers(updatedReadyUsers);
        
        // Use an async function to handle the database update
        const updateReadyUsers = async () => {
          try {
            // Get room ID from location
            const roomId = getRoomIdFromLocation();
            
            // Construct the session ID - might be a room ID or default session
            const sessionId = roomId ? `room_${roomId}` : 'default-battle-session';
            
            console.log("Using session ID for topic selection:", sessionId);
            
            const { data } = await supabase
              .from('battle_sessions')
              .select('ready_users')
              .eq('id', sessionId)
              .single();
              
            if (data?.ready_users) {
              const dbReadyUsers = Array.isArray(data.ready_users) ? [...data.ready_users] : [];
              const filteredUsers = dbReadyUsers.filter(email => email !== user.email);
              
              await supabase
                .from('battle_sessions')
                .update({ ready_users: filteredUsers })
                .eq('id', sessionId);
                
              console.log('Removed user from ready list after topic change');
            }
          } catch (err) {
            console.error('Failed to update ready status:', err);
          }
        };
        
        // Execute the update
        updateReadyUsers();
      }
      
      // Show the topic selection UI again
      setShowTopicSelection(true);
    }
  };
  
  // Mark user as ready with selected topics
  const completeTopicSelection = async (setDebugMsg: (msg: string) => void) => {
    if (selectedTopics.length !== 2 || !user?.email) return false;
    
    console.log("🚀 User clicked Ready for Battle button");
    
    // Mark the current user as ready (locally first)
    setIsTopicSelectionComplete(true);
    setDebugMsg(`Ready for battle with topics: ${selectedTopics.join(' & ')}`);
    
    try {
      // Get room ID from location
      const roomId = getRoomIdFromLocation();
      
      // Construct the session ID - might be a room ID or default session
      const sessionId = roomId ? `room_${roomId}` : 'default-battle-session';
      
      console.log("Using session ID for ready state:", sessionId);
      
      // Get current session data
      const { data: currentSession, error: fetchError } = await supabase
        .from('battle_sessions')
        .select('ready_users, topic_selections')
        .eq('id', sessionId)
        .single();

      if (fetchError) {
        console.error(`Error fetching session:`, fetchError);
        setDebugMsg('Error updating ready status');
        return false;
      }
      
      // Prepare the updated ready_users array
      let updatedReadyUsers: string[] = [];
      if (currentSession?.ready_users) {
        // Start with existing ready users
        updatedReadyUsers = Array.isArray(currentSession.ready_users) 
          ? [...currentSession.ready_users]
          : [];
          
        // Only add the current user if not already in the list
        if (user?.email && !updatedReadyUsers.includes(user.email)) {
          console.log(`Adding user ${user.email} to ready list`);
          updatedReadyUsers.push(user.email);
        }
      } else {
        // If no ready users exist yet, create a new array with just this user
        updatedReadyUsers = user.email ? [user.email] : [];
      }
      
      // Prepare updated topic selections
      const updatedTopicSelections = {
        ...(currentSession?.topic_selections || {}),
        [user.email]: selectedTopics
      };
      
      // Update local state
      setReadyUsers(updatedReadyUsers);
      setTopicSelections(updatedTopicSelections);
      setShowTopicSelection(false);
      
      // Run the update with our prepared arrays
      const { error: updateError } = await supabase
        .from('battle_sessions')
        .update({
          ready_users: updatedReadyUsers,
          topic_selections: updatedTopicSelections,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
          
      if (updateError) {
        console.error(`Error updating session:`, updateError);
        setDebugMsg('Error updating ready status');
        return false;
      }
      
      console.log('User marked as ready:', user.email);
      console.log('Current ready users:', updatedReadyUsers);
      return true;
    } catch (error) {
      console.error('Error setting up readiness:', error);
      setDebugMsg('Error setting up ready status');
      return false;
    }
  };
  
  // Handle changing topics
  const handleChangeTopics = async (setDebugMsg: (msg: string) => void) => {
    // Show topic selection again
    setShowTopicSelection(true);
    
    // IMPORTANT: Set user as not ready when they change topics
    setIsTopicSelectionComplete(false);
    
    // Also remove user from ready list in database
    if (user?.email) {
      try {
        // Get room ID from location
        const roomId = getRoomIdFromLocation();
        
        // Construct the session ID - might be a room ID or default session
        const sessionId = roomId ? `room_${roomId}` : 'default-battle-session';
        
        console.log("Using session ID for changing topics:", sessionId);
        
        // First get current ready users
        const { data: session } = await supabase
          .from('battle_sessions')
          .select('ready_users')
          .eq('id', sessionId)
          .single();
          
        if (session && session.ready_users) {
          // Remove current user from the list
          const updatedReadyUsers = Array.isArray(session.ready_users)
            ? session.ready_users.filter(email => email !== user.email)
            : [];
            
          // Update both local state and database
          setReadyUsers(updatedReadyUsers);
          
          // Update database
          await supabase
            .from('battle_sessions')
            .update({ 
              ready_users: updatedReadyUsers,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
            
          console.log('User marked as not ready after changing topics');
          console.log('Current ready users:', updatedReadyUsers);
        }
      } catch (err) {
        console.error('Error updating ready status:', err);
      }
    }
    
    setDebugMsg('Returned to topic selection');
  };
  
  // Handle entering battle room after topic selection
  const handleEnterBattleRoom = async (setDebugMsg: (msg: string) => void, onBattleStateChange: (state: string | BattleState) => void) => {
    try {
      setDebugMsg('Transitioning to battle room...');
      
      // Get room ID from location
      const roomId = getRoomIdFromLocation();
      
      // Construct the session ID - might be a room ID or default session
      const sessionId = roomId ? `room_${roomId}` : 'default-battle-session';
      
      console.log("Using session ID for entering battle room:", sessionId);
      
      // Get current session state first
      const { data: currentSession } = await supabase
        .from('battle_sessions')
        .select('ready_users, connected_emails, topic_selections')
        .eq('id', sessionId)
        .single();

      if (!currentSession) {
        setDebugMsg('Error: Could not find battle session');
        return false;
      }

      const connectedEmails = Array.isArray(currentSession.connected_emails) 
        ? currentSession.connected_emails 
        : [];
      const readyUsers = Array.isArray(currentSession.ready_users) 
        ? currentSession.ready_users 
        : [];
        
      console.log("Connected emails:", connectedEmails);
      console.log("Ready users:", readyUsers);

      // Better validation logic - handle multiple scenarios
      if (connectedEmails.length < 2) {
        setDebugMsg('Error: Need at least 2 players to start');
        return false;
      }
      
      // Check if all connected users are ready
      const notReadyUsers = connectedEmails.filter(email => !readyUsers.includes(email));
      if (notReadyUsers.length > 0) {
        console.log("Users not ready:", notReadyUsers);
        setDebugMsg(`Error: Not all users are ready (${notReadyUsers.join(', ')})`);
        return false;
      }
      
      // Special case - mark users ready if local state is out of sync
      if (readyUsers.length >= connectedEmails.length) {
        console.log("All users appear to be ready in database");
      }

      // IMPORTANT: Ensure we're using the correct topic selections before transitioning
      if (user?.email && currentSession.topic_selections && currentSession.topic_selections[user.email]) {
        const userTopicSelections = currentSession.topic_selections[user.email];
        console.log("Using user's topics from database:", userTopicSelections);
        
        // Only update if needed
        if (JSON.stringify(userTopicSelections) !== JSON.stringify(selectedTopics)) {
          console.log("Updating local topic selections to match database");
          setSelectedTopics(userTopicSelections);
        }
      }

      // Update battle state in database
      const { error: updateError } = await supabase
        .from('battle_sessions')
        .update({ 
          battle_state: 'battle_room',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
        
      if (updateError) {
        console.error(`Error updating battle state:`, updateError);
        setDebugMsg('Error transitioning to battle');
        return false;
      }
      
      // Update local battle state
      onBattleStateChange('battle_room');
      
      // Hide topic selection UI
      setShowTopicSelection(false);
      
      return true;
    } catch (error) {
      console.error('Error transitioning to battle:', error);
      setDebugMsg('Error transitioning to battle room');
      return false;
    }
  };
  
  // Return state and functions
  return {
    selectedTopics,
    setSelectedTopics,
    showTopicSelection,
    setShowTopicSelection,
    isTopicSelectionComplete, 
    setIsTopicSelectionComplete,
    topicSelections,
    setTopicSelections,
    readyUsers,
    setReadyUsers,
    handleTopicSelect,
    completeTopicSelection,
    handleChangeTopics,
    handleEnterBattleRoom
  };
}; 