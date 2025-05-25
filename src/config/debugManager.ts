/**
 * Debug state configuration for development environments
 * This file provides a central way to manage debug modes across the application
 */

// Storage key for persisting debug state
const DEBUG_STATE_KEY = 'codequest_debug_enabled';

/**
 * Debug state manager for controlling debug features
 */
class DebugStateManager {
  private debugMode: boolean;
  private keyboardListenerAdded: boolean = false;

  constructor() {
    // Initialize debug mode from URL or localStorage
    this.debugMode = this.initFromUrlOrStorage();
    
    // Log initial state in development
    if (import.meta.env.DEV) {
      console.log(`Debug mode is ${this.debugMode ? 'enabled' : 'disabled'}`);
    }
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Initialize debug mode from URL parameters or localStorage
   */
  private initFromUrlOrStorage(): boolean {
    try {
      // Check URL parameters first
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const debugParam = urlParams.get('debug');
        
        if (debugParam === 'true') {
          console.log('🐞 Debug mode enabled via URL parameter');
          localStorage.setItem(DEBUG_STATE_KEY, 'true');
          return true;
        } else if (debugParam === 'false') {
          console.log('🐞 Debug mode disabled via URL parameter');
          localStorage.setItem(DEBUG_STATE_KEY, 'false');
          return false;
        }
      }
      
      // Then check localStorage
      const storedState = localStorage.getItem(DEBUG_STATE_KEY);
      return storedState ? storedState === 'true' : import.meta.env.DEV;
    } catch (error) {
      console.error('Error initializing debug state:', error);
      return import.meta.env.DEV;
    }
  }

  /**
   * Set up keyboard shortcuts for toggling debug mode
   */
  private setupKeyboardShortcuts(): void {
    if (this.keyboardListenerAdded || typeof window === 'undefined') return;
    
    window.addEventListener('keydown', (event) => {
      // Ctrl+Shift+D to toggle debug mode
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        this.toggle();
      }
    });
    
    this.keyboardListenerAdded = true;
  }

  /**
   * Check if debug mode is enabled
   */
  isEnabled(): boolean {
    return this.debugMode;
  }

  /**
   * Initialize debug state - can be called from App component to ensure setup
   */
  initialize(): void {
    // This is mostly a no-op since we do initialization in the constructor,
    // but it's provided for backward compatibility with previous code
    if (!this.keyboardListenerAdded) {
      this.setupKeyboardShortcuts();
    }
    return;
  }

  /**
   * Enable debug mode
   */
  enable(): void {
    this.debugMode = true;
    localStorage.setItem(DEBUG_STATE_KEY, 'true');
    console.log('Debug mode enabled');
  }

  /**
   * Disable debug mode
   */
  disable(): void {
    this.debugMode = false;
    localStorage.setItem(DEBUG_STATE_KEY, 'false');
    console.log('Debug mode disabled');
  }

  /**
   * Toggle debug mode
   */
  toggle(): void {
    this.debugMode = !this.debugMode;
    localStorage.setItem(DEBUG_STATE_KEY, this.debugMode.toString());
    console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
    
    // Reload page to apply changes
    if (import.meta.env.DEV) {
      window.location.reload();
    }
  }
}

// Export singleton instance
export const debugState = new DebugStateManager(); 