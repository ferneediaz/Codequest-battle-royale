import React, { useEffect, useState } from 'react';
import { getProblemImageDescription } from '../utils/problemImages';
import './ProblemDescription.css';

interface ProblemDescriptionProps {
  description: string;
}

const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ description }) => {
  const [processedDescription, setProcessedDescription] = useState<string>(description);

  useEffect(() => {
    // Process the description to handle external image links
    let processed = description;
    
    // Replace image URLs with text descriptions
    const imageUrlRegex = /!\[.*?\]\((https:\/\/assets\.leetcode\.com\/uploads\/.*?)\)/g;
    
    processed = processed.replace(imageUrlRegex, (match, imageUrl) => {
      const image = getProblemImageDescription(imageUrl);
      
      if (image && image.asciiDiagram) {
        return `
<div class="problem-image-replacement">
  <h4>Image: ${image.id}</h4>
  <p>${image.description}</p>
  <pre>${image.asciiDiagram}</pre>
</div>
`;
      }
      
      // If no replacement found, keep the original but add a warning
      return `${match} <em>(Note: External images may not display properly)</em>`;
    });
    
    setProcessedDescription(processed);
  }, [description]);

  return (
    <div className="problem-description">
      <div dangerouslySetInnerHTML={{ __html: processedDescription }} />
    </div>
  );
};

export default ProblemDescription; 