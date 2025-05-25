import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import FloatingCodeBackground from '@/components/FloatingCodeBackground';
import { Shield, Crown, Sword, Users, Copy, ArrowRight, UserPlus2, RefreshCw } from "lucide-react";
import CodeQuestLogo from "@/components/CodeQuestLogo";
import { v4 as uuidv4 } from 'uuid';

const GameSetupPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeGameMode, setActiveGameMode] = useState('battle_royale');
  const [debugMsg, setDebugMsg] = useState('');
  
  // Generate room ID on component mount
  useEffect(() => {
    // Generate a shorter, more user-friendly room ID
    const shortId = uuidv4().split('-')[0];
    setRoomId(shortId);
  }, []);
  
  // Create a new game room
  const createRoom = async () => {
    if (!user) {
      console.error("User not authenticated");
      return;
    }
    
    setIsCreatingRoom(true);
    let roomCreated = false;
    
    try {
      console.log("Creating room with ID:", roomId);
      
      // Instead of using battle_rooms table (which doesn't exist),
      // we'll create a special battle_sessions entry with the room ID
      const sessionId = `room_${roomId}`;
      console.log("Creating battle session with ID:", sessionId);
      
      // Build session data - this will be our "room"
      const sessionData = {
        id: sessionId,
        active_users: 1,
        is_active: false,
        round: 1,
        time_remaining: 300, 
        battle_state: 'topic_selection',
        connected_emails: [user.email],
        ready_users: [],
        topic_selections: {},
        selected_topics: [],
        updated_at: new Date().toISOString(),
        
        // Store room metadata in the current_category field
        current_category: JSON.stringify({
          roomName: roomName || `${user.email?.split('@')[0]}'s Room`,
          createdBy: user.email,
          gameMode: activeGameMode
        })
      };
      
      console.log("Creating room using battle_sessions table:", sessionData);
      
      // Create the session which will act as our room
      const { data, error } = await supabase
        .from('battle_sessions')
        .insert(sessionData)
        .select();
      
      if (error) {
        const errorDetails = JSON.stringify(error);
        console.error('Error creating room:', error);
        console.error('Error details:', errorDetails);
        setDebugMsg(`Failed to create room: ${error.message || errorDetails}`);
        throw error;
      }
      
      console.log("Room created successfully:", data);
      roomCreated = true;
      
      // Generate invite link for HashRouter
      const baseUrl = window.location.origin;
      // For HashRouter format
      const joinPath = `/#/join/${roomId}`;
      const link = `${baseUrl}${joinPath}`;
      setInviteLink(link);
      
      // Use React Router's navigate for client-side navigation
      console.log(`Navigating to /battle/${roomId}`);
      navigate(`/battle/${roomId}`);
      
    } catch (error: any) {
      console.error('Error creating room:', error);
      console.error('Error type:', typeof error);
      
      // Try to extract more useful information
      let errorMessage = "Failed to create room.";
      if (error?.message) errorMessage += " " + error.message;
      if (error?.details) errorMessage += " Details: " + error.details;
      
      setDebugMsg(errorMessage + " Please try again or check console for details.");
      
      // If room creation somehow succeeded despite errors
      if (roomCreated) {
        setDebugMsg("Room created but navigation failed. Click below to join your room manually.");
      }
    } finally {
      setIsCreatingRoom(false);
    }
  };
  
  // Copy invite link to clipboard - update for HashRouter
  const copyInviteLink = () => {
    // Build a proper sharable link using hash-based routing
    const baseUrl = window.location.origin;
    const hashPath = `/#/join/${roomId}`;
    const link = `${baseUrl}${hashPath}`;
    
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    
    setTimeout(() => {
      setLinkCopied(false);
    }, 2000);
  };
  
  // Generate a new room ID
  const regenerateRoomId = () => {
    const shortId = uuidv4().split('-')[0];
    setRoomId(shortId);
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
      <div className="relative z-[100] max-w-6xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-8 opacity-0 animate-fadeIn" style={{ animation: 'fadeIn 0.6s forwards' }}>
          <div className="flex justify-center gap-4 mb-3">
            <Shield className="w-10 h-10 text-indigo-400 animate-jump" />
            <Crown className="w-10 h-10 text-yellow-500 animate-jump" style={{ animationDelay: "0.3s" }} />
            <Sword className="w-10 h-10 text-blue-400 animate-jump" style={{ animationDelay: "0.6s" }} />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Create Your Battle Arena
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mt-4">
            Set up your own coding challenge arena and invite fellow warriors
          </p>
        </div>

        {/* Game Setup Card */}
        <Card className="p-8 bg-slate-900/60 backdrop-blur-sm border-slate-700/30 shadow-xl overflow-hidden relative max-w-3xl mx-auto">
          {/* Room Creation Form */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Room Settings</h2>
            
            <div className="space-y-6">
              {/* Room Name */}
              <div>
                <label htmlFor="room-name" className="block text-sm font-medium text-slate-300 mb-2">
                  Room Name
                </label>
                <Input
                  id="room-name"
                  placeholder={`${user?.email?.split('@')[0]}'s Room`}
                  className="bg-slate-800 border-slate-700 text-white"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
              
              {/* Room ID */}
              <div>
                <label htmlFor="room-id" className="block text-sm font-medium text-slate-300 mb-2">
                  Room ID
                </label>
                <div className="flex gap-2">
                  <Input
                    id="room-id"
                    className="bg-slate-800 border-slate-700 text-white"
                    value={roomId}
                    readOnly
                  />
                  <Button 
                    variant="outline" 
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={regenerateRoomId}
                    title="Generate new ID"
                  >
                    <RefreshCw size={16} />
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Share this ID with friends to join your room
                </p>
              </div>
            </div>
          </div>
          
          {/* Game Modes */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Game Modes</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Battle Royale - Enabled */}
              <div
                className={`rounded-lg p-4 cursor-pointer transition-all border ${
                  activeGameMode === 'battle_royale' 
                    ? 'border-indigo-500 bg-indigo-900/30' 
                    : 'border-slate-700 bg-slate-800/50 opacity-70 hover:opacity-100'
                }`}
                onClick={() => setActiveGameMode('battle_royale')}
              >
                <div className="flex justify-between items-start mb-2">
                  <Users className="h-8 w-8 text-indigo-400" />
                  <Badge className="bg-indigo-600">Available</Badge>
                </div>
                <h3 className="text-lg font-medium text-white">Battle Royale</h3>
                <p className="text-sm text-slate-300 mt-1">
                  Everyone competes against each other
                </p>
              </div>
              
              {/* 1v1 - Disabled */}
              <div className="rounded-lg p-4 border border-slate-700 bg-slate-800/50 opacity-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1">
                    <Shield className="h-8 w-8 text-blue-400" />
                  </div>
                  <Badge className="bg-slate-600">Coming Soon</Badge>
                </div>
                <h3 className="text-lg font-medium text-white">1v1 Duel</h3>
                <p className="text-sm text-slate-300 mt-1">
                  Challenge a single opponent
                </p>
              </div>
              
              {/* 2v2 - Disabled */}
              <div className="rounded-lg p-4 border border-slate-700 bg-slate-800/50 opacity-50">
                <div className="flex justify-between items-start mb-2">
                  <Users className="h-8 w-8 text-green-400" />
                  <Badge className="bg-slate-600">Coming Soon</Badge>
                </div>
                <h3 className="text-lg font-medium text-white">2v2 Team Battle</h3>
                <p className="text-sm text-slate-300 mt-1">
                  Form teams and compete together
                </p>
              </div>
            </div>
          </div>
          
          {/* Invite Friends Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Invite Warriors</h2>
            <div className="flex items-center gap-4 mb-2">
              <UserPlus2 className="h-6 w-6 text-indigo-400" />
              <p className="text-slate-300">
                Share this link to invite friends to your battle
              </p>
            </div>
            
            <div className="flex gap-2">
              <Input
                className="bg-slate-800 border-slate-700 text-white"
                value={`${window.location.origin}/#/join/${roomId}`}
                readOnly
              />
              <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={copyInviteLink}
              >
                {linkCopied ? 'Copied!' : <Copy size={16} />}
              </Button>
            </div>
          </div>
          
          {/* Create Room Button */}
          <div className="flex flex-col gap-4 items-center justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-10 py-6 text-lg rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:scale-105 hover:shadow-xl relative overflow-hidden group border border-indigo-500/20"
              onClick={createRoom}
              disabled={isCreatingRoom}
            >
              <span className="relative z-10 flex items-center">
                {isCreatingRoom ? 'Creating Room...' : (
                  <>
                    Create Battle Room <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </Button>
            
            {/* Error message */}
            {debugMsg && (
              <div className="mt-4 text-center">
                <p className="text-red-400 mb-2">{debugMsg}</p>
                {roomId && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/30"
                    onClick={() => navigate(`/battle/${roomId}`)}
                  >
                    Join Room Manually
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Return Home Link */}
          <div className="mt-8 text-center">
            <Button 
              variant="secondary"
              size="default"
              className="bg-slate-800 hover:bg-slate-700 text-white border border-indigo-500/30 hover:border-indigo-500 font-medium px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
              onClick={() => navigate('/')}
            >
              <svg className="w-4 h-4 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Homepage
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GameSetupPage; 