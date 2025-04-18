import React, { useMemo } from 'react';
import { codeSnippets } from '../data/codeSnippets';

// Map snippets to their categories based on function names or content
const SNIPPET_CATEGORIES: Record<string, string> = {
  'binarySearch': 'Binary Search Castle',
  'quickSort': 'Sorting Sanctuary',
  'mergeSort': 'Sorting Sanctuary',
  'bubbleSort': 'Sorting Sanctuary',
  'insertionSort': 'Sorting Sanctuary',
  'heapSort': 'Sorting Sanctuary',
  'dfs': 'Graph Adventures',
  'bfs': 'Graph Adventures',
  'dijkstra': 'Graph Adventures',
  'kruskal': 'Graph Adventures',
  'prim': 'Graph Adventures',
  'twoSum': 'Forest of Arrays',
  'maxSubArray': 'Forest of Arrays',
  'containsDuplicate': 'Forest of Arrays',
  'mergeSortedArrays': 'Forest of Arrays',
  'hashMap': 'Hashmap Dungeons',
  'hashTable': 'Hashmap Dungeons',
  'lruCache': 'Hashmap Dungeons',
  'linkedList': 'Linked List Gardens',
  'tree': 'Tree of Wisdom',
  'binaryTree': 'Tree of Wisdom',
  'inorderTraversal': 'Tree of Wisdom',
  'preorderTraversal': 'Tree of Wisdom',
  'postorderTraversal': 'Tree of Wisdom',
  'stack': 'Stack & Queue Tavern',
  'queue': 'Stack & Queue Tavern',
  'palindrome': 'String Sorcery',
  'kmp': 'String Sorcery',
  'stringMatch': 'String Sorcery',
  'fibonacci': 'Dynamic Programming Peaks',
  'knapsack': 'Dynamic Programming Peaks',
  'lcs': 'Dynamic Programming Peaks',
};

interface FloatingCodeBackgroundProps {
  excludedTopics?: string[];
  opacity?: number;
}

const FloatingCodeBackground: React.FC<FloatingCodeBackgroundProps> = ({ 
  excludedTopics = [], 
  opacity = 0.2 
}) => {
  // Filter snippets to exclude those from the current topic
  const filteredSnippets = useMemo(() => {
    return codeSnippets.filter(snippet => {
      // Extract the first line which often contains the function name
      const firstLine = snippet.code.split('\n')[0];
      
      // Try to determine the category based on function name or content
      let category = null;
      
      // Check if any category keywords match
      for (const [keyword, cat] of Object.entries(SNIPPET_CATEGORIES)) {
        if (firstLine.includes(keyword)) {
          category = cat;
          break;
        }
      }
      
      // If we couldn't determine a category or it's not in the excluded list, show it
      return !category || !excludedTopics.includes(category);
    });
  }, [excludedTopics]);

  if (filteredSnippets.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {filteredSnippets.map((snippet, index) => {
        // Generate random position if not provided
        const top = snippet.top || `${Math.random() * 100}%`;
        const left = snippet.left || `${Math.random() * 100}%`;
        const delay = snippet.delay || `${Math.random() * 5}s`;
        
        return (
          <div
            key={index}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
            style={{
              top,
              left,
              opacity,
              animation: `float-code ${8 + (index % 7)}s infinite ease-in-out`,
              animationDelay: delay
            }}
          >
            <pre className="text-xs font-mono bg-gray-900/50 p-2 rounded-lg backdrop-blur-sm">
              <code>{snippet.code}</code>
            </pre>
          </div>
        );
      })}
    </div>
  );
};

export default FloatingCodeBackground; 