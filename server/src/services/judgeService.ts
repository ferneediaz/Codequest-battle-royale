import fetch from 'node-fetch';

/**
 * Service to proxy requests to Judge0 API
 */
export class JudgeService {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.JUDGE0_API_URL || '';
    if (!this.apiUrl) {
      console.warn('⚠️ Warning: Judge0 API URL is not configured. Set JUDGE0_API_URL environment variable.');
    }
  }

  /**
   * Submit code to Judge0
   */
  async submitCode(submissionData: any) {
    if (!this.apiUrl) {
      throw new Error('Judge0 API URL is not configured. Set JUDGE0_API_URL environment variable.');
    }
    
    console.log('SERVER PROXY - Forwarding submission to Judge0');
    
    try {
      // Forward the request to Judge0
      const response = await fetch(`${this.apiUrl}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Judge0 API error: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      // Get the response
      const data = await response.json();
      
      console.log('SERVER PROXY - Judge0 submission response received');
      
      return data;
    } catch (error) {
      console.error('SERVER PROXY - Error submitting to Judge0:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error submitting to Judge0');
    }
  }
  
  /**
   * Get submission result from Judge0
   */
  async getSubmissionResult(token: string) {
    if (!this.apiUrl) {
      throw new Error('Judge0 API URL is not configured. Set JUDGE0_API_URL environment variable.');
    }
    
    console.log(`SERVER PROXY - Getting submission result for token: ${token}`);
    
    try {
      // Forward the request to Judge0
      const response = await fetch(`${this.apiUrl}/submissions/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Judge0 API error: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      // Get the response
      const data = await response.json();
      
      console.log('SERVER PROXY - Judge0 result response received');
      
      return data;
    } catch (error) {
      console.error('SERVER PROXY - Error getting result from Judge0:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error getting result from Judge0');
    }
  }
}

// Create and export a singleton instance
export const judgeService = new JudgeService(); 