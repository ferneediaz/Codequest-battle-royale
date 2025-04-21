// Service Config
// This file allows easy switching between direct DB access and API services

import { problemService } from './problemService';
import { apiProblemService } from './api-problemService';

// Set to true to use the API-based services
// Set to false to use direct Supabase access
const USE_API_SERVICES = true;

// Export the appropriate service instances
export const activeProblemService = USE_API_SERVICES 
  ? apiProblemService 
  : problemService;

// Initialize services
export const initializeServices = async () => {
  await activeProblemService.initialize();
  console.log(`Services initialized using ${USE_API_SERVICES ? 'API' : 'direct DB'} services`);
}; 