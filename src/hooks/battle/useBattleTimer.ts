import { useState, useEffect, useCallback } from 'react';

interface UseBattleTimerOptions {
  initialSeconds?: number;
  autoStart?: boolean;
}

export const useBattleTimer = ({ initialSeconds = 300, autoStart = false }: UseBattleTimerOptions = {}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(initialSeconds);
  const [isActive, setIsActive] = useState<boolean>(autoStart);
  
  // Start the timer
  const startTimer = useCallback(() => {
    setIsActive(true);
  }, []);
  
  // Stop the timer
  const stopTimer = useCallback(() => {
    setIsActive(false);
  }, []);
  
  // Reset the timer
  const resetTimer = useCallback((newTime?: number) => {
    setTimeRemaining(newTime || initialSeconds);
    setIsActive(false);
  }, [initialSeconds]);
  
  // Handle the timer countdown
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    
    if (isActive && timeRemaining > 0) {
      timerId = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isActive, timeRemaining, stopTimer]);
  
  return {
    timeRemaining,
    startTimer,
    stopTimer,
    resetTimer,
    isActive
  };
}; 