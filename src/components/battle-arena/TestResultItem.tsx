import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Terminal, Bug } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { debugState } from '../../config/debugManager';
import JudgeDebugPanel from './JudgeDebugPanel';

export interface TestResultItemDetails {
  index: string | number;
  input?: string;
  expected?: string;
  actual?: string;
  passed: boolean;
  assertions?: number;
  logs?: string[]; // Add logs for this specific test
  debugInfo?: {
    originalCode?: string;
    modifiedCode?: string;
    fullResponse?: any;
    rawStdout?: string;
    rawStderr?: string;
    debugLines?: string[];
  };
}

const TestResultItem: React.FC<TestResultItemDetails> = ({ 
  index, 
  input, 
  expected, 
  actual, 
  passed,
  assertions = 2,
  logs,
  debugInfo
}) => {
  const safeLogs = logs || [];
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const hasLogs = safeLogs.length > 0;
  
  // Debug logging
  useEffect(() => {
    if (debugState.isEnabled()) {
      console.log(`TestResultItem ${index} received logs:`, { 
        hasLogs, 
        logsCount: safeLogs.length,
        logsSample: safeLogs.slice(0, 2)
      });
    }
  }, [index, safeLogs, hasLogs]);
  
  // Auto-expand failed tests and tests with logs
  useEffect(() => {
    if (!passed || hasLogs) {
      setIsExpanded(true);
    }
  }, [passed, hasLogs]);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Create a temporary toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center';
        toast.innerHTML = `
          <svg class="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          Copied to clipboard!
        `;
        document.body.appendChild(toast);
        
        // Remove the toast after 2 seconds
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transition = 'opacity 0.5s';
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 500);
        }, 2000);
      })
      .catch(err => {
        console.error('Error copying to clipboard:', err);
      });
  };

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
          
          {/* Development Debug Panel */}
          {debugState.isEnabled() && (
            <div className="mt-4 border-t-2 border-indigo-700 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-indigo-400 font-medium flex items-center">
                  <Bug className="w-4 h-4 mr-1" /> Debug Tools
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-indigo-700/50 text-white border-indigo-500 hover:bg-indigo-800"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? 'Hide Judge0 Debug Data' : 'Show Judge0 Debug Data'}
                </Button>
              </div>
              
              {showDebug && debugInfo && (
                <JudgeDebugPanel
                  originalCode={debugInfo.originalCode || ''}
                  modifiedCode={debugInfo.modifiedCode}
                  response={debugInfo.fullResponse}
                  testInput={debugInfo.fullResponse?._debug?.stdin}
                  rawStdout={debugInfo.rawStdout}
                  rawStderr={debugInfo.rawStderr}
                  debugLines={debugInfo.debugLines}
                />
              )}
              
              {showDebug && !debugInfo && (
                <div className="p-4 bg-gray-800 rounded border border-gray-700">
                  <div className="text-yellow-400 mb-2">
                    No Judge0 debug data available for this test.
                  </div>
                  
                  <div className="mt-4 border border-gray-700 rounded p-3">
                    <h4 className="text-sm font-medium text-white mb-2">Test Information</h4>
                    <pre className="text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {JSON.stringify({
                        input,
                        expected,
                        actual,
                        passed,
                        logs: safeLogs
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestResultItem; 