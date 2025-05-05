import { TestCase, CodeProblem, BATTLE_CATEGORIES } from './problemService';

// API URL - we'll use environment variables in a real app
const API_URL = 'https://codequest-battle-royale.onrender.com/api';

class ApiProblemService {
  private problemsByCategory: Record<string, CodeProblem[]> = {};
  private problems: CodeProblem[] = [];
  private initialized = false;
  private serverAvailable = false;
  
  // Check if the API server is running
  async checkApiAvailability(): Promise<boolean> {
    try {
      console.log('Checking API availability...');
      const response = await fetch(`${API_URL.replace('/api', '')}/health`, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        // Short timeout to avoid slow UX
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        console.log('API server is available');
        this.serverAvailable = true;
        return true;
      } else {
        console.error('API server is not responding correctly:', response.status);
        this.serverAvailable = false;
        return false;
      }
    } catch (error) {
      console.error('API server is not available:', error);
      this.serverAvailable = false;
      return false;
    }
  }
  
  async initialize() {
    if (this.initialized) return;
    
    console.log('Initializing API problem service...');
    console.log('API URL:', API_URL);
    
    // Check if API is available
    const isAvailable = await this.checkApiAvailability();
    if (!isAvailable) {
      console.error('API server is not available. Using empty categories as fallback.');
      // Create empty categories
      BATTLE_CATEGORIES.forEach(category => {
        this.problemsByCategory[category] = [];
      });
      console.log('Created empty categories as fallback:', Object.keys(this.problemsByCategory));
      this.initialized = true;
      return;
    }
    
    try {
      // Fetch problems from our new API
      console.log('Fetching problems from API:', `${API_URL}/problems`);
      const response = await fetch(`${API_URL}/problems`);
      
      if (!response.ok) {
        console.error('API Error Status:', response.status);
        console.error('API Error Text:', await response.text());
        throw new Error(`API error: ${response.status}`);
      }
      
      this.problems = await response.json() as CodeProblem[];
      console.log(`Loaded ${this.problems.length} problems from API`);
      
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
      console.error('Error initializing API problem service:', error);
      // Create empty categories to prevent errors
      BATTLE_CATEGORIES.forEach(category => {
        this.problemsByCategory[category] = [];
      });
      console.log('Created empty categories as fallback:', Object.keys(this.problemsByCategory));
      this.initialized = true; // Mark as initialized even with failure to prevent repeated failures
    }
  }
  
  getCategories(): string[] {
    return Object.keys(this.problemsByCategory);
  }
  
  getProblemsByCategory(category: string): CodeProblem[] {
    return this.problemsByCategory[category] || [];
  }
  
  async fetchProblemsByCategory(category: string): Promise<CodeProblem[]> {
    try {
      console.log(`Fetching problems for category ${category} from API`);
      const response = await fetch(`${API_URL}/problems/category/${encodeURIComponent(category)}`);
      
      if (!response.ok) {
        console.error('API Error Status:', response.status);
        console.error('API Error Text:', await response.text());
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json() as CodeProblem[];
      console.log(`Fetched ${data.length} problems for category ${category}`);
      return data;
    } catch (error) {
      console.error(`Error fetching problems for category ${category}:`, error);
      return [];
    }
  }
  
  getRandomProblemsByCategory(
    category: string, 
    count: number = 1, 
    difficulty?: 'easy' | 'medium' | 'hard'
  ): CodeProblem[] {
    console.log(`Getting random ${count} problems from category ${category}, difficulty: ${difficulty || 'any'}`);
    const problems = this.problemsByCategory[category] || [];
    console.log(`Found ${problems.length} problems in category ${category}`);
    
    // Filter by difficulty if specified
    const filteredProblems = difficulty 
      ? problems.filter(p => p.difficulty === difficulty)
      : problems;
    
    console.log(`After difficulty filter, have ${filteredProblems.length} problems`);
    
    // Shuffle the array
    const shuffled = this.shuffleArray([...filteredProblems]);
    
    // Return the first 'count' problems (or fewer if not enough)
    const result = shuffled.slice(0, Math.min(count, shuffled.length));
    console.log(`Returning ${result.length} random problems`);
    
    // Return an empty problem if none found to prevent errors
    if (result.length === 0 && count > 0) {
      console.warn('No problems found, returning empty placeholder problem');
      return [{
        id: 'empty-problem',
        title: 'No problems found',
        description: 'No problems could be found for this category',
        difficulty: 'easy',
        category: category,
        starterCode: {
          javascript: '// No problems found'
        },
        testCases: []
      }];
    }
    
    return result;
  }
  
  async getProblemById(id: string): Promise<CodeProblem | undefined> {
    try {
      console.log(`Fetching problem ${id} from API`);
      const response = await fetch(`${API_URL}/problems/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Problem ${id} not found`);
          return undefined;
        }
        console.error('API Error Status:', response.status);
        console.error('API Error Text:', await response.text());
        throw new Error(`API error: ${response.status}`);
      }
      
      const problem = await response.json() as CodeProblem;
      console.log(`Successfully fetched problem ${id}: ${problem.title}`);
      return problem;
    } catch (error) {
      console.error(`Error fetching problem ${id}:`, error);
      return undefined;
    }
  }
  
  getAllProblems(): CodeProblem[] {
    return this.problems;
  }
  
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  // Get server status for UI
  isServerAvailable(): boolean {
    return this.serverAvailable;
  }
}

export const apiProblemService = new ApiProblemService(); 