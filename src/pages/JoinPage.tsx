import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from '../contexts/AuthContext';
import FloatingCodeBackground from '@/components/FloatingCodeBackground';
import { UserPlus2, ArrowRight, Clipboard } from "lucide-react";
import CodeQuestLogo from "@/components/CodeQuestLogo";

const JoinPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    
    // Reset any errors
    setError(null);
    
    // Extract the room ID from the input - handle cases where a full URL is pasted
    let cleanRoomId = roomId.trim();
    
    try {
      // Check if input might be a URL
      if (cleanRoomId.includes('://') || cleanRoomId.includes('/')) {
        // Try to extract the room ID from common URL patterns
        const urlParts = cleanRoomId.split('/');
        // Take the last non-empty segment as the room ID
        cleanRoomId = urlParts.filter(part => part.trim().length > 0).pop() || '';
        
        console.log("Extracted room ID from URL:", cleanRoomId);
      }
      
      // Additional validation - make sure it's not too long and has no special URL characters
      if (cleanRoomId.length > 20 || /[/?&#:]/.test(cleanRoomId)) {
        throw new Error("Invalid room ID format");
      }
      
      if (!cleanRoomId) {
        throw new Error("Could not extract a valid room ID");
      }
      
    } catch (err) {
      console.error("Error parsing room ID:", err);
      setError('Invalid room ID format. Please enter just the room ID.');
      return;
    }
    
    // Navigate to the join room page with the extracted ID
    navigate(`/join/${cleanRoomId}`);
  };
  
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
          {user && (
            <div className="flex items-center">
              <span className="text-slate-300 mr-3">{user.email}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-[100] max-w-3xl mx-auto px-4 py-16">
        {/* Title */}
        <div className="text-center mb-8 opacity-0 animate-fadeIn" style={{ animation: 'fadeIn 0.6s forwards' }}>
          <div className="flex justify-center mb-3">
            <UserPlus2 className="w-12 h-12 text-blue-500 animate-bounce" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Join a Battle
          </h1>
          <p className="text-xl text-slate-300 mt-4">
            Enter a room ID to join an existing battle arena
          </p>
        </div>

        {/* Join Room Card */}
        <Card className="p-8 bg-slate-900/60 backdrop-blur-sm border-slate-700/30 shadow-xl overflow-hidden relative max-w-xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Enter Room Details</h2>
            
            <div>
              <label htmlFor="room-id" className="block text-sm font-medium text-slate-300 mb-2">
                Room ID
              </label>
              <div className="flex gap-2">
                <Input
                  id="room-id"
                  placeholder="Enter room ID (e.g. bfe91405)"
                  className="bg-slate-800 border-slate-700 text-white"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setRoomId(text);
                    } catch (err) {
                      console.error('Failed to read clipboard:', err);
                    }
                  }}
                  title="Paste from clipboard"
                >
                  <Clipboard size={16} />
                </Button>
              </div>
              {error && <p className="text-red-400 mt-1 text-sm">{error}</p>}
              <p className="text-xs text-slate-400 mt-2">
                Enter only the room ID (not the full URL). If pasting a link, we'll extract the ID for you.
              </p>
            </div>
          </div>
          
          {/* Join Button */}
          <div className="flex flex-col gap-4 items-center justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-10 py-6 text-lg rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-105 hover:shadow-xl relative overflow-hidden group border border-blue-500/20"
              onClick={handleJoinRoom}
            >
              <span className="relative z-10 flex items-center">
                Join Battle Room <ArrowRight className="ml-2 h-5 w-5" />
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </Button>
          </div>
          
          {/* Return Home Link */}
          <div className="mt-6 text-center">
            <button 
              className="text-slate-400 hover:text-white text-sm"
              onClick={() => navigate('/')}
            >
              Return to Homepage
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default JoinPage; 