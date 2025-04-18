import React from 'react'
import ReactDOM from 'react-dom/client'
import * as ReactDOMStandard from 'react-dom'
import App from './App'
import './styles/global.css'
import './index.css'

console.log("Mounting React app...");

// Define error boundary types
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Simple error boundary component with proper TypeScript types
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#ffdddd', color: '#ff0000', margin: '20px' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error?.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element. Make sure there is a div with id 'root' in your HTML.");
  }
  
  // Remove any existing content to ensure we're starting fresh
  if (rootElement.innerHTML !== '') {
    // Clear the fallback content if it exists
    const fallbackContent = rootElement.querySelector('.fallback-content');
    if (fallbackContent) {
      rootElement.removeChild(fallbackContent);
    }
  }
  
  // Simple approach - just render directly to the element
  const app = (
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  
  // Try to create root, and fall back to legacy render if needed
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(app);
  } catch (e) {
    console.warn("Error creating root, falling back to legacy render:", e);
    // @ts-ignore - Ignore TypeScript errors for legacy ReactDOM.render
    ReactDOMStandard.render(app, rootElement);
  }
  
  console.log("React app mounted successfully.");
} catch (error) {
  console.error("Failed to mount React app:", error);
  document.body.innerHTML = `
    <div style="padding: 20px; background-color: #ffdddd; color: #ff0000; margin: 20px;">
      <h2>Failed to load the application</h2>
      <p>${error instanceof Error ? error.message : String(error)}</p>
    </div>
  `;
} 