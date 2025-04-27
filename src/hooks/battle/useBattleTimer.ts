import { useState, useEffect, useRef } from 'react';

interface UseBattleTimerProps {
  initialSeconds: number;
}

interface TimerResult {
  timeRemaining: string;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
}

export const useBattleTimer = ({ initialSeconds }: UseBattleTimerProps): TimerResult => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<number | null>(null);
  
  // Format seconds to MM:SS
  const formatTime = (secs: number): string => {
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Start the timer
  const startTimer = () => {
    setIsActive(true);
  };
  
  // Stop the timer
  const stopTimer = () => {
    setIsActive(false);
  };
  
  // Reset the timer
  const resetTimer = () => {
    setSeconds(initialSeconds);
    setIsActive(false);
  };
  
  // Handle the timer countdown
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    intervalRef.current = window.setInterval(() => {
      setSeconds(prevSeconds => {
        if (prevSeconds <= 0) {
          stopTimer();
          return 0;
        }
        return prevSeconds - 1;
      });
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive]);
  
  return {
    timeRemaining: formatTime(seconds),
    startTimer,
    stopTimer,
    resetTimer
  };
}; 