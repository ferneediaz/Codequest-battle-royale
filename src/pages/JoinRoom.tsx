import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import FloatingCodeBackground from '@/components/FloatingCodeBackground';
import { Loader2 } from "lucide-react";
import CodeQuestLogo from "@/components/CodeQuestLogo";

const JoinRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if room exists
  useEffect(() => {
    const checkRoom = async () => {
      if (!roomId) {
        setError("No room ID provided");
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Clean the room ID in case there are URL artifacts
        const cleanRoomId = roomId.replace(/[^a-zA-Z0-9]/g, '');
        
        // We're now looking for a battle_sessions entry with the room ID prefix
        let sessionId = `room_${cleanRoomId}`;
        
        console.log("Looking for session with ID:", sessionId);
        
        // Try to get the room first
        let { data, error } = await supabase
          .from('battle_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        
        // If not found with room_ prefix, try without prefix as fallback  
        if (error && error.code === 'PGRST116') {
          console.log("Room not found with prefix, trying without prefix");
          sessionId = cleanRoomId;
          
          const result = await supabase
            .from('battle_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
            
          data = result.data;
          error = result.error;
        }
          
        if (error) {
          console.error('Error fetching room:', error);
          setError("Room not found");
        } else if (data) {
          // Parse the metadata from the current_category field
          try {
            const metadataStr = data.current_category;
            const metadata = metadataStr ? JSON.parse(metadataStr) : null;
            
            setRoomInfo({
              id: cleanRoomId,
              name: metadata?.roomName || "Battle Room",
              created_by: metadata?.createdBy || data.connected_emails?.[0] || "Unknown",
              game_mode: metadata?.gameMode || "battle_royale"
            });
          } catch (parseErr) {
            console.error('Error parsing room metadata:', parseErr);
            setRoomInfo({
              id: cleanRoomId,
              name: "Battle Room",
              created_by: data.connected_emails?.[0] || "Unknown",
              game_mode: "battle_royale"
            });
          }
        } else {
          setError("Room not found");
        }
      } catch (err) {
        console.error('Error checking room:', err);
        setError("Failed to check room status");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkRoom();
  }, [roomId]);
  
  // Join the room after authentication
  useEffect(() => {
    if (user && roomInfo && !isLoading) {
      // Navigate to battle with room ID
      navigate(`/battle/${roomId}`);
    }
  }, [user, roomInfo, isLoading, navigate, roomId]);
  
  // Handle sign in click
  const handleSignIn = async (provider: 'github' | 'google') => {
    await signIn(provider);
    // The auth context will handle redirecting after successful sign in
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <Card className="p-8 w-full max-w-md mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Checking room status...</h2>
          <p className="text-gray-400">Please wait while we verify the room</p>
        </Card>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <Card className="p-8 w-full max-w-md mx-auto text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>
            Return to Homepage
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 relative">
      {/* Floating Code Background */}
      <FloatingCodeBackground opacity={0.2} />

      {/* Magical Aura */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 animate-pulse" />

      {/* Header */}
      <header className="w-full bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 py-3 px-4 relative z-[100]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <CodeQuestLogo 
              iconSize={6} 
              titleClassName="text-xl font-bold text-white" 
              showIcons={false} 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-[100] flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <Card className="p-8 max-w-md w-full text-center bg-slate-900/60 backdrop-blur-sm border-slate-700/30">
          {roomInfo ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-6">Join Battle Room</h1>
              
              <div className="mb-6">
                <h2 className="text-xl font-medium text-white">{roomInfo.name}</h2>
                <p className="text-gray-400 mt-1">Created by {roomInfo.created_by?.split('@')[0]}</p>
                <div className="mt-3 bg-indigo-900/30 rounded-md py-1 px-3 inline-block">
                  <span className="text-indigo-300 text-sm font-medium">
                    {roomInfo.game_mode === 'battle_royale' ? 'Battle Royale' : roomInfo.game_mode}
                  </span>
                </div>
              </div>
              
              {user ? (
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => navigate(`/battle/${roomId}`)}
                >
                  Enter Battle
                </Button>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-400 mb-4">Sign in to join this battle room</p>
                  
                  <Button
                    className="w-full bg-slate-800 hover:bg-slate-700"
                    onClick={() => handleSignIn('github')}
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    Sign in with GitHub
                  </Button>
                  
                  <Button
                    className="w-full bg-slate-800 hover:bg-slate-700"
                    onClick={() => handleSignIn('google')}
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z" />
                    </svg>
                    Sign in with Google
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">Room not found</h2>
              <p className="text-gray-400 mb-6">This battle room does not exist or has been closed</p>
              <Button onClick={() => navigate('/')}>
                Return to Homepage
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default JoinRoom; 