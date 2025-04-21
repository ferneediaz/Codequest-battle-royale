/// <reference path="../types/codemirror.d.ts" />
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { useAuth } from '../contexts/AuthContext';
import { battleService } from '../services/battleService';
import { BattleSession } from '../lib/supabase-types';
import { supabase } from '../lib/supabase';
import { setupBattleSessionsTable, checkTableExists, cleanupStaleReadyStates } from '../lib/setupDatabase';
import { submissionService, LANGUAGE_IDS, JudgeResult, JUDGE_STATUS } from '../services/submissionService';
import { CodeProblem } from '../services/problemService';
import { activeProblemService } from '../services/serviceConfig';
import FloatingCodeBackground from '../components/FloatingCodeBackground';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Import the confetti CSS
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

// Import the Tabs components
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight } from 'lucide-react';

// Import shared types
import { TestResultItemDetails, TestResults } from '../components/battle-arena/CodeEditor';

// Extend window interface for global access
declare global {
  interface Window {
    battleReadinessChannel: any;
  }
}

// Add this TestResultItem component for displaying each test case result
const TestResultItem = ({ 
  index, 
  input, 
  expected, 
  actual, 
  passed,
  assertions = 2
}: { 
  index: string | number; 
  input?: string; 
  expected?: string; 
  actual?: string; 
  passed: boolean;
  assertions?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`border-b border-gray-700 py-2 px-4 hover:bg-gray-800/50`}>
      <div 
        className="flex items-center cursor-pointer text-sm" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="mr-2">
          {isExpanded ? 
            <ChevronDown className="w-4 h-4 text-gray-400" /> : 
            <ChevronRight className="w-4 h-4 text-gray-400" />
          }
        </div>
        <div className={`font-mono ${passed ? 'text-green-400' : 'text-red-400'} flex-1`}>
          {passed ? '✓' : '✗'} Test {index}
        </div>
      </div>
      
      {isExpanded && (
        <div className="pl-6 mt-2 space-y-2 text-sm">
          {(input !== undefined && expected !== undefined) ? (
            <>
              <div>
                <div className="text-gray-400 mb-1">Input:</div>
                <div className="text-white bg-gray-900 p-2 rounded font-mono overflow-x-auto whitespace-pre">{input}</div>
              </div>
              
              <div>
                <div className="text-gray-400 mb-1">Expected Result:</div>
                <div className="text-green-400 bg-gray-900 p-2 rounded font-mono overflow-x-auto whitespace-pre">{expected}</div>
              </div>
              
              {/* Always show Your Output section, regardless of pass/fail status */}
              <div>
                <div className="text-gray-400 mb-1">Your Code Output:</div>
                <div className={`${passed ? 'text-green-400' : 'text-red-400'} bg-gray-900 p-2 rounded font-mono overflow-x-auto whitespace-pre`}>{actual || "undefined"}</div>
              </div>
            </>
          ) : (
            <div className="text-gray-400 italic">
              Test details not available for this test case.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Add a confetti effect component for success celebration
const Confetti = ({ active }: { active: boolean }) => {
  if (!active) return null;
  
  return (
    <div className="confetti-container">
      {Array.from({ length: 100 }).map((_, i) => (
        <div 
          key={i} 
          className="confetti" 
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)]
          }}
        />
      ))}
    </div>
  );
};

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
  const [topicSelections, setTopicSelections] = useState<Record<string, BattleCategory[]>>({});
  
  // Add user readiness tracking
  const [readyUsers, setReadyUsers] = useState<string[]>([]);
  const [battleState, setBattleState] = useState<BattleState>('topic_selection');
  
  // Add state for selected language
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [userCode, setUserCode] = useState<string>(`/**
 * @param {number[]} nums1
 * @param {number} m
 * @param {number[]} nums2
 * @param {number} n
 * @return {void} Do not return anything, modify nums1 in-place instead.
 */
function merge(nums1, m, nums2, n) {
  let p1 = m - 1;
  let p2 = n - 1;
  let p = m + n - 1;
  
  while (p2 >= 0) {
    if (p1 >= 0 && nums1[p1] > nums2[p2]) {
      nums1[p] = nums1[p1];
      p1--;
    } else {
      nums1[p] = nums2[p2];
      p2--;
    }
    p--;
  }
}`);
  
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
    loading: questionLoading,
    problems,
    currentProblem,
    setCurrentProblem,
    initialize,
    loadProblemsByCategory,
    getRandomProblem,
    loadProblemById
  } = useQuestionLoader();

  const {
    timeRemaining,
    startTimer,
    stopTimer,
    resetTimer
  } = useBattleTimer({ initialSeconds: 300 });

  // Create compatibility variables for the old hook interface
  const [availableQuestions, setAvailableQuestions] = useState<CodeProblem[]>([]);
  const [isQuestionSelected, setIsQuestionSelected] = useState(false);
  const [activeTopicFilter, setActiveTopicFilter] = useState<string | null>(null);
  
  // Map the currentProblem to what was previously called currentQuestion
  const currentQuestion = currentProblem;
  
  // Add dependency for memoization to prevent re-creation
  const loadQuestionsForSelectedTopics = useCallback(async (categories: BattleCategory[]) => {
    try {
      const result = await loadProblemsByCategory(categories);
      // Flatten the problems by category into a single array
      const allProblems = Object.values(result || {}).flat();
      setAvailableQuestions(allProblems);
      return allProblems;
    } catch (error) {
      console.error('Error in loadQuestionsForSelectedTopics:', error);
      setAvailableQuestions([]);
      return [];
    }
  }, [loadProblemsByCategory]);
  
  const loadRandomProblemForBattle = async (categories: BattleCategory[]) => {
    try {
      if (!categories?.length) return null;
      const problem = getRandomProblem(categories[0]);
      return problem;
    } catch (error) {
      console.error('Error in loadRandomProblemForBattle:', error);
      return null;
    }
  };
  
  const selectQuestion = useCallback((problem: CodeProblem) => {
    try {
      console.log('Selecting question:', problem);
      setCurrentProblem(problem);
      setIsQuestionSelected(true);
      // Make sure state update is applied
      setTimeout(() => {
        if (problem?.starterCode?.[selectedLanguage]) {
          setUserCode(problem.starterCode[selectedLanguage]);
        }
      }, 0);
      return problem;
    } catch (error) {
      console.error('Error in selectQuestion:', error);
      return problem;
    }
  }, [selectedLanguage]);
  
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
  
  const backToQuestionList = () => {
    try {
      setIsQuestionSelected(false);
    } catch (error) {
      console.error('Error in backToQuestionList:', error);
    }
  };

  // Update code when the selected problem changes
  useEffect(() => {
    if (currentQuestion && currentQuestion.starterCode && currentQuestion.starterCode[selectedLanguage]) {
      // Set the starter code for the currently selected problem and language
      setUserCode(currentQuestion.starterCode[selectedLanguage]);
    }
  }, [currentQuestion, selectedLanguage]);

  // Update state for test results to use the imported type
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Add state for active tab
  const [activeTabValue, setActiveTabValue] = useState('instructions');

  // Add state for which view is selected in the battle UI
  const [activeView, setActiveView] = useState<'instructions' | 'output'>('instructions');

  // Add state for celebration animation
  const [showConfetti, setShowConfetti] = useState(false);

  // In the BattleArena component, add state to track completed questions
  const [completedQuestions, setCompletedQuestions] = useState<{ [userId: string]: string[] }>({});

  // Add new state for submission loading
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if database exists and set it up if needed
  useEffect(() => {
    // Only run initialization once, regardless of sessionId
    if (user && !loading && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      // One-time reset of user ready state on page load
      console.log("🚀 CRITICAL FIX: Resetting user ready state on page load");
      
      // Set current user as not ready in state
      setIsTopicSelectionComplete(false);
      setReadyUsers([]);
      
      // Start normal initialization process
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
            
            // Force current user to be not ready, regardless of database state
            // The user must explicitly click the Ready button to be ready
            console.log('🔴 CRITICAL: Explicitly marking current user as NOT ready on join');
            setIsTopicSelectionComplete(false);
            
            // When initializing ready users from the database, remove the current user
            let readyUsersList = Array.isArray(session.ready_users) ? [...session.ready_users] : [];
            if (readyUsersList.includes(user.email)) {
              console.log('🔴 Removing current user from ready list on join');
              readyUsersList = readyUsersList.filter(email => email !== user.email);
              
              // Update database to ensure current user is not marked as ready
              try {
                await supabase
                  .from('battle_sessions')
                  .update({ 
                    ready_users: readyUsersList,
                  })
                  .eq('id', 'default-battle-session');
                  
                console.log('✅ Updated database to mark user as not ready');
              } catch (err) {
                console.error('Error updating ready state in database:', err);
              }
            }
            
            // Set local ready users state (excluding current user)
            setReadyUsers(readyUsersList);
            
            setDebugMsg(connectedEmails.length > 1 ? 
              `Connected with ${connectedEmails.length} warriors!` : 
              'Connected! Waiting for other warriors...');
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
            const { data } = await supabase
              .from('battle_sessions')
              .select('ready_users')
              .eq('id', 'default-battle-session')
              .single();
              
            if (data?.ready_users) {
              const dbReadyUsers = Array.isArray(data.ready_users) ? [...data.ready_users] : [];
              const filteredUsers = dbReadyUsers.filter(email => email !== user.email);
              
              await supabase
                .from('battle_sessions')
                .update({ ready_users: filteredUsers })
                .eq('id', 'default-battle-session');
                
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

  // Add a handler for topic selection completion using presence
  const completeTopicSelection = async () => {
    if (selectedTopics.length !== 2 || !user?.email) return;
    
    console.log("🚀 User clicked Ready for Battle button");
    
    // Mark the current user as ready (locally first)
    setIsTopicSelectionComplete(true);
    setDebugMsg(`Ready for battle with topics: ${selectedTopics.join(' & ')}`);
    
    try {
      // Get current session data
      const { data: currentSession, error: fetchError } = await supabase
        .from('battle_sessions')
        .select('ready_users, topic_selections')
        .eq('id', 'default-battle-session')
        .single();

      if (fetchError) {
        console.error(`Error fetching session:`, fetchError);
        setDebugMsg('Error updating ready status');
        return;
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
        .eq('id', 'default-battle-session');
          
      if (updateError) {
        console.error(`Error updating session:`, updateError);
        setDebugMsg('Error updating ready status');
        return;
      }
      
      console.log('User marked as ready:', user.email);
    } catch (error) {
      console.error('Error setting up readiness:', error);
      setDebugMsg('Error setting up ready status');
    }
  };

  // Update handleTestRun to use the loading state
  const handleTestRun = (results: any, isRunning: boolean) => {
    // Ensure results have properly formatted test cases
    if (results && results.failedTests) {
      // Make sure each test case has input, expected, and actual values
      results.failedTests = results.failedTests.map((test: any, i: number) => ({
        ...test,
        input: test.input || `Test case ${i+1}`,
        expected: test.expected || "true",
        actual: test.actual || "false"
      }));
      
      // Also ensure each passed test case has input and expected values
      if (results.passedTests) {
        results.passedTests = results.passedTests.map((test: any, i: number) => ({
          ...test,
          input: test.input || `Test case ${i+1}`,
          expected: test.expected || "true",
          actual: test.actual || test.expected || "true"
        }));
      }
    }
    
    setTestResults(results);
    setIsRunningTests(isRunning);
    
    // Automatically switch to output tab when test results are available
    if (results && !isRunning) {
      setActiveView('output');
      
      // Add debug info if tests are failing
      if (results.failed > 0 && results.failedTests) {
        console.log("Debug info for failed tests:");
        results.failedTests.forEach((test: any) => {
          console.log(`Test input: "${test.input}"`);
          console.log(`Expected: ${test.expected}`);
          console.log(`Actual: ${test.actual}`);
          
          // For palindrome problem - debug the algorithm
          if (currentQuestion?.id === 'valid-palindrome') {
            const cleanInput = String(test.input).replace(/^"|"$/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
            const reversed = cleanInput.split('').reverse().join('');
            console.log(`Cleaned input: "${cleanInput}"`);
            console.log(`Reversed: "${reversed}"`);
            console.log(`Are they equal? ${cleanInput === reversed}`);
          }
        });
      }
    }
  };

  // Update handleSubmitSolution to use the loading state
  const handleSubmitSolution = async () => {
    if (currentQuestion && user?.email) {
      setDebugMsg('Submitting solution...');
      setIsSubmitting(true); // Start loading animation
      
      try {
        // Prepare submission for Judge0
        const languageId = LANGUAGE_IDS[selectedLanguage as keyof typeof LANGUAGE_IDS];
        if (!languageId) {
          throw new Error(`Unsupported language: ${selectedLanguage}`);
        }

        // Separate visible and hidden tests for debugging
        const visibleTests = currentQuestion.testCases.filter(test => !test.isHidden);
        const hiddenTests = currentQuestion.testCases.filter(test => test.isHidden);
        
        console.log('Visible tests:', visibleTests.length, visibleTests);
        console.log('Hidden tests:', hiddenTests.length, hiddenTests);
        
        // Properly format ALL test cases to ensure expected field is populated
        const formattedTestCases = currentQuestion.testCases.map(test => ({
          input: test.input,
          expected: test.output // Ensure expected field is populated from output
        }));

        const submissionPayload = {
          source_code: userCode,
          language_id: languageId,
          stdin: JSON.stringify({ testCases: formattedTestCases }), // Use properly formatted test cases
        };

        // Use submitCode which runs the embedded test runner
        const result: JudgeResult = await submissionService.submitCode(submissionPayload);
        
        console.log('Submission result:', result);

        // Check Judge0 status first
        if (result.status.id === JUDGE_STATUS.ACCEPTED) {
          // If accepted, parse the stdout which contains our test runner JSON output
          if (result.stdout) {
            try {
              const runnerOutput = JSON.parse(result.stdout);
              if (runnerOutput.summary) {
                const passed = runnerOutput.summary.passed;
                const total = runnerOutput.summary.total;
                
                // If all tests passed, update score and show celebration
                if (passed === total) {
                  // Update local score state
                  const updatedScores = { ...playerScores };
                  const userEmail = user.email || '';
                  updatedScores[userEmail] = (updatedScores[userEmail] || 0) + 1;
                  setPlayerScores(updatedScores);
                  
                  // Add to completed questions
                  const updatedCompletedQuestions = { ...completedQuestions };
                  if (!updatedCompletedQuestions[userEmail]) {
                    updatedCompletedQuestions[userEmail] = [];
                  }
                  
                  // Only add to completed if not already present
                  if (!updatedCompletedQuestions[userEmail].includes(currentQuestion.id)) {
                    updatedCompletedQuestions[userEmail].push(currentQuestion.id);
                    setCompletedQuestions(updatedCompletedQuestions);
                    
                    // Broadcast the update to other clients
                    const completedChannel = supabase.channel('completed_questions', {
                      config: {
                        broadcast: { self: true }
                      }
                    });
                    
                    completedChannel.subscribe(async (status) => {
                      if (status === 'SUBSCRIBED') {
                        await completedChannel.send({
                          type: 'broadcast',
                          event: 'question_completed',
                          payload: { 
                            completedQuestions: updatedCompletedQuestions,
                            user: userEmail,
                            questionId: currentQuestion.id,
                            timestamp: new Date().toISOString()
                          }
                        });
                        
                        setTimeout(() => {
                          completedChannel.unsubscribe();
                        }, 1000);
                      }
                    });
                  }
                  
                  setDebugMsg(`🎉 Solution successful: ${passed}/${total} tests passed!`);
                  
                  // Show celebration animation
                  celebrateSuccess();
                  
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
                } else {
                  // Some tests failed
                  // Get more detailed info about the failures
                  const failedTests = runnerOutput.results?.filter((r: any) => !r.passed) || [];
                  
                  // Check if these are hidden test cases
                  let hiddenFailures = 0;
                  let visibleFailures = 0;
                  
                  const visibleTestCount = visibleTests?.length || 0;
                  
                  failedTests.forEach((failedTest: any, index: number) => {
                    // Try to determine if this is a hidden test by matching input
                    const matchesVisibleTest = visibleTests.some(t => t.input === failedTest.input);
                    if (!matchesVisibleTest) {
                      console.log(`Hidden test failed:`, failedTest);
                      hiddenFailures++;
                    } else {
                      console.log(`Visible test failed:`, failedTest);
                      visibleFailures++;
                    }
                  });
                  
                  if (hiddenFailures > 0) {
                    setDebugMsg(`❌ Failed: ${passed}/${total} tests passed. Your code may work for the ${visibleTestCount - visibleFailures} visible test cases but fails on ${hiddenFailures} hidden test cases that check edge cases!`);
                  } else {
                    setDebugMsg(`❌ Failed: ${passed}/${total} tests passed. Check the test results for details.`);
                  }
                }
                
                // Ensure test results have expected field populated from output field
                if (runnerOutput.testResults) {
                  const formattedResults = {
                    ...runnerOutput,
                    passedTests: runnerOutput.passedTests?.map((test: any) => ({
                      ...test,
                      expected: test.expected || test.output
                    })),
                    failedTests: runnerOutput.failedTests?.map((test: any) => ({
                      ...test,
                      expected: test.expected || test.output
                    }))
                  };
                  setTestResults(formattedResults);
                  setActiveView('output');
                }
              } else {
                throw new Error('Test runner output format invalid (missing summary)');
              }
            } catch (parseError) {
              console.error('Error parsing submission output:', parseError, result.stdout);
              setDebugMsg('Error processing submission results.');
            }
          } else {
            setDebugMsg('Submission ran, but no output received.');
          }
        } else {
          // Handle other Judge0 statuses (Compile Error, Runtime Error, etc.)
          setDebugMsg(`Submission Failed: ${result.status.description}. ${result.stderr || result.compile_output || result.message || ''}`);
        }

      } catch (error) {
        console.error('Error submitting solution:', error);
        setDebugMsg(`Error submitting: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsSubmitting(false); // End loading animation
      }
    }
  };

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
        if (problem.starterCode?.[selectedLanguage]) {
          setUserCode(problem.starterCode[selectedLanguage]);
        }
      }, 0);
      
      startTimer();
    } else {
      console.error('No problem found for random challenge');
      setDebugMsg("Couldn't find a random challenge. Try again.");
    }
  }, [selectedTopics, getRandomProblem, selectedLanguage, startTimer]);

  // Function to trigger celebration animation
  const celebrateSuccess = () => {
    setShowConfetti(true);
    
    // Auto-hide confetti after a few seconds
    setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
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
                  
                  {/* Just keep the Change Topics button */}
                  <div className="flex justify-center mt-3">
                    <Button
                      className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs px-3 py-1"
                      onClick={() => {
                        // Show topic selection again
                        setShowTopicSelection(true);
                        
                        // IMPORTANT: Set user as not ready when they change topics
                        setIsTopicSelectionComplete(false);
                        
                        // Also remove user from ready list in database
                        if (user?.email) {
                          const removeFromReadyList = async () => {
                            try {
                              // First get current ready users
                              const { data: session } = await supabase
                                .from('battle_sessions')
                                .select('ready_users')
                                .eq('id', 'default-battle-session')
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
                                  .eq('id', 'default-battle-session');
                                  
                                console.log('User marked as not ready after changing topics');
                              }
                            } catch (err) {
                              console.error('Error updating ready status:', err);
                            }
                          };
                          
                          // Execute the update
                          removeFromReadyList();
                        }
                        
                        setDebugMsg('Returned to topic selection');
                      }}
                    >
                      Change Topics
                    </Button>
                  </div>
                </div>
              )}
              
              {readyUsers.length === connectedUsers.length && connectedUsers.length > 1 && (
                <div className="mt-4">
                  <div className="animate-pulse text-green-400 text-xl font-bold">Battle starting...</div>
                  <Button
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleEnterBattleRoom}
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
          
          {/* Players bar */}
          <PlayersBar 
            connectedUsers={connectedUsers}
            currentUserEmail={user?.email}
            playerScores={playerScores}
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
                  setSelectedLanguage={setSelectedLanguage}
                  timeRemaining={timeRemaining}
                  editorFrozen={editorFrozen}
                  editorFrozenEndTime={editorFrozenEndTime}
                  isQuestionSelected={isQuestionSelected}
                  currentQuestion={currentQuestion}
                  onSubmitSolution={handleSubmitSolution}
                  setDebugMsg={setDebugMsg}
                  onTestRun={handleTestRun}
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
                          <div dangerouslySetInnerHTML={{ 
                            __html: currentQuestion?.description.replace(/\n/g, '<br>').replace(/`([^`]+)`/g, '<code>$1</code>') || ''
                          }} />
                        </div>
                        
                        {/* Examples */}
                        {currentQuestion?.examples && currentQuestion.examples.length > 0 && (
                          <div className="mt-4">
                            <h3 className="text-lg font-medium text-white mb-2">Examples</h3>
                            <div className="space-y-3">
                              {currentQuestion.examples.map((example, index) => (
                                <div key={index} className="bg-gray-800 p-3 rounded-md">
                                  <pre className="text-sm text-gray-300 whitespace-pre-wrap">{example}</pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Constraints */}
                        {currentQuestion?.constraints && currentQuestion.constraints.length > 0 && (
                          <div className="mt-4">
                            <h3 className="text-lg font-medium text-white mb-2">Constraints</h3>
                            <ul className="list-disc pl-5 space-y-1">
                              {currentQuestion.constraints.map((constraint, index) => (
                                <li key={index} className="text-sm text-gray-300">{constraint}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="mt-4 text-center">
                          <Button 
                            variant="outline" 
                            className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
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
                                  {testResults.passedTests?.map((test: TestResultItemDetails) => (
                                    <TestResultItem 
                                      key={`passed-${test.index}`}
                                      index={test.index}
                                      input={test.input}
                                      expected={test.expected}
                                      actual={test.actual}
                                      passed={true}
                                    />
                                  ))}
                                  
                                  {testResults.failedTests?.map((test) => (
                                    <TestResultItem 
                                      key={`failed-${test.index}`} 
                                      index={test.index} 
                                      input={test.input} 
                                      expected={test.expected} 
                                      actual={test.actual}
                                      passed={false}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 text-center">
                              <Button 
                                variant="outline" 
                                className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
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
                  setSelectedLanguage={setSelectedLanguage}
                  timeRemaining={timeRemaining}
                  editorFrozen={editorFrozen}
                  editorFrozenEndTime={editorFrozenEndTime}
                  isQuestionSelected={isQuestionSelected}
                  currentQuestion={currentQuestion}
                  onSubmitSolution={handleSubmitSolution}
                  setDebugMsg={setDebugMsg}
                  onTestRun={handleTestRun}
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
  }, [user?.email, sessionId, handleFreezeEffect, handleChaosEffect]);
  
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
    if (battleState === 'battle_room' && selectedTopics.length > 0 && availableQuestions.length === 0) {
      loadQuestionsForSelectedTopics(selectedTopics);
    }
  }, [battleState, selectedTopics, loadQuestionsForSelectedTopics, availableQuestions.length]);

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
            
            // Also update ready users to ensure they're still connected
            if (payload.new.ready_users) {
              const readyUsersList = Array.isArray(payload.new.ready_users)
                ? payload.new.ready_users
                : [];
                
              console.log('Updating ready users from real-time:', readyUsersList);
              setReadyUsers(readyUsersList);
            }
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

  // Subscribe to battle state changes
  useEffect(() => {
    if (!user?.email) return;

    console.log('Setting up battle state subscription');
    
    const battleStateChannel = supabase
      .channel('battle_state_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battle_sessions',
          filter: `id=eq.default-battle-session`
        },
        async (payload) => {
          console.log('Received battle state update:', payload);
          if (payload.new) {
            const newBattleState = payload.new.battle_state;
            const readyUsersList = Array.isArray(payload.new.ready_users) ? payload.new.ready_users : [];
            const connectedEmailsList = Array.isArray(payload.new.connected_emails) ? payload.new.connected_emails : [];
            
            console.log('Battle state update:', {
              newBattleState,
              readyUsers: readyUsersList,
              connectedUsers: connectedEmailsList
            });
            
            if (newBattleState === 'battle_room' || 
               (readyUsersList.length === connectedEmailsList.length && connectedEmailsList.length > 1)) {
              console.log('Transitioning to battle room');
              setDebugMsg('Battle is starting...');
              
              // Update local state
              setBattleState('battle_room');
              
              try {
                // Load questions
                await loadQuestionsForSelectedTopics(selectedTopics);
                setIsQuestionSelected(false);
                setDebugMsg('Successfully entered battle room!');
              } catch (err) {
                console.error('Error loading questions:', err);
                setDebugMsg('Entered battle room but had trouble loading questions.');
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Battle state subscription status:', status);
      });

    return () => {
      console.log('Cleaning up battle state subscription');
      battleStateChannel.unsubscribe();
    };
  }, [user?.email, selectedTopics]);

  // Add battle_state column if it doesn't exist
  useEffect(() => {
    if (!user?.email) return;
    
    const updateSchema = async () => {
      try {
        const { data: schemaCheck } = await supabase.rpc('execute_sql', {
          sql_query: `
            DO $$
            BEGIN
              -- Add battle_state column if it doesn't exist
              IF NOT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'battle_sessions' 
                AND column_name = 'battle_state'
              ) THEN
                ALTER TABLE public.battle_sessions ADD COLUMN battle_state TEXT DEFAULT 'topic_selection';
              END IF;

              -- Add last_state_change column if it doesn't exist
              IF NOT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'battle_sessions' 
                AND column_name = 'last_state_change'
              ) THEN
                ALTER TABLE public.battle_sessions ADD COLUMN last_state_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();
              END IF;

              -- Add state_changed_by column if it doesn't exist
              IF NOT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'battle_sessions' 
                AND column_name = 'state_changed_by'
              ) THEN
                ALTER TABLE public.battle_sessions ADD COLUMN state_changed_by TEXT;
              END IF;
            END
            $$;
          `
        });
        console.log('Schema update completed:', schemaCheck);

      } catch (error) {
        console.error('Error updating schema:', error);
      }
    };
    
    updateSchema();
  }, [user?.email]);

  // Add a listener for completed questions updates
  useEffect(() => {
    if (!user?.email) return;
    
    console.log('Setting up completed questions listener');
    
    const completedChannel = supabase.channel('completed_questions_listener', {
      config: {
        broadcast: { self: true } // Receive our own broadcasts too
      }
    });
    
    completedChannel
      .on('broadcast', { event: 'question_completed' }, (payload) => {
        console.log('Received completed question update:', payload);
        if (payload.payload?.completedQuestions) {
          setCompletedQuestions(payload.payload.completedQuestions);
        }
      })
      .subscribe((status) => {
        console.log('Completed questions listener channel status:', status);
      });
      
    return () => {
      console.log('Unsubscribing from completed questions updates');
      completedChannel.unsubscribe();
    };
  }, [user?.email]);

  const handleEnterBattleRoom = async () => {
    try {
      setDebugMsg('Transitioning to battle room...');
      
      // Get current session state first
      const { data: currentSession } = await supabase
        .from('battle_sessions')
        .select('ready_users, connected_emails')
        .eq('id', 'default-battle-session')
        .single();

      if (!currentSession) {
        setDebugMsg('Error: Could not find battle session');
        return;
      }

      const connectedEmails = Array.isArray(currentSession.connected_emails) 
        ? currentSession.connected_emails 
        : [];
      const readyUsers = Array.isArray(currentSession.ready_users) 
        ? currentSession.ready_users 
        : [];

      // Verify all users are still ready
      if (readyUsers.length !== connectedEmails.length || connectedEmails.length < 2) {
        setDebugMsg('Error: Not all users are ready');
        return;
      }

      // Update battle state in database
      const { error: updateError } = await supabase
        .from('battle_sessions')
        .update({ 
          battle_state: 'battle_room',
          updated_at: new Date().toISOString(),
          last_state_change: new Date().toISOString(),
          state_changed_by: user?.email
        })
        .eq('id', 'default-battle-session');
        
      if (updateError) {
        console.error('Error updating battle state:', updateError);
        setDebugMsg('Error starting battle: ' + updateError.message);
        return;
      }

      // Update local state immediately
      setBattleState('battle_room');
      
      // Load questions from selected topics immediately
      await loadQuestionsForSelectedTopics(selectedTopics);
      
      // Reset question selection state
      setIsQuestionSelected(false);
      
      setDebugMsg('Successfully entered battle room!');
    } catch (err) {
      console.error('Error transitioning to battle room:', err);
      setDebugMsg('Error entering battle room. Please try again.');
    }
  };

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
          <div className="w-42 h-42 mx-auto mb-6">
            <Logo className="h-32" />
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