/// <reference path="../types/codemirror.d.ts" />
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { useAuth } from '../contexts/AuthContext';
import { battleService } from '../services/battleService';
import { BattleSession } from '../lib/supabase-types';
import { supabase } from '../lib/supabase';
import { setupBattleSessionsTable, checkTableExists } from '../lib/setupDatabase';
import { submissionService } from '../services/submissionService';
import { problemService, CodeProblem } from '../services/problemService';
import FloatingCodeBackground from '../components/FloatingCodeBackground';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Import extracted components
import DraggableSkill from '../components/battle-arena/DraggableSkill';
import DroppablePlayer from '../components/battle-arena/DroppablePlayer';
import CodeEditor from '../components/battle-arena/CodeEditor';
import BattleProblemDisplay from '../components/battle-arena/ProblemDisplay';
import ProblemList from '../components/battle-arena/ProblemList';
import PlayersBar from '../components/battle-arena/PlayersBar';
import Scoreboard from '../components/battle-arena/Scoreboard';
import TopicSelection from '../components/battle-arena/TopicSelection';
import BattleSessionListener from '../components/battle-arena/BattleSessionListener';

// Import custom hooks
import { useSkillEffects } from '../hooks/battle/useSkillEffects';
import { useBattleTimer } from '../hooks/battle/useBattleTimer';
import { useQuestionLoader } from '../hooks/battle/useQuestionLoader';

// Import constants
import { 
  BATTLE_CATEGORIES,
  CATEGORY_EMOJIS,
  BattleCategory, 
  BattleState, 
  SetupStatus
} from '../constants/battleConstants';

// Import utility functions
import { getAvatarUrl } from '../utils/battleUtils';

// Extend window interface for global access
declare global {
  interface Window {
    battleReadinessChannel: any;
  }
}

// Main component
const BattleArena: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [playerCount, setPlayerCount] = useState(0);
  const [isJoining, setIsJoining] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>('unknown');
  const [isTabVisible, setIsTabVisible] = useState(true);
  
  // Add player scores state
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  
  // Topic selection state
  const [selectedTopics, setSelectedTopics] = useState<BattleCategory[]>([]);
  const [showTopicSelection, setShowTopicSelection] = useState(true);
  const [isTopicSelectionComplete, setIsTopicSelectionComplete] = useState(false);
  
  // Add user readiness tracking
  const [readyUsers, setReadyUsers] = useState<string[]>([]);
  const [battleState, setBattleState] = useState<BattleState>('topic_selection');
  
  // Add state for selected language
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [userCode, setUserCode] = useState<string>('// Write your solution here');
  
  // Track initialization to prevent re-initializing when tab regains focus
  const hasInitializedRef = useRef(false);
  
  // Use custom hooks
  const {
    editorFrozen,
    setEditorFrozen,
    editorFrozenEndTime,
    setEditorFrozenEndTime,
    availableSkills,
    setAvailableSkills,
    debugMsg,
    setDebugMsg,
    useSkill,
    handleFreezeEffect,
    handleChaosEffect
  } = useSkillEffects({
    userEmail: user?.email,
    sessionId,
    battleState
  });
  
  // Track last heartbeat time
  const lastHeartbeatRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<number | null>(null);
  
  const {
    timeRemaining,
    startTimer,
    stopTimer,
    resetTimer
  } = useBattleTimer({ initialSeconds: 300 });
  
  const {
    availableQuestions,
    currentQuestion,
    isQuestionSelected,
    activeTopicFilter,
    loadQuestionsForSelectedTopics,
    loadRandomProblemForBattle,
    selectQuestion,
    getFilteredQuestions,
    setActiveTopicFilter,
    setIsQuestionSelected,
    backToQuestionList
  } = useQuestionLoader();

  // Check if database exists and set it up if needed
  useEffect(() => {
    // Only run initialization once, regardless of sessionId
    if (user && !loading && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      handleInitialization();
    }
  }, [user, loading]);

  const handleInitialization = async () => {
    setIsJoining(true);
    setDebugMsg('Connecting to battle arena...');

    try {
      // First check if we have a valid session
      if (sessionId) {
        console.log('Session already exists:', sessionId);
        setIsJoining(false);
        return;
      }

      // Skip database setup and directly connect to the session
      if (user?.email) {
        try {
          console.log('Directly connecting user:', user.email);
          
          // First check if session exists
          const { data: session, error: sessionError } = await supabase
            .from('battle_sessions')
            .select('*')
            .eq('id', 'default-battle-session')
            .single();
          
          if (sessionError) {
            console.log('Error fetching session:', sessionError);
            setDebugMsg('Error connecting to battle. Try again.');
            setIsJoining(false);
            return;
          }
          
          if (session) {
            console.log('Found existing session:', session);
            
            // Get current emails
            const emails = Array.isArray(session.connected_emails) 
              ? session.connected_emails 
              : [];
              
            // Add current user if not already in list
            if (!emails.includes(user.email)) {
              emails.push(user.email);
            }
            
            // Update session
            const { data: updatedSession, error } = await supabase
              .from('battle_sessions')
              .update({ 
                connected_emails: emails,
                active_users: emails.length,
                updated_at: new Date().toISOString()
              })
              .eq('id', 'default-battle-session')
              .select('*')
              .single();
              
            if (error) {
              console.error('Error updating session:', error);
              setDebugMsg(`Error connecting: ${error.message}`);
              setIsJoining(false);
            } else {
              console.log('Successfully connected:', updatedSession);
              setSessionId('default-battle-session');
              setConnectedUsers(emails);
              setPlayerCount(emails.length);
              setSetupStatus('verified');
              setDebugMsg(emails.length > 1 ? 
                `Connected with ${emails.length} warriors!` : 
                'Connected! Waiting for other warriors...');
              setIsJoining(false);
            }
          } else {
            // Create new session if it doesn't exist (unlikely)
            const { data: newSession, error } = await supabase
              .from('battle_sessions')
              .insert({
                id: 'default-battle-session',
                active_users: 1,
                connected_emails: [user.email],
                updated_at: new Date().toISOString()
              })
              .select('*')
              .single();
              
            if (error) {
              console.error('Error creating session:', error);
              setDebugMsg(`Error connecting: ${error.message}`);
              setIsJoining(false);
            } else {
              console.log('Created new session:', newSession);
              setSessionId('default-battle-session');
              setConnectedUsers([user.email]);
              setPlayerCount(1);
              setSetupStatus('verified');
              setDebugMsg('Connected! Waiting for other warriors...');
              setIsJoining(false);
            }
          }
        } catch (err: any) {
          console.error('Connection error:', err);
          setDebugMsg(`Connection error: ${err.message}`);
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
  };

  // Add a topic selection handler
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
  };

  // Add a handler for topic selection completion using presence
  const completeTopicSelection = async () => {
    if (selectedTopics.length !== 2) return;
    
    setIsTopicSelectionComplete(true);
    setDebugMsg(`Ready for battle with topics: ${selectedTopics.join(' & ')}`);
    
    try {
      // Create/get a shared presence channel for readiness
      const readinessChannel = supabase.channel('battle_readiness', {
        config: {
          presence: {
            key: user?.email || 'anonymous',
          },
        }
      });
      
      // Listen for presence events
      readinessChannel
        .on('presence', { event: 'sync' }, () => {
          const state = readinessChannel.presenceState();
          console.log('Realtime presence sync:', state);
          
          // Collect ready users from presence state
          const readyPresenceUsers = Object.keys(state);
          setReadyUsers(readyPresenceUsers);
          
          console.log('Ready users from presence:', readyPresenceUsers);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences);
          
          // Update UI when a new user joins
          setReadyUsers(prev => {
            if (!prev.includes(key)) {
              return [...prev, key];
            }
            return prev;
          });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences);
          
          // Update UI when a user leaves
          setReadyUsers(prev => prev.filter(email => email !== key));
        });
      
      // Subscribe to presence channel and track user as ready
      readinessChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Readiness channel subscribed, tracking presence');
          
          // Track this user's presence with selected topics
          const presenceData = {
            email: user?.email,
            topics: selectedTopics,
            ready: true,
            timestamp: new Date().toISOString()
          };
          
          await readinessChannel.track(presenceData);
          console.log('Tracked presence:', presenceData);
          
          // Also update the database to ensure persistence
          const { data } = await supabase
            .from('battle_sessions')
            .select('ready_users, topic_selections')
            .eq('id', 'default-battle-session')
            .single();
            
          if (data) {
            // Update ready users list
            const currentReadyUsers = Array.isArray(data?.ready_users) ? data.ready_users : [];
            if (user?.email && !currentReadyUsers.includes(user.email)) {
              currentReadyUsers.push(user.email);
            }
            
            // Update topic selections
            const currentTopicSelections = data?.topic_selections || {};
            if (user?.email) {
              currentTopicSelections[user.email] = selectedTopics;
            }
            
            // Update the database
            await supabase
              .from('battle_sessions')
              .update({
                ready_users: currentReadyUsers,
                topic_selections: currentTopicSelections,
                selected_topics: selectedTopics,
                updated_at: new Date().toISOString()
              })
              .eq('id', 'default-battle-session');
              
            // Immediately update local state
            setReadyUsers(currentReadyUsers);
            setShowTopicSelection(false);
          }
        }
      });
      
      // Store channel reference for cleanup
      window.battleReadinessChannel = readinessChannel;
      
    } catch (error) {
      console.error('Error setting up readiness:', error);
      setDebugMsg('Error setting up ready status');
    }
  };

  // Handle the submission of a solution
  const handleSubmitSolution = () => {
    if (currentQuestion && user?.email) {
      submissionService.runTestCases(
        userCode, 
        selectedLanguage,
        currentQuestion.testCases
      ).then(results => {
        console.log('Submission results:', results);
        
        // If all tests passed, update score
        if (results.passed === results.total) {
          // Update local score state
          const updatedScores = { ...playerScores };
          const userEmail = user.email || '';
          updatedScores[userEmail] = (updatedScores[userEmail] || 0) + 1;
          setPlayerScores(updatedScores);
          
          // Broadcast score update with proper subscription
          const scoreChannel = supabase.channel('battle_scores', {
            config: {
              broadcast: { self: true } // Allow self-receiving to ensure all clients get updates
            }
          });
          
          scoreChannel.subscribe(async (status) => {
            if (status !== 'SUBSCRIBED') {
              console.log('Score channel status:', status);
              return;
            }
            
            console.log('Score channel subscribed, broadcasting score update');
            
            await scoreChannel.send({
              type: 'broadcast',
              event: 'score_update',
              payload: { 
                scores: updatedScores,
                user: userEmail,
                timestamp: new Date().toISOString()
              }
            });
            
            console.log('Score update broadcast sent');
            
            // Unsubscribe after sending to avoid keeping too many channels open
            setTimeout(() => {
              scoreChannel.unsubscribe();
            }, 1000);
          });
        }
        
        setDebugMsg(`Solution submitted: ${results.passed}/${results.total} tests passed`);
      }).catch(error => {
        console.error('Error submitting solution:', error);
        setDebugMsg('Error submitting solution');
      });
    }
  };

  // Handle selecting a random challenge
  const handleRandomChallenge = () => {
    loadRandomProblemForBattle(selectedTopics);
    setIsQuestionSelected(true);
    startTimer();
  };

  // Render the appropriate content based on the battle state
  const renderContent = () => {
    if (battleState === 'topic_selection') {
      return (
        <>
          <h1 className="text-4xl font-bold text-white mb-4">Battle Arena</h1>
          
          <div className="mb-6 text-center">
            <div className="text-5xl font-bold text-white mb-2">{playerCount}</div>
            <p className="text-slate-400 text-xl">Warriors Present</p>
            {playerCount <= 1 && (
              <p className="text-yellow-500 mt-2 text-sm">Waiting for more warriors to join the battle...</p>
            )}
          </div>
          
          {/* Connected users display */}
          <div className="mb-6 bg-gray-800/50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-white mb-2">Connected Warriors</h3>
            {connectedUsers.length > 0 ? (
              <ul className="text-left space-y-1 max-h-40 overflow-y-auto">
                {connectedUsers.map((email, index) => (
                  <li key={index} className="text-slate-300 flex items-center">
                    <span className={`w-2 h-2 ${readyUsers.includes(email) ? 'bg-green-500' : 'bg-yellow-500'} rounded-full mr-2`}></span>
                    {email}
                    {email === user?.email && (
                      <span className="ml-2 text-xs text-green-500">(you)</span>
                    )}
                    {readyUsers.includes(email) && (
                      <span className="ml-2 text-xs text-green-500">Ready</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">No warriors connected</p>
            )}
          </div>
          
          {/* Topic selection area */}
          {showTopicSelection ? (
            <TopicSelection 
              selectedTopics={selectedTopics}
              onTopicSelect={handleTopicSelect}
              onCompleteSelection={completeTopicSelection}
            />
          ) : (
            <div className="mb-6 bg-indigo-900/30 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-2">Your Battle Topics</h3>
              <div className="flex gap-3 justify-center">
                {selectedTopics.map((topic, index) => (
                  <div key={index} className="bg-indigo-800/60 text-white px-4 py-2 rounded-lg flex items-center">
                    <span className="text-xl mr-2">{CATEGORY_EMOJIS[topic]}</span> {topic}
                  </div>
                ))}
              </div>
              
              <p className="text-indigo-200 mt-4">
                {readyUsers.length === connectedUsers.length && connectedUsers.length > 1 
                  ? "All warriors are ready! Preparing battle room..." 
                  : `Waiting for other warriors to ready up... (${readyUsers.length}/${connectedUsers.length})`}
              </p>
              
              {connectedUsers.length > 0 && (
                <div className="mt-4 text-sm text-indigo-200">
                  <p>Ready warriors: {readyUsers.map(email => email.split('@')[0]).join(', ') || 'None'}</p>
                  <p>Your status: {readyUsers.includes(user?.email || '') ? 'Ready' : 'Not ready'}</p>
                </div>
              )}
              
              {readyUsers.length === connectedUsers.length && connectedUsers.length > 1 && (
                <div className="mt-4">
                  <div className="animate-pulse text-green-400 text-xl font-bold">Battle starting...</div>
                  <Button
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                    onClick={async () => {
                      // Force transition to battle room if it hasn't happened automatically
                      setBattleState('battle_room');
                      
                      // Load questions from selected topics immediately
                      await loadQuestionsForSelectedTopics(selectedTopics);
                      
                      // Reset question selection state
                      setIsQuestionSelected(false);
                    }}
                  >
                    Enter Battle Room
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      );
    } else if (battleState === 'battle_room') {
      return (
        <div className="battle-room">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-white">Battle in Progress</h1>
            <div className="text-2xl font-mono font-bold text-amber-400">{timeRemaining}</div>
          </div>
          
          {/* Players bar - moved to top */}
          <PlayersBar 
            connectedUsers={connectedUsers}
            currentUserEmail={user?.email}
            playerScores={playerScores}
            availableSkills={availableSkills}
            selectedTopics={selectedTopics}
            onUseSkill={useSkill}
          />
          
          {/* Main content area with 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left column - Question list or Problem description */}
            <div className="flex flex-col">
              {!isQuestionSelected ? (
                <ProblemList 
                  selectedTopics={selectedTopics}
                  availableQuestions={availableQuestions}
                  activeTopicFilter={activeTopicFilter}
                  setActiveTopicFilter={setActiveTopicFilter}
                  onSelectQuestion={selectQuestion}
                  onRandomChallenge={handleRandomChallenge}
                  getFilteredQuestions={getFilteredQuestions}
                />
              ) : (
                <BattleProblemDisplay 
                  currentQuestion={currentQuestion}
                  onBackToList={backToQuestionList}
                />
              )}
            </div>
            
            {/* Right column - Code editor */}
            <CodeEditor 
              userCode={userCode}
              setUserCode={setUserCode}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              timeRemaining={timeRemaining}
              editorFrozen={editorFrozen}
              editorFrozenEndTime={editorFrozenEndTime}
              isQuestionSelected={isQuestionSelected}
              currentQuestion={currentQuestion}
              onSubmitSolution={handleSubmitSolution}
              setDebugMsg={setDebugMsg}
            />
          </div>
          
          {/* Scoreboard and notifications */}
          <Scoreboard 
            connectedUsers={connectedUsers}
            playerScores={playerScores}
            currentUserEmail={user?.email}
            debugMsg={debugMsg}
          />
        </div>
      );
    }
    
    return null;
  };

  // Setup heartbeat system to detect active users
  useEffect(() => {
    if (!user?.email || !sessionId) return;
    
    // Function to send a heartbeat
    const sendHeartbeat = async () => {
      try {
        console.log('Sending heartbeat...');
        lastHeartbeatRef.current = Date.now();
        
        // Get current session data
        const { data: session } = await supabase
          .from('battle_sessions')
          .select('connected_emails, heartbeats')
          .eq('id', sessionId)
          .single();
          
        if (session) {
          // Update heartbeats object
          const heartbeats = session.heartbeats || {};
          if (user?.email) {
            heartbeats[user.email] = Date.now();
          }
          
          // Update the session to show user is still active
          await supabase
            .from('battle_sessions')
            .update({ 
              heartbeats: heartbeats,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
          
          const emails = Array.isArray(session.connected_emails) 
            ? session.connected_emails 
            : [];
          
          const now = Date.now();
          const staleThreshold = 15000; // 15 seconds
          
          // Find stale users (no heartbeat in 15 seconds)
          const staleEmails = emails.filter(email => {
            // If no heartbeat or heartbeat is old, consider stale
            const lastBeat = heartbeats[email];
            return !lastBeat || (now - parseInt(lastBeat)) > staleThreshold;
          });
          
          // Remove stale users if any found
          if (staleEmails.length > 0) {
            console.log('Stale users found:', staleEmails);
            const activeEmails = emails.filter(email => !staleEmails.includes(email));
            
            // Update the session without stale users
            await supabase
              .from('battle_sessions')
              .update({ 
                connected_emails: activeEmails,
                active_users: activeEmails.length,
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId);
              
            console.log('Removed stale users, remaining:', activeEmails);
          }
        }
      } catch (error) {
        console.error('Error sending heartbeat:', error);
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

  // Create a channel to listen for battle skill effects
  useEffect(() => {
    if (!user?.email || !sessionId) return;
    
    console.log('Setting up battle skills effect listener');
    
    const skillsChannel = supabase.channel('battle_skills_listener', {
      config: {
        broadcast: { self: false } // Don't receive our own broadcasts
      }
    });
    
    skillsChannel
      .on('broadcast', { event: 'skill_used' }, (payload) => {
        console.log('Received skill effect:', payload);
        
        // Check if the skill is targeted at this user
        if (payload.payload.target_user === user.email) {
          const { skill_name, from_user } = payload.payload;
          const fromUserName = from_user.split('@')[0];
          
          console.log(`Applying skill ${skill_name} from ${fromUserName}`);
          
          // Handle different skills
          if (skill_name === 'Freeze') {
            handleFreezeEffect(fromUserName);
          } else if (skill_name === 'Code Chaos') {
            handleChaosEffect(fromUserName, userCode, setUserCode);
          }
        }
      })
      .subscribe((status) => {
        console.log('Skills listener channel status:', status);
      });
      
    return () => {
      console.log('Unsubscribing from skills channel');
      skillsChannel.unsubscribe();
    };
  }, [user?.email, sessionId, handleFreezeEffect, userCode]);
  
  // Create a reliable channel for score updates
  useEffect(() => {
    if (!user?.email) return;
    
    console.log('Setting up score updates listener');
    
    const scoreChannel = supabase.channel('battle_scores_listener', {
      config: {
        broadcast: { self: true } // Receive our own broadcasts too
      }
    });
    
    scoreChannel
      .on('broadcast', { event: 'score_update' }, (payload) => {
        console.log('Received score update:', payload);
        if (payload.payload?.scores) {
          setPlayerScores(payload.payload.scores);
        }
      })
      .subscribe((status) => {
        console.log('Score listener channel status:', status);
      });
      
    return () => {
      console.log('Unsubscribing from score updates');
      scoreChannel.unsubscribe();
    };
  }, [user?.email]);

  // Auto-load questions when entering battle room
  useEffect(() => {
    if (battleState === 'battle_room' && selectedTopics.length > 0) {
      loadQuestionsForSelectedTopics(selectedTopics);
    }
  }, [battleState, selectedTopics, loadQuestionsForSelectedTopics]);

  // Cleanup when user leaves the page
  useEffect(() => {
    if (!user?.email) return;
    
    // Function to handle user leaving
    const handleUserLeave = async () => {
      console.log('User leaving page, cleaning up session...');
      
      try {
        // Remove user from connected emails
        if (sessionId) {
          const { data: session } = await supabase
            .from('battle_sessions')
            .select('connected_emails')
            .eq('id', sessionId)
            .single();
            
          if (session && session.connected_emails) {
            const emails = Array.isArray(session.connected_emails) 
              ? session.connected_emails 
              : [];
              
            // Filter out the current user
            const updatedEmails = emails.filter(email => email !== user.email);
            
            // Update the session
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
              
            console.log('Successfully removed user from session:', updatedEmails);
          }
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
    
    // Add beforeunload event listener
    window.addEventListener('beforeunload', handleUserLeave);
    
    // Return cleanup function to handle component unmounting
    return () => {
      window.removeEventListener('beforeunload', handleUserLeave);
      // Also perform the cleanup when component unmounts
      handleUserLeave();
    };
  }, [user?.email, sessionId]);

  // Add real-time connection listener for battle sessions
  useEffect(() => {
    if (!user?.email) return;
    
    console.log('Setting up battle sessions real-time listener');
    
    // Subscribe to changes on the battle_sessions table
    const channel = supabase
      .channel('battle_sessions_db_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battle_sessions',
          filter: 'id=eq.default-battle-session'
        },
        (payload) => {
          console.log('Battle session updated:', payload);
          // Update connected users
          if (payload.new && payload.new.connected_emails) {
            const connectedEmails = Array.isArray(payload.new.connected_emails) 
              ? payload.new.connected_emails 
              : [];
            
            console.log('Updating connected users from real-time:', connectedEmails);
            setConnectedUsers(connectedEmails);
            setPlayerCount(connectedEmails.length);
          }
          
          // Update ready users if available
          if (payload.new && payload.new.ready_users) {
            const readyUsersList = Array.isArray(payload.new.ready_users)
              ? payload.new.ready_users
              : [];
              
            console.log('Updating ready users from real-time:', readyUsersList);
            setReadyUsers(readyUsersList);
          }
        }
      )
      .subscribe((status) => {
        console.log('Battle sessions channel status:', status);
      });
      
    return () => {
      console.log('Unsubscribing from battle sessions channel');
      channel.unsubscribe();
    };
  }, [user?.email]);

  // Main render
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Session listener for real-time updates */}
        <BattleSessionListener 
          userEmail={user?.email}
          setConnectedUsers={setConnectedUsers}
          setPlayerCount={setPlayerCount}
          setReadyUsers={setReadyUsers}
          setSelectedTopics={setSelectedTopics}
        />
        
        {/* Add the FloatingCodeBackground component */}
        <FloatingCodeBackground 
          excludedTopics={battleState === 'battle_room' && currentQuestion ? [currentQuestion.category] : []} 
          opacity={0.05}
        />
        
        <Card className={`p-8 bg-gray-900 border-gray-800 w-full text-center 
          ${battleState === 'battle_room' ? 'max-w-6xl' : 'max-w-4xl'}`}>
          <div className="w-24 h-24 mx-auto mb-4">
            <Logo className="h-24" />
          </div>
          
          {/* Content based on battle state */}
          {renderContent()}
          
          {/* Debug message and navigation */}
          <div className="text-slate-300 mt-6 mb-4">
            {battleState !== 'battle_room' && (
              <p className="text-xs text-slate-500">{debugMsg}</p>
            )}
          </div>

          {battleState !== 'battle_room' && (
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                variant="outline"
                className="border-indigo-700/50 text-white hover:bg-indigo-800/30"
                onClick={async () => {
                  if (user?.email) {
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
                      console.log('Successfully left battle before navigation');
                    } catch (e) {
                      console.error('Error leaving battle before navigation:', e);
                    }
                  }
                  navigate('/');
                }}
              >
                Return to Home
              </Button>
            </div>
          )}
        </Card>
      </div>
    </DndProvider>
  );
};

export default BattleArena; 