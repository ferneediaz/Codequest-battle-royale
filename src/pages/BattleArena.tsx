/// <reference path="../types/codemirror.d.ts" />
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BattleCategory, BattleState } from '../constants/battleConstants';
import FloatingCodeBackground from '../components/FloatingCodeBackground';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Badge } from "@/components/ui/badge";

// Import styles
import '../styles/confetti.css';

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
import BattleHeader from '../components/battle-arena/BattleHeader';
import TestResultItem from '../components/battle-arena/TestResultItem';
import Confetti from '../components/battle-arena/Confetti';
import BattleTopics from '../components/battle-arena/BattleTopics';

// Import custom hooks
import { useSkillEffects } from '../hooks/battle/useSkillEffects';
import { useBattleTimer } from '../hooks/battle/useBattleTimer';
import { useQuestionLoader } from '../hooks/battle/useQuestionLoader';
import { useBattleSession } from '../hooks/battle/useBattleSession';
import { useTopicSelection } from '../hooks/battle/useTopicSelection';
import { useSubmissionHandler } from '../hooks/battle/useSubmissionHandler';
import { useCharacterCountTracker } from '../hooks/battle/useCharacterCountTracker';

// Import shared types
import { CodeProblem } from '../services/problemService';
import { TestResults } from '../components/battle-arena/CodeEditor';

// Define allowed language types
type ProgrammingLanguage = 'javascript' | 'python';

// Helper function to safely render problem description with formatting
const ProcessedMarkdown: React.FC<{ content: string; className?: string }> = ({ content, className = "" }) => {
  const processedContent = useMemo(() => {
    if (!content) return [];
    
    // Split by newline
    const lines = content.split('\n');
    
    // Process each line to handle code blocks
    return lines.map((line, index) => {
      const segments: React.ReactNode[] = [];
      let lastIndex = 0;
      const codeRegex = /`([^`]+)`/g;
      let match;
      
      // Find all code blocks in this line
      while ((match = codeRegex.exec(line)) !== null) {
        // Add text before code block
        if (match.index > lastIndex) {
          segments.push(
            <span key={`text-${index}-${lastIndex}`}>
              {line.substring(lastIndex, match.index)}
            </span>
          );
        }
        
        // Add code block
        segments.push(
          <code key={`code-${index}-${match.index}`} className="bg-gray-800 px-1 py-0.5 rounded text-yellow-300">
            {match[1]}
          </code>
        );
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text after last code block
      if (lastIndex < line.length) {
        segments.push(
          <span key={`text-${index}-${lastIndex}`}>
            {line.substring(lastIndex)}
          </span>
        );
      }
      
      // Return the processed line with <br/> at the end
      return (
        <React.Fragment key={`line-${index}`}>
          {segments.length > 0 ? segments : line}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  }, [content]);

  return <div className={className}>{processedContent}</div>;
};

// Main component
const BattleArena: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isTabVisible, setIsTabVisible] = useState(true);
  
  // Get room ID from URL parameters or query string
  const { roomId: urlRoomId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryRoomId = queryParams.get('roomId');
  
  // Use room ID from either source
  const roomId = urlRoomId || queryRoomId;
  
  // Add state for room info
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  
  // Use our refactored custom hooks
  const {
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
  } = useBattleSession(user);
  
  const {
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
  } = useTopicSelection(user);
  
  // Add state for selected language
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>('javascript');
  const [userCode, setUserCode] = useState<string>(`// Select a problem to start coding
// Your code will appear here`);
  
  // Question/problem selection state
  const [isQuestionSelected, setIsQuestionSelected] = useState(false);
  const [activeTopicFilter, setActiveTopicFilter] = useState<string | null>(null);
  
  // Use skill effects hook
  const {
    editorFrozen,
    setEditorFrozen,
    editorFrozenEndTime,
    setEditorFrozenEndTime,
    availableSkills,
    setAvailableSkills,
    useSkill,
    handleFreezeEffect,
    handleChaosEffect
  } = useSkillEffects({
    userEmail: user?.email,
    sessionId,
    battleState
  });
  
  // Use question loader hook
  const {
    loading: questionLoading,
    problems,
    currentProblem,
    setCurrentProblem,
    initialize,
    loadProblemsByCategory,
    getRandomProblem,
    loadProblemById
  } = useQuestionLoader();
  
  // Use battle timer hook
  const {
    timeRemaining,
    startTimer,
    stopTimer,
    resetTimer
  } = useBattleTimer({ initialSeconds: 300 });
  
  // Use submission handler hook
  const {
    testResults,
    setTestResults,
    isRunningTests,
    setIsRunningTests,
    isSubmitting,
    setIsSubmitting,
    activeView,
    setActiveView,
    playerScores,
    setPlayerScores,
    completedQuestions,
    setCompletedQuestions,
    showConfetti,
    setShowConfetti,
    handleTestRun,
    handleSubmitSolution,
    celebrateSuccess
  } = useSubmissionHandler(user, currentProblem);

  // Use character count tracker hook
  const {
    userCharCounts
  } = useCharacterCountTracker({
    userEmail: user?.email,
    sessionId,
    battleState,
    currentProblem,
    userCode,
    selectedLanguage
  });
  
  // Create compatibility variables for the old hook interface
  const [availableQuestions, setAvailableQuestions] = useState<CodeProblem[]>([]);
  
  // Map the currentProblem to what was previously called currentQuestion
  const currentQuestion = currentProblem;
  
  // Add dependency for memoization to prevent re-creation
  const loadQuestionsForSelectedTopics = useCallback(async (categories: BattleCategory[]) => {
    try {
      console.log('BattleArena: Loading questions for selected topics:', categories);
      const result = await loadProblemsByCategory(categories);
      
      // Ensure we're getting problems for all selected categories
      if (result) {
        for (const category of categories) {
          const problemsForCategory = result[category] || [];
          console.log(`BattleArena: ${problemsForCategory.length} problems loaded for ${category}`);
        }
      }
      
      // Flatten the problems by category into a single array
      const allProblems = Object.values(result || {}).flat();
      console.log('BattleArena: Total available questions:', allProblems.length);
      setAvailableQuestions(allProblems);
      return allProblems;
    } catch (error) {
      console.error('Error in loadQuestionsForSelectedTopics:', error);
      setAvailableQuestions([]);
      return [];
    }
  }, [loadProblemsByCategory]);
  
  // Function to handle selecting a question
  const selectQuestion = useCallback((problem: CodeProblem) => {
    try {
      console.log('Selecting question:', problem);
      setCurrentProblem(problem);
      setIsQuestionSelected(true);
      // Make sure state update is applied
      setTimeout(() => {
        if (problem?.starterCode?.[selectedLanguage as keyof typeof problem.starterCode]) {
          setUserCode(problem.starterCode[selectedLanguage as keyof typeof problem.starterCode]);
        }
      }, 0);
      return problem;
    } catch (error) {
      console.error('Error in selectQuestion:', error);
      return problem;
    }
  }, [selectedLanguage, setCurrentProblem]);
  
  // Get filtered questions based on topic filter
  const getFilteredQuestions = () => {
    try {
      if (!activeTopicFilter) {
        return availableQuestions || [];
      }
      return (availableQuestions || []).filter(q => q?.category === activeTopicFilter);
    } catch (error) {
      console.error('Error in getFilteredQuestions:', error);
      return [];
    }
  };
  
  // Return to question list
  const backToQuestionList = () => {
    try {
      setIsQuestionSelected(false);
    } catch (error) {
      console.error('Error in backToQuestionList:', error);
    }
  };

  // Update code when the selected problem changes
  useEffect(() => {
    if (currentQuestion && currentQuestion.starterCode && currentQuestion.starterCode[selectedLanguage as keyof typeof currentQuestion.starterCode]) {
      // Set the starter code for the currently selected problem and language
      setUserCode(currentQuestion.starterCode[selectedLanguage as keyof typeof currentQuestion.starterCode]);
    }
  }, [currentQuestion, selectedLanguage]);
  
  // Load room info
  useEffect(() => {
    const loadRoomInfo = async () => {
      if (!roomId) {
        setIsLoadingRoom(false);
        return;
      }
      
      try {
        setIsLoadingRoom(true);
        
        const { data, error } = await supabase
          .from('battle_rooms')
          .select('*')
          .eq('id', roomId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setRoomInfo(data);
          // Use room-specific session ID
          hasInitializedRef.current = false; // Reset initialization
          console.log(`Joined custom room: ${data.name} (${roomId})`);
        } else {
          setDebugMsg("Room not found");
          console.error("Room not found");
        }
      } catch (error) {
        console.error('Error loading room info:', error);
        setDebugMsg("Error loading room");
      } finally {
        setIsLoadingRoom(false);
      }
    };
    
    loadRoomInfo();
  }, [roomId, setDebugMsg]);
  
  // Check if database exists and set it up if needed
  useEffect(() => {
    // Only run initialization once, regardless of sessionId
    if (user && !loading && !hasInitializedRef.current && !isLoadingRoom) {
      hasInitializedRef.current = true;
      
      // One-time reset of user ready state on page load
      console.log("🚀 CRITICAL FIX: Resetting user ready state on page load");
      
      // Set current user as not ready in state
      setIsTopicSelectionComplete(false);
      setReadyUsers([]);
      
      // Start normal initialization process with room ID
      const customSessionId = roomId ? `room_${roomId}` : undefined;
      initializeSession(customSessionId);
    }
  }, [user, loading, hasInitializedRef, initializeSession, setIsTopicSelectionComplete, setReadyUsers, roomId, isLoadingRoom]);

  // Handle selecting a random challenge
  const handleRandomChallenge = useCallback(() => {
    if (selectedTopics.length === 0) {
      setDebugMsg("Error: No topics selected");
      return;
    }
    
    console.log('Selected topics for random challenge:', selectedTopics);
    
    // Pick a random topic from selected topics
    const randomTopic = selectedTopics[Math.floor(Math.random() * selectedTopics.length)];
    
    // Get a random problem from that topic
    const problem = getRandomProblem(randomTopic);
    if (problem) {
      console.log('Selected random problem:', problem);
      setCurrentProblem(problem);
      setIsQuestionSelected(true);
      
      // Make sure state update is applied
      setTimeout(() => {
        if (problem.starterCode?.[selectedLanguage as keyof typeof problem.starterCode]) {
          setUserCode(problem.starterCode[selectedLanguage as keyof typeof problem.starterCode]);
        }
      }, 0);
      
      startTimer();
    } else {
      console.error('No problem found for random challenge');
      setDebugMsg("Couldn't find a random challenge. Try again.");
    }
  }, [selectedTopics, getRandomProblem, selectedLanguage, startTimer, setDebugMsg, setCurrentProblem]);

  // Effect for entering battle room automatically when all users are ready
  useEffect(() => {
    // Add logging to track topics when battle state changes
    console.log("Battle state changed, current topics:", selectedTopics);
  }, [battleState, selectedTopics]);

  // Auto-load questions when entering battle room
  useEffect(() => {
    if (battleState === 'battle_room' && selectedTopics.length > 0 && availableQuestions.length === 0) {
      console.log("Loading questions for battle room with topics:", selectedTopics);
      loadQuestionsForSelectedTopics(selectedTopics);
    }
  }, [battleState, selectedTopics, loadQuestionsForSelectedTopics, availableQuestions.length]);

  // Add an effect to track topic changes for debugging
  useEffect(() => {
    console.log("Topic selections changed:", selectedTopics);
  }, [selectedTopics]);

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
  }, [user?.email, setPlayerScores]);

  // Create a channel to listen for battle skill effects
  useEffect(() => {
    if (!user?.email || !sessionId) return;
    
    // Create a stable channel ID using the user's email (replace @ with _at_)
    const channelId = `battle_skills_${user.email.replace('@', '_at_')}_${sessionId}`;
    
    console.log(`Setting up battle skills effect listener for channel: ${channelId}`);
    
    const skillsChannel = supabase.channel(channelId, {
      config: {
        broadcast: { self: false } // Don't receive our own broadcasts
      }
    });
    
    skillsChannel
      .on('broadcast', { event: 'skill_used' }, (payload) => {
        console.log(`Received skill effect on channel ${channelId}:`, payload);
        
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
        console.log(`Skills listener channel status for ${channelId}:`, status);
      });
      
    return () => {
      console.log(`Unsubscribing from skills channel: ${channelId}`);
      skillsChannel.unsubscribe();
    };
  }, [user?.email, sessionId, handleFreezeEffect, handleChaosEffect, userCode, setUserCode]);

  // Create wrapper adapters for functions with type mismatches
  // Adapter for handleEnterBattleRoom
  const enterBattleRoomAdapter = () => {
    return handleEnterBattleRoom(setDebugMsg, (newState: string) => {
      // Convert the string to BattleState and call changeBattleState
      changeBattleState(newState as BattleState);
    });
  };
  
  // Adapter for handleTestRun
  const testRunAdapter = (results: TestResults | null, isRunning: boolean) => {
    if (results) {
      console.log("BattleArena - testRunAdapter - userLogs info:", {
        hasResults: !!results,
        hasUserLogs: !!results.userLogs,
        logsLength: results.userLogs?.length || 0,
        logsSample: results.userLogs?.slice(0, 2)
      });
      handleTestRun(results, isRunning, setDebugMsg);
    } else {
      setIsRunningTests(isRunning);
    }
  };
  
  // Adapter for handleSubmitSolution
  const submitSolutionAdapter = () => {
    handleSubmitSolution(userCode, selectedLanguage, setDebugMsg);
  };

  // Adapter for setSelectedLanguage
  const setSelectedLanguageAdapter = (language: string) => {
    if (language === 'javascript' || language === 'python') {
      setSelectedLanguage(language);
    }
  };

  // Render the appropriate content based on the battle state
  const renderContent = () => {
    if (battleState === 'topic_selection') {
      return (
        <>
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
                {connectedUsers.map((email, index) => {
                  // Here's the key fix: Never show a user as ready unless they've explicitly clicked the Ready button
                  // Ignore any ready state from the database that wasn't explicitly set
                  const isMyUserEmail = email === user?.email;
                  const isUserReady = isMyUserEmail 
                    ? isTopicSelectionComplete // Local state for current user
                    : readyUsers.includes(email); // Database state for other users
                  
                  return (
                    <li key={index} className="text-slate-300 flex items-center">
                      <span className={`w-2 h-2 ${isUserReady ? 'bg-green-500' : 'bg-yellow-500'} rounded-full mr-2`}></span>
                      {email}
                      {isMyUserEmail && (
                        <span className="ml-2 text-xs text-green-500">(you)</span>
                      )}
                      {isUserReady ? (
                        <span className="ml-2 text-xs text-green-500">Ready</span>
                      ) : (
                        <span className="ml-2 text-xs text-yellow-500">Not Ready</span>
                      )}
                    </li>
                  );
                })}
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
              onCompleteSelection={() => completeTopicSelection(setDebugMsg)}
            />
          ) : (
            <BattleTopics
              selectedTopics={selectedTopics}
              readyUsers={readyUsers}
              connectedUsers={connectedUsers}
              userEmail={user?.email}
              onChangeTopics={() => handleChangeTopics(setDebugMsg)}
              onEnterBattleRoom={enterBattleRoomAdapter}
            />
          )}
        </>
      );
    } else if (battleState === 'battle_room') {
      return (
        <div className="battle-room">
          {/* Players bar */}
          <PlayersBar 
            connectedUsers={connectedUsers}
            currentUserEmail={user?.email}
            playerScores={playerScores}
            userCharCounts={userCharCounts}
            availableSkills={availableSkills}
            selectedTopics={selectedTopics}
            onUseSkill={useSkill}
          />
          
          {!isQuestionSelected ? (
            <div className="mt-4">
              {/* Main content area with 2-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column - Problem list */}
                <div>
                  <ProblemList 
                    selectedTopics={selectedTopics}
                    availableQuestions={availableQuestions}
                    activeTopicFilter={activeTopicFilter}
                    setActiveTopicFilter={setActiveTopicFilter}
                    onSelectQuestion={selectQuestion}
                    onRandomChallenge={handleRandomChallenge}
                    getFilteredQuestions={getFilteredQuestions}
                    completedQuestions={user?.email && completedQuestions[user.email] ? completedQuestions[user.email] : []}
                    currentUserEmail={user?.email}
                  />
                </div>
                
                {/* Right column - Code editor */}
                <CodeEditor 
                  userCode={userCode}
                  setUserCode={setUserCode}
                  selectedLanguage={selectedLanguage}
                  setSelectedLanguage={setSelectedLanguageAdapter}
                  timeRemaining={timeRemaining}
                  editorFrozen={editorFrozen}
                  editorFrozenEndTime={editorFrozenEndTime}
                  isQuestionSelected={isQuestionSelected}
                  currentQuestion={currentQuestion}
                  onSubmitSolution={submitSolutionAdapter}
                  setDebugMsg={setDebugMsg}
                  onTestRun={testRunAdapter}
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4">
              {/* Main Battle UI with tabs similar to Codewars */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column with Instructions/Output tabs */}
                <div className="flex flex-col bg-gray-900 rounded-lg overflow-hidden">
                  <div className="flex border-b border-gray-700">
                    <button 
                      className={`px-6 py-3 text-sm font-medium ${activeView === 'instructions' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                      onClick={() => setActiveView('instructions')}
                    >
                      Instructions
                    </button>
                    <button 
                      className={`px-6 py-3 text-sm font-medium ${activeView === 'output' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                      onClick={() => setActiveView('output')}
                      disabled={!testResults && !isRunningTests}
                    >
                      Output
                    </button>
                  </div>
                  <div className="flex-1">
                    {activeView === 'instructions' ? (
                      // Show problem description
                      <div className="p-4 h-[600px] overflow-y-auto">
                        <div className="prose prose-invert max-w-none">
                          <h2 className="text-xl font-bold text-white mb-4">{currentQuestion?.title}</h2>
                          <ProcessedMarkdown 
                            content={currentQuestion?.description || ''} 
                            className="text-gray-200" 
                          />
                        </div>
                        
                        {/* Examples */}
                        {currentQuestion?.examples && currentQuestion.examples.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-lg font-medium text-white mb-3">Examples</h3>
                            <div className="space-y-4">
                              {currentQuestion.examples.map((example, index) => (
                                <div key={index} className="bg-gray-800 p-4 rounded-md border border-gray-700">
                                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{example}</pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Constraints */}
                        {currentQuestion?.constraints && currentQuestion.constraints.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-lg font-medium text-white mb-3">Constraints</h3>
                            <ul className="list-disc pl-6 space-y-2">
                              {currentQuestion.constraints.map((constraint, index) => (
                                <li key={index} className="text-sm text-gray-300">{constraint}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="mt-6 text-center">
                          <Button 
                            variant="outline" 
                            className="border-indigo-500 bg-indigo-900/30 text-white hover:bg-indigo-800/70 hover:border-indigo-400 font-medium"
                            onClick={backToQuestionList}
                          >
                            ← Back to Problem List
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Show test output
                      <div className="p-4 h-[600px] overflow-y-auto">
                        {isRunningTests ? (
                          <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            <span className="ml-3 text-white">Running tests...</span>
                          </div>
                        ) : testResults ? (
                          <>
                            {/* Green output box with passed tests */}
                            <div className={`p-4 rounded ${testResults.passed === testResults.total ? 'bg-green-950/30 border-l-4 border-green-500' : 'bg-red-950/30 border-l-4 border-red-500'}`}>
                              {/* Test summary header with time and count */}
                              <div className="flex flex-wrap items-center justify-between text-sm mb-2">
                                <div className="text-gray-400">Time: 456ms</div>
                                <div>
                                  <span className="text-green-400">Passed: {testResults.passed}</span>
                                  <span className="mx-2 text-gray-500">|</span>
                                  <span className="text-red-400">Failed: {testResults.total - testResults.passed}</span>
                                </div>
                              </div>
                              
                              {/* Test Results section */}
                              <div className="mt-4">
                                <h3 className="text-lg font-medium text-white mb-2">Test Results:</h3>
                                
                                {/* Display test cases */}
                                <div className="space-y-px border border-gray-700 rounded-md overflow-hidden bg-gray-800">
                                  {testResults.passed === testResults.total && (
                                    <div className="py-4 text-center text-green-400 font-medium">
                                      You have passed all of the tests! :)
                                    </div>
                                  )}
                                  
                                  {/* Always show all tests (both passed and failed) */}
                                  {testResults.passedTests?.map((test: any, i: number) => (
                                    <TestResultItem 
                                      key={`passed-${test.index}`}
                                      index={test.index}
                                      input={test.input}
                                      expected={test.expected}
                                      actual={test.actual}
                                      passed={true}
                                      logs={test.logs || []}
                                    />
                                  ))}
                                  
                                  {testResults.failedTests?.map((test: any, i: number) => (
                                    <TestResultItem 
                                      key={`failed-${test.index}`} 
                                      index={test.index} 
                                      input={test.input} 
                                      expected={test.expected} 
                                      actual={test.actual}
                                      passed={false}
                                      logs={test.logs || []}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 text-center">
                              <Button 
                                variant="outline" 
                                className="border-indigo-500 bg-indigo-900/30 text-white hover:bg-indigo-800/70 hover:border-indigo-400 font-medium"
                                onClick={() => setActiveView('instructions')}
                              >
                                Back to Instructions
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <p>No test results yet</p>
                            <p className="text-sm mt-2">Run tests to see results here</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right column - Code editor (always visible) */}
                <CodeEditor 
                  userCode={userCode}
                  setUserCode={setUserCode}
                  selectedLanguage={selectedLanguage}
                  setSelectedLanguage={setSelectedLanguageAdapter}
                  timeRemaining={timeRemaining}
                  editorFrozen={editorFrozen}
                  editorFrozenEndTime={editorFrozenEndTime}
                  isQuestionSelected={isQuestionSelected}
                  currentQuestion={currentQuestion}
                  onSubmitSolution={submitSolutionAdapter}
                  setDebugMsg={setDebugMsg}
                  onTestRun={testRunAdapter}
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>
          )}
          
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

  // Main render
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Session listener for real-time updates */}
        <BattleSessionListener 
          userEmail={user?.email}
          sessionId={roomId ? `room_${roomId}` : sessionId}
          setConnectedUsers={setConnectedUsers}
          setPlayerCount={setPlayerCount}
          setReadyUsers={setReadyUsers}
          setSelectedTopics={setSelectedTopics}
          setTopicSelections={setTopicSelections}
        />
        
        {/* Celebration animation */}
        <Confetti active={showConfetti} />
        
        {/* Add the FloatingCodeBackground component */}
        <FloatingCodeBackground 
          excludedTopics={battleState === 'battle_room' && currentQuestion ? [currentQuestion.category] : []} 
          opacity={0.05}
        />
        
        <Card className={`p-8 bg-gray-900 border-gray-800 w-full text-center 
          ${battleState === 'battle_room' ? 'max-w-6xl' : 'max-w-4xl'}`}>
          {/* <div className="w-42 h-42 mx-auto mb-6">
            <Logo className="h-32" />
          </div> */}
          
          {/* Room info display */}
          {roomInfo && (
            <div className="mb-4 text-center">
              <Badge className="bg-indigo-700 mb-2">{roomInfo.game_mode === 'battle_royale' ? 'Battle Royale' : roomInfo.game_mode}</Badge>
              <h2 className="text-2xl font-bold text-white">{roomInfo.name}</h2>
              <p className="text-sm text-slate-400">Room ID: {roomId}</p>
            </div>
          )}
          
          {/* Battle header with title and timer */}
          <BattleHeader 
            battleState={battleState} 
            timeRemaining={timeRemaining} 
          />
          
          {/* Main content */}
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
                  await leaveSession();
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