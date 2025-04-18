import React from 'react';
import secondSpaceLogo from '../assets/secondspacelogo.svg';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={`flex justify-center ${className || ''}`}>
      <img 
        src={secondSpaceLogo} 
        alt="Second Space Logo" 
        className="h-20 w-auto"
        style={{ filter: 'invert(1)' }} 
      />
    </div>
  );
};

export default Logo; 