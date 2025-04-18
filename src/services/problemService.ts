import { supabase } from '../lib/supabase';

export interface TestCase {
  input: string;
  output: string;
  isHidden?: boolean;
}

export interface CodeProblem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  starterCode: Record<string, string>;
  solutionCode?: Record<string, string>;
  constraints?: string[];
  examples?: string[];
  testCases: TestCase[];
  timeLimit?: number;
  memoryLimit?: number;
}

// Map category names to their file slug versions
const getCategorySlug = (category: string): string => {
  return category.toLowerCase().replace(/\s+/g, '-');
};

// Battle categories from the app
export const BATTLE_CATEGORIES = [
  "Forest of Arrays",
  "Hashmap Dungeons",
  "Binary Search Castle",
  "Linked List Gardens", 
  "Tree of Wisdom",
  "Graph Adventures",
  "Dynamic Programming Peaks",
  "Stack & Queue Tavern",
  "String Sorcery",
  "Sorting Sanctuary",
] as const;

class ProblemService {
  private problemsByCategory: Record<string, CodeProblem[]> = {};
  private problems: CodeProblem[] = [];
  private initialized = false;
  
  async initialize() {
    if (this.initialized) return;
    
    console.log('Initializing problem service...');
    
    try {
      // First check if problems exist in Supabase
      const { data: supabaseProblems, error } = await supabase
        .from('coding_problems')
        .select('*');
      
      if (error) {
        console.error('Error fetching problems from Supabase:', error);
      }
      
      if (supabaseProblems && supabaseProblems.length > 0) {
        // We have problems in Supabase, use those
        console.log(`Loaded ${supabaseProblems.length} problems from Supabase`);
        this.problems = supabaseProblems as CodeProblem[];
      } else {
        // Load from local JSON files
        await this.loadFromLocalFiles();
        // Optionally, upload to Supabase
        // await this.uploadProblemsToSupabase();
      }
      
      // Organize problems by category
      this.problems.forEach(problem => {
        if (!this.problemsByCategory[problem.category]) {
          this.problemsByCategory[problem.category] = [];
        }
        this.problemsByCategory[problem.category].push(problem);
      });
      
      this.initialized = true;
      console.log('Problem service initialized with categories:', Object.keys(this.problemsByCategory));
      
    } catch (error) {
      console.error('Error initializing problem service:', error);
    }
  }
  
  // Load problems from local JSON files
  private async loadFromLocalFiles() {
    // For development - load problems from static files
    this.problems = [];
    
    for (const category of BATTLE_CATEGORIES) {
      try {
        // Using dynamic import to load the problem files
        const categorySlug = getCategorySlug(category);
        
        // Load problems from each category
        if (categorySlug === 'forest-of-arrays') {
          try {
            const { default: problemData1 } = await import('../data/problems/forest-of-arrays/maximum-product-subarray.json');
            const problem1: CodeProblem = {
              ...problemData1,
              difficulty: problemData1.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem1);
            
            const { default: problemData2 } = await import('../data/problems/forest-of-arrays/two-sum.json');
            const problem2: CodeProblem = {
              ...problemData2,
              difficulty: problemData2.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem2);
            
            const { default: problemData3 } = await import('../data/problems/forest-of-arrays/best-time-to-buy-sell-stock.json');
            const problem3: CodeProblem = {
              ...problemData3,
              difficulty: problemData3.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem3);
            
            const { default: problemData4 } = await import('../data/problems/forest-of-arrays/container-with-most-water.json');
            const problem4: CodeProblem = {
              ...problemData4,
              difficulty: problemData4.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem4);
          } catch (e) {
            console.warn('Could not load some Forest of Arrays problems:', e);
          }
        }
        
        if (categorySlug === 'hashmap-dungeons') {
          try {
            const { default: problemData1 } = await import('../data/problems/hashmap-dungeons/group-anagrams.json');
            const problem1: CodeProblem = {
              ...problemData1,
              difficulty: problemData1.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem1);
            
            const { default: problemData2 } = await import('../data/problems/hashmap-dungeons/valid-anagram.json');
            const problem2: CodeProblem = {
              ...problemData2,
              difficulty: problemData2.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem2);
          } catch (e) {
            console.warn('Could not load some Hashmap Dungeons problems:', e);
          }
        }
        
        if (categorySlug === 'string-sorcery') {
          try {
            const { default: problemData1 } = await import('../data/problems/string-sorcery/palindrome-substrings.json');
            const problem1: CodeProblem = {
              ...problemData1,
              difficulty: problemData1.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem1);
            
            const { default: problemData2 } = await import('../data/problems/string-sorcery/longest-palindromic-substring.json');
            const problem2: CodeProblem = {
              ...problemData2,
              difficulty: problemData2.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem2);
            
            const { default: problemData3 } = await import('../data/problems/string-sorcery/valid-palindrome.json');
            const problem3: CodeProblem = {
              ...problemData3,
              difficulty: problemData3.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem3);
          } catch (e) {
            console.warn('Could not load some String Sorcery problems:', e);
          }
        }
        
        if (categorySlug === 'sorting-sanctuary') {
          try {
            const { default: problemData } = await import('../data/problems/sorting-sanctuary/merge-sorted-arrays.json');
            const problem: CodeProblem = {
              ...problemData,
              difficulty: problemData.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem);
          } catch (e) {
            console.warn('Could not load merge-sorted-arrays.json');
          }
        }
        
        if (categorySlug === 'dynamic-programming-peaks') {
          try {
            const { default: problemData } = await import('../data/problems/dynamic-programming-peaks/min-cost-climbing-stairs.json');
            const problem: CodeProblem = {
              ...problemData,
              difficulty: problemData.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem);
          } catch (e) {
            console.warn('Could not load min-cost-climbing-stairs.json');
          }
        }
        
        if (categorySlug === 'binary-search-castle') {
          try {
            const { default: problemData1 } = await import('../data/problems/binary-search-castle/binary-search.json');
            const problem1: CodeProblem = {
              ...problemData1,
              difficulty: problemData1.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem1);
            
            const { default: problemData2 } = await import('../data/problems/binary-search-castle/search-in-rotated-sorted-array.json');
            const problem2: CodeProblem = {
              ...problemData2,
              difficulty: problemData2.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem2);
          } catch (e) {
            console.warn('Could not load some Binary Search Castle problems:', e);
          }
        }
        
        if (categorySlug === 'stack-queue-tavern') {
          try {
            const { default: problemData } = await import('../data/problems/stack-queue-tavern/valid-parentheses.json');
            const problem: CodeProblem = {
              ...problemData,
              difficulty: problemData.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem);
          } catch (e) {
            console.warn('Could not load valid-parentheses.json');
          }
        }
        
        if (categorySlug === 'tree-of-wisdom') {
          try {
            const { default: problemData } = await import('../data/problems/tree-of-wisdom/invert-binary-tree.json');
            const problem: CodeProblem = {
              ...problemData,
              difficulty: problemData.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem);
          } catch (e) {
            console.warn('Could not load invert-binary-tree.json');
          }
        }
        
        if (categorySlug === 'linked-list-gardens') {
          try {
            const { default: problemData } = await import('../data/problems/linked-list-gardens/reverse-linked-list.json');
            const problem: CodeProblem = {
              ...problemData,
              difficulty: problemData.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem);
          } catch (e) {
            console.warn('Could not load reverse-linked-list.json');
          }
        }
        
        if (categorySlug === 'graph-adventures') {
          try {
            const { default: problemData } = await import('../data/problems/graph-adventures/number-of-islands.json');
            const problem: CodeProblem = {
              ...problemData,
              difficulty: problemData.difficulty as 'easy' | 'medium' | 'hard'
            };
            this.problems.push(problem);
          } catch (e) {
            console.warn('Could not load number-of-islands.json');
          }
        }
        
        // In a full implementation, you would load all problems from each category directory
        // const problems = await import(`../data/problems/${categorySlug}.json`);
        // this.problems.push(...problems.default);
        
      } catch (error) {
        console.error(`Failed to load problems for category: ${category}`, error);
      }
    }
    
    console.log(`Loaded ${this.problems.length} problems from local files`);
  }
  
  // Upload problems to Supabase (for persistence)
  async uploadProblemsToSupabase() {
    if (this.problems.length === 0) return;
    
    try {
      console.log(`Uploading ${this.problems.length} problems to Supabase...`);
      
      // Upload in batches to avoid size limits
      const batchSize = 10;
      for (let i = 0; i < this.problems.length; i += batchSize) {
        const batch = this.problems.slice(i, i + batchSize);
        const { error } = await supabase
          .from('coding_problems')
          .upsert(batch, { onConflict: 'id' });
          
        if (error) {
          console.error(`Error uploading batch ${i / batchSize}:`, error);
        }
      }
      
      console.log('Problems uploaded to Supabase successfully');
    } catch (error) {
      console.error('Error uploading problems to Supabase:', error);
    }
  }
  
  // Get all available categories
  getCategories(): string[] {
    return Object.keys(this.problemsByCategory);
  }
  
  // Get all problems for a specific category
  getProblemsByCategory(category: string): CodeProblem[] {
    return this.problemsByCategory[category] || [];
  }
  
  // Get random problems from a category with optional difficulty filter
  getRandomProblemsByCategory(
    category: string, 
    count: number = 1, 
    difficulty?: 'easy' | 'medium' | 'hard'
  ): CodeProblem[] {
    let problems = this.problemsByCategory[category] || [];
    
    if (difficulty) {
      problems = problems.filter(p => p.difficulty === difficulty);
    }
    
    // If not enough problems, return what we have
    if (problems.length <= count) return [...problems];
    
    // Shuffle and return requested count
    return this.shuffleArray(problems).slice(0, count);
  }
  
  // Get a specific problem by ID
  getProblemById(id: string): CodeProblem | undefined {
    return this.problems.find(p => p.id === id);
  }
  
  // Get all problems
  getAllProblems(): CodeProblem[] {
    return this.problems;
  }
  
  // Helper to shuffle an array
  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
  
  // Check if the service is initialized
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create and export a singleton instance
export const problemService = new ProblemService(); 