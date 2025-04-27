/**
 * Problem Images Utility
 * 
 * This utility provides text-based descriptions of common LeetCode problem images
 * since external images don't display directly in our coding environment.
 */

interface ProblemImage {
  id: string;
  description: string;
  asciiDiagram?: string;
}

// Collection of common LeetCode problem images with text descriptions
const PROBLEM_IMAGES: ProblemImage[] = [
  {
    id: "rev1ex1",
    description: "Reverse Linked List Example 1: Shows a linked list with values [1,2,3,4,5] being reversed to [5,4,3,2,1].",
    asciiDiagram: 
`Original List:
1 -> 2 -> 3 -> 4 -> 5 -> NULL

Reversed List:
5 -> 4 -> 3 -> 2 -> 1 -> NULL`
  },
  {
    id: "rev1ex2",
    description: "Reverse Linked List Example 2: Shows a linked list with values [1,2] being reversed to [2,1].",
    asciiDiagram:
`Original List:
1 -> 2 -> NULL

Reversed List:
2 -> 1 -> NULL`
  },
  // Add more problem images as needed
];

/**
 * Get a description of a LeetCode problem image by its ID
 * @param imageId The ID of the image (usually from the image filename)
 * @returns The image description and ASCII diagram if available
 */
export function getProblemImageDescription(imageId: string): ProblemImage | undefined {
  // Extract the ID from a full URL if needed
  let id = imageId;
  if (imageId.includes('/')) {
    const parts = imageId.split('/');
    id = parts[parts.length - 1].split('.')[0];
  }
  
  return PROBLEM_IMAGES.find(img => img.id === id);
}

/**
 * Display a problem image description in the console
 * @param imageUrl The URL or ID of the image
 */
export function displayProblemImage(imageUrl: string): void {
  const image = getProblemImageDescription(imageUrl);
  
  if (!image) {
    console.log(`Image not found: ${imageUrl}`);
    return;
  }
  
  console.log(`\n📷 Image: ${image.id}`);
  console.log(`📝 ${image.description}\n`);
  
  if (image.asciiDiagram) {
    console.log(image.asciiDiagram);
    console.log();
  }
}

export default {
  getProblemImageDescription,
  displayProblemImage
}; 