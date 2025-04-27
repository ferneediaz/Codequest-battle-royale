import { CodeProblem } from '../../services/problemService';
import { activeProblemService } from '../../services/serviceConfig';
import { useState, useCallback } from 'react';
import { BattleCategory } from '../../constants/battleConstants';

export const useQuestionLoader = () => {
  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState<Record<BattleCategory, CodeProblem[]>>({} as Record<BattleCategory, CodeProblem[]>);
  const [currentProblem, setCurrentProblem] = useState<CodeProblem | null>(null);
  
  const initialize = useCallback(async () => {
    if (!activeProblemService.isInitialized()) {
      setLoading(true);
      console.log('Initializing problem service from hook...');
      await activeProblemService.initialize();
      setLoading(false);
    }
  }, []);
  
  const loadProblemsByCategory = useCallback(async (categories: BattleCategory[]) => {
    setLoading(true);
    await initialize();
    
    console.log('Loading problems for selected categories:', categories);
    
    const loadedProblems: Record<BattleCategory, CodeProblem[]> = {} as Record<BattleCategory, CodeProblem[]>;
    
    for (const category of categories) {
      loadedProblems[category] = activeProblemService.getProblemsByCategory(category);
      console.log(`Loaded ${loadedProblems[category].length} problems for "${category}"`);
    }
    
    setProblems(loadedProblems);
    setLoading(false);
    
    // Log a summary of all loaded problems
    const allProblemsCount = Object.values(loadedProblems).reduce((total, problems) => total + problems.length, 0);
    console.log(`Total problems loaded: ${allProblemsCount}`);
    
    return loadedProblems;
  }, [initialize]);
  
  const getRandomProblem = useCallback((category: BattleCategory, difficulty?: 'easy' | 'medium' | 'hard') => {
    console.log(`Getting random problem for category: ${category}${difficulty ? `, difficulty: ${difficulty}` : ''}`);
    const categoryProblems = activeProblemService.getRandomProblemsByCategory(category, 1, difficulty);
    const problem = categoryProblems.length > 0 ? categoryProblems[0] : null;
    
    if (problem) {
      console.log(`Selected random problem: ${problem.id} - ${problem.title}`);
    } else {
      console.warn(`No problems found for category: ${category}`);
    }
    
    setCurrentProblem(problem);
    return problem;
  }, []);
  
  const loadProblemById = useCallback(async (id: string) => {
    setLoading(true);
    await initialize();
    
    const problem = await activeProblemService.getProblemById(id);
    setCurrentProblem(problem || null);
    setLoading(false);
    
    return problem;
  }, [initialize]);
  
  return {
    loading,
    problems,
    currentProblem,
    setCurrentProblem,
    initialize,
    loadProblemsByCategory,
    getRandomProblem,
    loadProblemById
  };
}; 