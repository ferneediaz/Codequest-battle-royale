import { DEFAULT_AVATAR } from '../constants/battleConstants';

// Create avatar URL from email
export const getAvatarUrl = (email: string) => {
  // Generate a unique avatar based on email
  return `${DEFAULT_AVATAR}?seed=${encodeURIComponent(email)}`;
};

// Format the remaining time for display
export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Calculate the remaining time for freeze effect
export const getFreezeRemainingTime = (frozenEndTime: number | null) => {
  if (!frozenEndTime) return 0;
  const remainingMs = Math.max(0, frozenEndTime - Date.now());
  return Math.ceil(remainingMs / 1000);
};

// Define language extensions for code editor
export const languageMap: Record<string, any> = {
  javascript: () => import('@codemirror/lang-javascript').then(mod => mod.javascript({ jsx: true })),
  python: () => import('@codemirror/lang-python').then(mod => mod.python())
}; 