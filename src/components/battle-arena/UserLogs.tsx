import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';

interface UserLogsProps {
  logs: string[];
  forceVisible?: boolean; // Add option to force visibility
}

const UserLogs: React.FC<UserLogsProps> = ({ logs, forceVisible = false }) => {
  const [isExpanded, setIsExpanded] = useState(forceVisible);

  // Debug output to console
  console.log("UserLogs component rendering with:", { 
    logsLength: logs?.length || 0, 
    forceVisible, 
    isExpanded,
    logsData: logs 
  });

  // Always render the component, even if there are no logs
  return (
    <div className="mb-4 user-logs-debug-wrapper">
      <div 
        className="flex items-center cursor-pointer p-3 bg-gray-900/60 text-sm rounded-md mb-1 user-logs-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
        <Terminal className="w-4 h-4 mr-2" />
        <span className="font-medium">Console Output</span>
        {logs?.length > 0 ? (
          <span className="ml-2 text-gray-400">({logs.length} {logs.length === 1 ? 'line' : 'lines'})</span>
        ) : (
          <span className="ml-2 text-gray-400">(no logs)</span>
        )}
      </div>
      
      {isExpanded && (
        <div className="bg-gray-900 rounded-md border border-gray-700 p-3 overflow-x-auto user-logs-content">
          <pre className="text-sm text-white font-mono whitespace-pre-wrap">
            {logs?.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="py-1">
                  {log}
                </div>
              ))
            ) : (
              <div className="py-1 text-gray-400">
                No console logs to display. Add console.log() statements to your code to see output here.
              </div>
            )}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UserLogs; 