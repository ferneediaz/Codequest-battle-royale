/**
 * Service initialization module
 * This file handles initializing all services used by the application
 */

import { initializeServices } from '../services/serviceConfig';

export const initializeAppServices = async () => {
  console.log('Initializing application services');
  
  // Initialize all services that need initialization
  await initializeServices();
  
  console.log('All services initialized');
};

// Export a function to check if using API services
export const isUsingApiServices = () => {
  // We could read this from localStorage or env variables in the future
  // For now, just use the constant from serviceConfig
  return true; // Always return true since we've enabled API services
}; 