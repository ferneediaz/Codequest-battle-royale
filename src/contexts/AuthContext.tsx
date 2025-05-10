import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { battleService } from '../services/battleService';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (provider: 'github' | 'google') => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (provider: 'github' | 'google') => {
    // Clear any existing sessions first
    await supabase.auth.signOut();
    
    await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: 'https://ferneediaz.github.io/Codequest-battle-royale/',
      },
    });
  };

  const signOut = async () => {
    try {
      // Force cleanup the battle session first
      await supabase
        .from('battle_sessions')
        .update({
          connected_emails: [],
          active_users: 0,
          last_left: null,
          last_left_at: null
        })
        .eq('id', 'default-battle-session');

      // Then try to sign out from auth
      console.log('Signing out from auth...');
      await supabase.auth.signOut();
      
      // Force clear the local state
      setUser(null);
      setSession(null);
      
      // Force clear any local storage
      window.localStorage.removeItem('supabase.auth.token');
      window.localStorage.removeItem('supabase.auth.expires_at');
      window.localStorage.removeItem('supabase.auth.refresh_token');
      
    } catch (error) {
      console.error('Error during sign out:', error);
      // Still try to force clear everything
      setUser(null);
      setSession(null);
      window.localStorage.removeItem('supabase.auth.token');
      window.localStorage.removeItem('supabase.auth.expires_at');
      window.localStorage.removeItem('supabase.auth.refresh_token');
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 