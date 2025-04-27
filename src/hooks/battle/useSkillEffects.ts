import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BattleState } from '../../constants/battleConstants';
import { Skill } from '../../components/battle-arena/DraggableSkill';

interface UseSkillEffectsProps {
  userEmail: string | undefined;
  sessionId: string | null;
  battleState: BattleState;
}

interface SkillEffectsResult {
  editorFrozen: boolean;
  setEditorFrozen: (frozen: boolean) => void;
  editorFrozenEndTime: number | null;
  setEditorFrozenEndTime: (time: number | null) => void;
  availableSkills: Skill[];
  setAvailableSkills: (skills: Skill[]) => void;
  debugMsg: string;
  setDebugMsg: (msg: string) => void;
  useSkill: (skillName: string, targetUser: string) => void;
  handleFreezeEffect: (fromUser: string) => void;
  handleChaosEffect: (fromUser: string, userCode: string, setUserCode: (code: string) => void) => void;
}

export const useSkillEffects = ({ 
  userEmail, 
  sessionId,
  battleState 
}: UseSkillEffectsProps): SkillEffectsResult => {
  const [editorFrozen, setEditorFrozen] = useState(false);
  const [editorFrozenEndTime, setEditorFrozenEndTime] = useState<number | null>(null);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([
    { name: 'Freeze', icon: '❄️', available: true },
    { name: 'Code Chaos', icon: '💥', available: true }
  ]);
  const [debugMsg, setDebugMsg] = useState('');
  
  // Reset skills when battle state changes
  useEffect(() => {
    if (battleState === 'battle_room') {
      setAvailableSkills([
        { name: 'Freeze', icon: '❄️', available: true },
        { name: 'Code Chaos', icon: '💥', available: true }
      ]);
    }
  }, [battleState]);
  
  // Use a skill
  const useSkill = (skillName: string, targetUser: string) => {
    if (!userEmail || !sessionId || !targetUser) return;
    
    try {
      console.log(`Using skill ${skillName} on ${targetUser}`);
      
      // Mark the skill as unavailable
      setAvailableSkills(prev => prev.map(skill => 
        skill.name === skillName ? { ...skill, available: false } : skill
      ));
      
      // Create a channel specific to the target user
      const targetChannelId = `battle_skills_${targetUser.replace('@', '_at_')}_${sessionId}`;
      
      console.log(`Broadcasting skill effect to channel: ${targetChannelId}`);
      
      const skillChannel = supabase.channel(targetChannelId, {
        config: {
          broadcast: { self: true }
        }
      });
      
      skillChannel.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') {
          console.log('Skill channel status:', status);
          return;
        }
        
        // Broadcast the skill effect
        await skillChannel.send({
          type: 'broadcast',
          event: 'skill_used',
          payload: {
            skill_name: skillName,
            from_user: userEmail,
            target_user: targetUser,
            timestamp: new Date().toISOString()
          }
        });
        
        console.log('Skill effect broadcast sent');
        
        // Update debug message
        setDebugMsg(`You used ${skillName} on ${targetUser.split('@')[0]}!`);
        
        // Unsubscribe after sending to avoid keeping too many channels open
        setTimeout(() => {
          skillChannel.unsubscribe();
        }, 1000);
      });
    } catch (err) {
      console.error('Error using skill:', err);
      setDebugMsg('Error using skill');
    }
  };
  
  // Handle Freeze skill effect
  const handleFreezeEffect = (fromUser: string) => {
    try {
      console.log(`Handling Freeze effect from ${fromUser}`);
      
      // Set editor as frozen
      setEditorFrozen(true);
      
      // Set end time (15 seconds from now)
      const endTime = Date.now() + 15000;
      setEditorFrozenEndTime(endTime);
      
      // Set debug message
      setDebugMsg(`💀 ${fromUser} froze your editor for 15 seconds!`);
      
      // Set a timer to unfreeze
      setTimeout(() => {
        setEditorFrozen(false);
        setEditorFrozenEndTime(null);
        setDebugMsg(`Your editor has been unfrozen.`);
      }, 15000);
    } catch (err) {
      console.error('Error handling freeze effect:', err);
    }
  };
  
  // Handle Code Chaos skill effect
  const handleChaosEffect = (fromUser: string, userCode: string, setUserCode: (code: string) => void) => {
    try {
      console.log(`Handling Code Chaos effect from ${fromUser}`);
      
      // Scramble the code
      const codeLines = userCode.split('\n');
      
      // Shuffle the lines
      for (let i = codeLines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [codeLines[i], codeLines[j]] = [codeLines[j], codeLines[i]];
      }
      
      // Set the scrambled code
      setUserCode(codeLines.join('\n'));
      
      // Set debug message
      setDebugMsg(`😵 ${fromUser} used Code Chaos on your editor!`);
    } catch (err) {
      console.error('Error handling code chaos effect:', err);
    }
  };
  
  return {
    editorFrozen,
    setEditorFrozen,
    editorFrozenEndTime,
    setEditorFrozenEndTime,
    availableSkills,
    setAvailableSkills,
    debugMsg,
    setDebugMsg,
    useSkill,
    handleFreezeEffect,
    handleChaosEffect
  };
}; 