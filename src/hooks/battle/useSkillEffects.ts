import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CODE_GIBBERISH } from '../../constants/battleConstants';

interface UseSkillEffectsProps {
  userEmail: string | undefined;
  sessionId: string | null;
  battleState: string;
}

export const useSkillEffects = ({ userEmail, sessionId, battleState }: UseSkillEffectsProps) => {
  const [editorFrozen, setEditorFrozen] = useState(false);
  const [editorFrozenEndTime, setEditorFrozenEndTime] = useState<number | null>(null);
  const [availableSkills, setAvailableSkills] = useState<{name: string, icon: string, available: boolean}[]>([
    { name: 'Freeze', icon: '❄️', available: true },
    { name: 'Code Chaos', icon: '💥', available: true },
  ]);
  const [debugMsg, setDebugMsg] = useState<string | null>(null);
  
  // Function to use a skill against another player
  const useSkill = async (skillName: string, targetEmail: string) => {
    if (!userEmail) return;
    
    // Find the skill and mark it as unavailable
    setAvailableSkills(prev => 
      prev.map(skill => 
        skill.name === skillName ? { ...skill, available: false } : skill
      )
    );
    
    // Send the skill effect via the database
    try {
      // Create a skill effect record
      await supabase
        .from('battle_skill_effects')
        .insert({
          from_user: userEmail,
          target_user: targetEmail,
          skill_name: skillName,
          applied_at: new Date().toISOString(),
          battle_session_id: sessionId || 'default-battle-session'
        });
        
      // Also broadcast the effect via realtime
      const channel = supabase.channel('battle_skills', {
        config: {
          broadcast: { self: false }
        }
      });
      
      // First subscribe, then send after subscription is confirmed
      channel.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') {
          console.log('Channel subscription status:', status);
          return;
        }
        
        console.log('Battle skills channel subscribed, sending skill effect');
        
        // Now that we're subscribed, broadcast the message
        await channel.send({
          type: 'broadcast',
          event: 'skill_used',
          payload: {
            from_user: userEmail,
            target_user: targetEmail,
            skill_name: skillName,
            applied_at: new Date().toISOString()
          }
        });
        
        console.log(`Skill ${skillName} broadcast sent to ${targetEmail}`);
        
        // Unsubscribe after sending to avoid keeping too many channels open
        setTimeout(() => {
          channel.unsubscribe();
        }, 1000);
      });
      
      setDebugMsg(`Used ${skillName} on ${targetEmail.split('@')[0]}!`);
    } catch (error) {
      console.error('Error using skill:', error);
      setDebugMsg('Failed to use skill - try again');
      
      // Reset the skill to available
      setAvailableSkills(prev => 
        prev.map(skill => 
          skill.name === skillName ? { ...skill, available: true } : skill
        )
      );
    }
  };
  
  // Handle skill effects
  const handleFreezeEffect = (fromUser: string) => {
    // Freeze the editor for 10 seconds
    setEditorFrozen(true);
    setEditorFrozenEndTime(Date.now() + 10000); // 10 seconds from now
    setDebugMsg(`❄️ Your editor has been frozen by ${fromUser} for 10 seconds!`);
    
    // Create a countdown to unfreeze
    const unfreezeTimer = setTimeout(() => {
      setEditorFrozen(false);
      setEditorFrozenEndTime(null);
      setDebugMsg('Your editor has been unfrozen');
    }, 10000);
    
    return () => clearTimeout(unfreezeTimer);
  };
  
  const handleChaosEffect = (fromUser: string, userCode: string, setUserCode: (code: string) => void) => {
    // Insert random gibberish at random positions in the code
    setDebugMsg(`💥 ${fromUser} cast Code Chaos on your editor!`);
    
    // Save the current code
    const currentCode = userCode;
    
    // Pick 2-3 random pieces of gibberish
    const numGibberish = Math.floor(Math.random() * 2) + 2;
    let newCode = currentCode;
    
    for (let i = 0; i < numGibberish; i++) {
      // Get a random gibberish item
      const randomGibberish = CODE_GIBBERISH[Math.floor(Math.random() * CODE_GIBBERISH.length)];
      
      // Split the code into lines
      const lines = newCode.split('\n');
      
      // Pick a random line to insert the gibberish
      const randomLineIndex = Math.floor(Math.random() * lines.length);
      
      // Insert the gibberish
      lines.splice(randomLineIndex, 0, randomGibberish);
      
      // Join the lines back together
      newCode = lines.join('\n');
    }
    
    // Update the code with gibberish
    setUserCode(newCode);
  };
  
  // Listen for skill effects applied to this user
  useEffect(() => {
    if (!userEmail || !sessionId) return;
    
    console.log('Setting up skill effects listener...');
    
    // Create a channel to receive skill updates
    const skillsChannel = supabase.channel('battle_skills_listener', {
      config: {
        broadcast: { self: false } // Don't receive your own broadcasts
      }
    });
    
    // Subscribe to skill events
    const subscription = skillsChannel
      .on('broadcast', { event: 'skill_used' }, (payload) => {
        console.log('Received skill effect:', payload);
        
        // Only used for validation against re-renders - implementations in the component
      })
      .subscribe();
      
    return () => {
      skillsChannel.unsubscribe();
    };
  }, [userEmail, sessionId, battleState]);
  
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