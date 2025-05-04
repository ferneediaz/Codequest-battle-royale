import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { BattleState } from '../../constants/battleConstants';
import { CodeProblem } from '../../services/problemService';

interface UseCharacterCountTrackerProps {
  userEmail: string | undefined;
  sessionId: string | null;
  battleState: BattleState;
  currentProblem: CodeProblem | null;
  userCode: string;
  selectedLanguage: string;
}

interface CharacterCountTracker {
  // Key is user email, value is their character count for current problem
  userCharCounts: Record<string, number>;
  broadcastCharCount: (count: number, problemId: string) => void;
}

export const useCharacterCountTracker = ({
  userEmail,
  sessionId,
  battleState,
  currentProblem,
  userCode,
  selectedLanguage
}: UseCharacterCountTrackerProps): CharacterCountTracker => {
  // Track char counts for all users (key: email, value: count)
  const [userCharCounts, setUserCharCounts] = useState<Record<string, number>>({});
  
  // Store the current problem ID to detect changes
  const [currentProblemId, setCurrentProblemId] = useState<string | null>(null);
  
  // Store the starter code for the current problem
  const [starterCodeLength, setStarterCodeLength] = useState<number>(0);
  
  // Use a ref for throttling broadcasts
  const lastBroadcastTimeRef = useRef<number>(0);
  
  // Reset character count and update starter code length when the problem changes
  useEffect(() => {
    if (currentProblem?.id !== currentProblemId) {
      setCurrentProblemId(currentProblem?.id || null);
      
      // Get the starter code length for this problem and language
      if (currentProblem?.starterCode) {
        // Only access if the language is available in starterCode
        const starterCode = currentProblem.starterCode[selectedLanguage as keyof typeof currentProblem.starterCode];
        if (starterCode) {
          setStarterCodeLength(starterCode.length);
        } else {
          setStarterCodeLength(0);
        }
      } else {
        setStarterCodeLength(0);
      }
      
      // Reset current user's character count for the new problem
      if (userEmail) {
        setUserCharCounts(prev => ({
          ...prev,
          [userEmail]: 0
        }));
        
        // Broadcast the reset if we have a valid problem
        if (currentProblem?.id) {
          broadcastCharCount(0, currentProblem.id);
        }
      }
    }
  }, [currentProblem?.id, currentProblemId, userEmail, selectedLanguage]);
  
  // Track and broadcast character count for current user only
  useEffect(() => {
    if (userEmail && currentProblem?.id && battleState === 'battle_room') {
      // Calculate character count by subtracting starter code length
      // If user has deleted some starter code, we don't want to show negative count
      const charCount = Math.max(0, userCode.length - starterCodeLength);
      
      // Update local state for current user only
      setUserCharCounts(prev => ({
        ...prev,
        [userEmail]: charCount
      }));
      
      // Only broadcast if enough time has passed (throttle)
      const now = Date.now();
      if (now - lastBroadcastTimeRef.current >= 500) {
        lastBroadcastTimeRef.current = now;
        broadcastCharCount(charCount, currentProblem.id);
      }
    }
  }, [userCode, userEmail, currentProblem?.id, battleState, starterCodeLength]);
  
  // Set up listener for character count broadcasts from other users
  useEffect(() => {
    if (!sessionId || battleState !== 'battle_room') return;
    
    console.log('Setting up character count listener');
    
    const charCountChannel = supabase.channel('battle_char_counts', {
      config: {
        broadcast: { self: false } // Don't receive own broadcasts
      }
    });
    
    charCountChannel
      .on('broadcast', { event: 'char_count_update' }, (payload) => {
        const { user_email, char_count, problem_id } = payload.payload;
        
        // Only process updates from real users, not simulated ones
        if (user_email) {
          console.log(`Received char count update: ${user_email} -> ${char_count} chars for problem ${problem_id}`);
          
          // Only update if this is for the current problem
          if (problem_id === currentProblem?.id) {
            setUserCharCounts(prev => ({
              ...prev,
              [user_email]: char_count
            }));
          }
        }
      })
      .subscribe((status) => {
        console.log('Character count channel status:', status);
      });
      
    return () => {
      console.log('Unsubscribing from character count channel');
      charCountChannel.unsubscribe();
    };
  }, [sessionId, battleState, currentProblem?.id]);
  
  // Function to broadcast character count
  const broadcastCharCount = useCallback((count: number, problemId: string) => {
    if (!userEmail || !sessionId || battleState !== 'battle_room') return;
    
    const charCountChannel = supabase.channel('battle_char_counts', {
      config: {
        broadcast: { self: true }
      }
    });
    
    charCountChannel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      
      await charCountChannel.send({
        type: 'broadcast',
        event: 'char_count_update',
        payload: {
          user_email: userEmail,
          char_count: count,
          problem_id: problemId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Unsubscribe after sending
      setTimeout(() => {
        charCountChannel.unsubscribe();
      }, 100);
    });
  }, [userEmail, sessionId, battleState]);
  
  return {
    userCharCounts,
    broadcastCharCount
  };
}; 