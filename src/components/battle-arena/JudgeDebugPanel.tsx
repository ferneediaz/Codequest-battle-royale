import React from 'react';
import { Button } from "@/components/ui/button";
import { Copy } from 'lucide-react';

interface JudgeDebugPanelProps {
  originalCode?: string;
  modifiedCode?: string;
  response?: any;
  testInput?: string;
  rawStdout?: string;
  rawStderr?: string;
  debugLines?: string[];
}

/**
 * A component that displays Judge0 debug information in a clean way
 */
const JudgeDebugPanel: React.FC<JudgeDebugPanelProps> = ({
  originalCode,
  modifiedCode,
  response,
  testInput,
  rawStdout,
  rawStderr,
  debugLines = []
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Create a temporary toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center';
        toast.innerHTML = `
          <svg class="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          ${label} copied to clipboard!
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
    <div className="space-y-3 text-xs bg-gray-800 border border-gray-700 rounded p-3">
      {/* Response status */}
      {response && (
        <div className="bg-gray-900 p-2 rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="text-indigo-400 font-medium">Judge0 Response Status</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(JSON.stringify(response, null, 2), 'Response')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="text-green-300 whitespace-pre-wrap">
            {response.status ? `${response.status.id}: ${response.status.description}` : 'Status unavailable'}
          </pre>
        </div>
      )}

      {/* Raw stdout */}
      {rawStdout && (
        <div className="bg-gray-900 p-2 rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="text-indigo-400 font-medium">Raw stdout</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(rawStdout, 'stdout')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="text-white whitespace-pre-wrap overflow-auto max-h-32">
            {rawStdout}
          </pre>
        </div>
      )}

      {/* Raw stderr */}
      {rawStderr && (
        <div className="bg-gray-900 p-2 rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="text-indigo-400 font-medium">Raw stderr</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(rawStderr, 'stderr')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="text-red-300 whitespace-pre-wrap overflow-auto max-h-32">
            {rawStderr}
          </pre>
        </div>
      )}

      {/* Debug lines */}
      {debugLines && debugLines.length > 0 && (
        <div className="bg-gray-900 p-2 rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="text-indigo-400 font-medium">Debug Logs</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(debugLines.join('\n'), 'Debug logs')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="text-yellow-300 whitespace-pre-wrap overflow-auto max-h-32">
            {debugLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
};

export default JudgeDebugPanel; 