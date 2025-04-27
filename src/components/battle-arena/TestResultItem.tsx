import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';

export interface TestResultItemDetails {
  index: string | number;
  input?: string;
  expected?: string;
  actual?: string;
  passed: boolean;
  assertions?: number;
  logs?: string[]; // Add logs for this specific test
}

const TestResultItem: React.FC<TestResultItemDetails> = ({ 
  index, 
  input, 
  expected, 
  actual, 
  passed,
  assertions = 2,
  logs
}) => {
  const safeLogs = logs || [];
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLogs = safeLogs.length > 0;
  
  // Debug logging
  useEffect(() => {
    console.log(`TestResultItem ${index} received logs:`, { 
      hasLogs, 
      logsCount: safeLogs.length,
      logsSample: safeLogs.slice(0, 2)
    });
  }, [index, safeLogs, hasLogs]);
  
  // FORCE expansion for testing
  useEffect(() => {
    setIsExpanded(true);
  }, []);
  
  // Auto-expand failed tests and tests with logs
  useEffect(() => {
    if (!passed || hasLogs) {
      setIsExpanded(true);
    }
  }, [passed, hasLogs]);
  
  // DEBUG flag for testing
  const showLogsRegardless = true;
  
  return (
    <div className={`border-b border-gray-700 py-2 px-4 hover:bg-gray-800/50 ${!passed ? 'bg-red-900/10' : ''} ${hasLogs ? 'bg-blue-900/5' : ''}`}>
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
        
        {/* Add indicator if logs exist */}
        {hasLogs && (
          <div className="flex items-center text-blue-400 text-xs font-medium bg-blue-900/20 px-2 py-0.5 rounded">
            <Terminal className="w-3 h-3 mr-1" />
            {safeLogs.length} log{safeLogs.length !== 1 ? 's' : ''}
          </div>
        )}
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
              
              {/* Simple logs display - always show if logs exist */}
              {hasLogs && (
                <div className="mt-3">
                  <div className="text-gray-400 mb-1 flex items-center">
                    <div className="w-4 h-4 mr-1" />
                    Console Logs:
                  </div>
                  <div className="bg-gray-800 p-2 rounded border border-gray-700 overflow-x-auto">
                    {safeLogs.map((log, i) => (
                      <div key={i} className="text-blue-300 font-mono text-sm py-1 break-all">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

export default TestResultItem; 