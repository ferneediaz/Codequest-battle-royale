export interface CodeSnippet {
  code: string;
  top: string;
  left: string;
  delay: string;
}

export const codeSnippets: CodeSnippet[] = [
  {
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  const left = [];
  const right = [];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < pivot) left.push(arr[i]);
    else right.push(arr[i]);
  }
  return [...quickSort(left), pivot, ...quickSort(right)];
}`,
    top: '5%',
    left: '10%',
    delay: '0s'
  },
  {
    code: `const binarySearch = (arr, target) => {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
};`,
    top: '15%',
    left: '70%',
    delay: '1s'
  },
  {
    code: `class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
  }

  append(value) {
    const newNode = new Node(value);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }
  }
}`,
    top: '30%',
    left: '20%',
    delay: '2s'
  },
  {
    code: `const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};`,
    top: '45%',
    left: '60%',
    delay: '3s'
  },
  {
    code: `const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};`,
    top: '60%',
    left: '30%',
    delay: '4s'
  },
  {
    code: `const throttle = (fn, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};`,
    top: '75%',
    left: '80%',
    delay: '5s'
  },
  {
    code: `const deepClone = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  const clone = Array.isArray(obj) ? [] : {};
  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
};`,
    top: '85%',
    left: '40%',
    delay: '6s'
  },
  {
    code: `const flattenArray = (arr) => {
  return arr.reduce((flat, toFlatten) => {
    return flat.concat(Array.isArray(toFlatten) ? flattenArray(toFlatten) : toFlatten);
  }, []);
};`,
    top: '25%',
    left: '50%',
    delay: '7s'
  },
  {
    code: `const findLongestSubstring = (str) => {
  let longest = 0;
  let seen = {};
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    if (seen[char]) {
      start = Math.max(start, seen[char]);
    }
    longest = Math.max(longest, i - start + 1);
    seen[char] = i + 1;
  }
  return longest;
};`,
    top: '50%',
    left: '15%',
    delay: '8s'
  },
  {
    code: `const isPalindrome = (str) => {
  const cleanStr = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleanStr === cleanStr.split("").reverse().join("");
};`,
    top: '70%',
    left: '90%',
    delay: '9s'
  },
  {
    code: `const mergeSort = (arr) => {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
};

const merge = (left, right) => {
  let result = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] < right[j]) {
      result.push(left[i]);
      i++;
    } else {
      result.push(right[j]);
      j++;
    }
  }
  return [...result, ...left.slice(i), ...right.slice(j)];
};`,
    top: '10%',
    left: '80%',
    delay: '10s'
  },
  {
    code: `const fibonacci = (n) => {
  if (n <= 1) return n;
  let prev = 0;
  let curr = 1;
  for (let i = 2; i <= n; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
};`,
    top: '35%',
    left: '40%',
    delay: '11s'
  },
  {
    code: `const twoSum = (nums, target) => {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
};`,
    top: '65%',
    left: '60%',
    delay: '12s'
  },
  {
    code: `const reverseLinkedList = (head) => {
  let prev = null;
  let current = head;
  while (current) {
    const next = current.next;
    current.next = prev;
    prev = current;
    current = next;
  }
  return prev;
};`,
    top: '20%',
    left: '30%',
    delay: '13s'
  },
  {
    code: `const isValidParentheses = (s) => {
  const stack = [];
  const map = {
    '(': ')',
    '[': ']',
    '{': '}'
  };
  for (let char of s) {
    if (map[char]) {
      stack.push(char);
    } else {
      if (stack.length === 0 || map[stack.pop()] !== char) {
        return false;
      }
    }
  }
  return stack.length === 0;
};`,
    top: '80%',
    left: '20%',
    delay: '14s'
  }
]; 