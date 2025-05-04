import React from 'react';
import { Shield, Crown, Sword } from "lucide-react";

interface CodeQuestLogoProps {
  className?: string;
  titleClassName?: string;
  iconSize?: number;
  showIcons?: boolean;
}

const CodeQuestLogo: React.FC<CodeQuestLogoProps> = ({ 
  className = '', 
  titleClassName = 'text-4xl font-bold text-white',
  iconSize = 24,
  showIcons = true
}) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {showIcons && (
        <div className="flex justify-center gap-4 mb-2">
          <Shield className={`w-${iconSize} h-${iconSize} text-indigo-400 animate-jump`} />
          <Crown className={`w-${iconSize} h-${iconSize} text-yellow-500 animate-jump`} style={{ animationDelay: "0.3s" }} />
          <Sword className={`w-${iconSize} h-${iconSize} text-blue-400 animate-jump`} style={{ animationDelay: "0.6s" }} />
        </div>
      )}
      <h1 className={titleClassName}>
        CodeQuest Battles
      </h1>
    </div>
  );
};

export default CodeQuestLogo; 