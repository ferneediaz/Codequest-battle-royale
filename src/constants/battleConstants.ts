// Battle categories and emojis
export const BATTLE_CATEGORIES = [
  "Forest of Arrays",
  "Hashmap Dungeons",
  "Binary Search Castle",
  "Linked List Gardens",
  "Tree of Wisdom",
  "Graph Adventures",
  "Dynamic Programming Peaks",
  "Stack & Queue Tavern",
  "String Sorcery",
  "Sorting Sanctuary",
] as const;

// Add emoji mapping
export const CATEGORY_EMOJIS: Record<string, string> = {
  "Forest of Arrays": "🌲",
  "Hashmap Dungeons": "🗝️",
  "Binary Search Castle": "🏰",
  "Linked List Gardens": "🌱",
  "Tree of Wisdom": "🌳",
  "Graph Adventures": "🗺️",
  "Dynamic Programming Peaks": "🏔️",
  "Stack & Queue Tavern": "🍺",
  "String Sorcery": "✨",
  "Sorting Sanctuary": "📊",
};

// Define item types for drag and drop
export const ItemTypes = {
  SKILL: 'skill'
};

// Type definitions
export type BattleCategory = typeof BATTLE_CATEGORIES[number];
export type SetupStatus = 'unknown' | 'checking' | 'not_setup' | 'setting_up' | 'setup_success' | 'setup_error' | 'ready' | 'verified';
export type BattleState = 'lobby' | 'topic_selection' | 'battle_room';

// Define language extensions
export const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/pixel-art-neutral/svg";

// Skill gibberish options for chaos effect
export const CODE_GIBBERISH = [
  '/* WHY IS THIS NOT WORKING?! */',
  '// WHAT HAPPENED HERE',
  'console.error("CHAOS REIGNS");',
  '/* ¯\\_(ツ)_/¯ */',
  'function oops() { return Math.random() < 0.5; }',
  '// TODO: Fix this mess later',
  '/* ERROR: Brain.exe has stopped working */',
  'let chaos = true; // or is it false?',
  'debugger; // surprise debugging!',
  'throw new Error("Good luck figuring this out!");'
]; 