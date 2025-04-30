import React, { useEffect, useState } from 'react';
import { getProblemImageDescription } from '../utils/problemImages';
import './ProblemDescription.css';

interface ProblemDescriptionProps {
  description: string;
}

interface ImageReplacement {
  id: string;
  description: string;
  asciiDiagram: string;
}

const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ description }) => {
  const [contentBlocks, setContentBlocks] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    // Process the description to handle external image links
    const blocks: React.ReactNode[] = [];
    let remainingText = description;
    
    // Replace image URLs with text descriptions
    const imageUrlRegex = /!\[.*?\]\((https:\/\/assets\.leetcode\.com\/uploads\/.*?)\)/g;
    let match;
    let lastIndex = 0;
    
    while ((match = imageUrlRegex.exec(remainingText)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        blocks.push(<div key={`text-${lastIndex}`}>{remainingText.substring(lastIndex, match.index)}</div>);
      }
      
      const [fullMatch, imageUrl] = match;
      const image = getProblemImageDescription(imageUrl);
      
      if (image && image.asciiDiagram) {
        blocks.push(
          <div className="problem-image-replacement" key={`img-${match.index}`}>
            <h4>Image: {image.id}</h4>
            <p>{image.description}</p>
            <pre>{image.asciiDiagram}</pre>
          </div>
        );
      } else {
        // If no replacement found, add a warning
        blocks.push(
          <div key={`img-${match.index}`}>
            {fullMatch} <em>(Note: External images may not display properly)</em>
          </div>
        );
      }
      
      lastIndex = match.index + fullMatch.length;
    }
    
    // Add any remaining text
    if (lastIndex < remainingText.length) {
      blocks.push(<div key={`text-${lastIndex}`}>{remainingText.substring(lastIndex)}</div>);
    }
    
    setContentBlocks(blocks);
  }, [description]);

  return (
    <div className="problem-description">
      {contentBlocks}
    </div>
  );
};

export default ProblemDescription; 