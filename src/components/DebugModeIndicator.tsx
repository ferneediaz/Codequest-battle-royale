import React from 'react';
import { Bug, Eye } from 'lucide-react';
import { debugState } from '../config/debugManager';

interface DebugModeIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * A simple debug mode indicator that allows toggling debug mode
 */
const DebugModeIndicator: React.FC<DebugModeIndicatorProps> = ({ 
  position = 'top-right' 
}) => {
  if (!debugState.isEnabled()) return null;
  
  // Position styles
  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2'
  };
  
  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <div className="bg-indigo-900/90 border border-indigo-600 px-2 py-1 rounded-md flex items-center shadow-lg text-xs">
        <Bug className="w-3 h-3 text-indigo-400 mr-1" />
        <span className="text-indigo-200">Debug Mode</span>
      </div>
    </div>
  );
};

export default DebugModeIndicator; 