import React from 'react';
import '../../styles/confetti.css';

interface ConfettiProps {
  active: boolean;
}

const Confetti: React.FC<ConfettiProps> = ({ active }) => {
  if (!active) return null;
  
  return (
    <div className="confetti-container">
      {Array.from({ length: 100 }).map((_, i) => (
        <div 
          key={i} 
          className="confetti" 
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)]
          }}
        />
      ))}
    </div>
  );
};

export default Confetti; 