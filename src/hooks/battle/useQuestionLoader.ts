import { useState, useCallback } from 'react';
import { problemService, CodeProblem } from '../../services/problemService';
import { BattleCategory } from '../../constants/battleConstants';

export const useQuestionLoader = () => {
  const [availableQuestions, setAvailableQuestions] = useState<CodeProblem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<CodeProblem | null>(null);
  const [isQuestionSelected, setIsQuestionSelected] = useState<boolean>(false);
  const [activeTopicFilter, setActiveTopicFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Load questions for selected topics
  const loadQuestionsForSelectedTopics = useCallback(async (selectedTopics: BattleCategory[], retryCount = 0): Promise<CodeProblem[]> => {
    if (selectedTopics.length === 0) return [];
    
    setIsLoading(true);
    
    try {
      // Initialize problem service if needed
      if (!problemService.isInitialized()) {
        await problemService.initialize();
      }
      
      // Get available problems from both selected topics
      let allQuestions: CodeProblem[] = [];
      
      for (const category of selectedTopics) {
        const topicQuestions = problemService.getProblemsByCategory(category);
        allQuestions = [...allQuestions, ...topicQuestions];
      }
      
      if (allQuestions.length > 0) {
        console.log(`Loaded ${allQuestions.length} questions for selected topics`);
        setAvailableQuestions(allQuestions);
        setIsLoading(false);
        return allQuestions;
      } else {
        console.error('No questions found for selected topics');
        // Add max retry logic
        if (retryCount < 3) {
          console.log(`Retry attempt ${retryCount + 1} for loading questions`);
          // Wait a moment and retry
          return new Promise(resolve => {
            setTimeout(async () => {
              const questions = await loadQuestionsForSelectedTopics(selectedTopics, retryCount + 1);
              resolve(questions);
            }, 1000);
          });
        } else {
          // After 3 retries, set an empty array
          setAvailableQuestions([]);
          setIsLoading(false);
          return [];
        }
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      // Add max retry logic
      if (retryCount < 3) {
        console.log(`Retry attempt ${retryCount + 1} for loading questions after error`);
        // Wait a moment and retry
        return new Promise(resolve => {
          setTimeout(async () => {
            const questions = await loadQuestionsForSelectedTopics(selectedTopics, retryCount + 1);
            resolve(questions);
          }, 1000);
        });
      } else {
        // After 3 retries, set an empty array
        setAvailableQuestions([]);
        setIsLoading(false);
        return [];
      }
    }
  }, []);
  
  // Load a random problem for the battle
  const loadRandomProblemForBattle = useCallback(async (selectedTopics: BattleCategory[]): Promise<CodeProblem | null> => {
    if (selectedTopics.length === 0) return null;
    
    // Initialize problem service if needed
    if (!problemService.isInitialized()) {
      await problemService.initialize();
    }
    
    // Get a random problem from the first selected topic
    const category = selectedTopics[0];
    const problems = problemService.getRandomProblemsByCategory(category, 1);
    
    if (problems.length > 0) {
      setCurrentQuestion(problems[0]);
      return problems[0];
    } else {
      console.error('No problems found for category:', category);
      return null;
    }
  }, []);
  
  // Select a specific question
  const selectQuestion = useCallback((problem: CodeProblem) => {
    console.log('[useQuestionLoader] Selecting question:', problem.id);
    console.log('[useQuestionLoader] Test Cases for selected question:', JSON.stringify(problem.testCases));
    
    setCurrentQuestion(problem);
    setIsQuestionSelected(true);
    return problem;
  }, []);
  
  // Get filtered questions based on activeTopicFilter
  const getFilteredQuestions = useCallback(() => {
    if (!activeTopicFilter) {
      return availableQuestions;
    }
    return availableQuestions.filter(q => q.category === activeTopicFilter);
  }, [availableQuestions, activeTopicFilter]);
  
  // Go back to question list
  const backToQuestionList = useCallback(() => {
    setIsQuestionSelected(false);
  }, []);
  
  return {
    availableQuestions,
    currentQuestion,
    isQuestionSelected,
    activeTopicFilter,
    isLoading,
    loadQuestionsForSelectedTopics,
    loadRandomProblemForBattle,
    selectQuestion,
    getFilteredQuestions,
    setActiveTopicFilter,
    setIsQuestionSelected,
    backToQuestionList
  };
}; 