export type BattleSession = {
  id: string;
  created_at: string;
  active_users: number;
  is_active: boolean;
  round: number;
  time_remaining: number;
  current_category: string;
  connected_emails?: string[];
  last_left?: string | null;  // Email of the user who last left
  last_left_at?: string | null;  // Timestamp when the user left
  ready_users?: string[];  // List of users who are ready for battle 
  selected_topics?: string[];  // Selected battle topics
  topic_selections?: Record<string, string[]>;  // Map of user email to their selected topics
  updated_at?: string;  // Timestamp of last update
  heartbeats?: Record<string, number>;  // Map of user email to their last heartbeat timestamp
};

export type Database = {
  public: {
    Tables: {
      battle_sessions: {
        Row: BattleSession;
        Insert: Omit<BattleSession, 'created_at'>;
        Update: Partial<Omit<BattleSession, 'created_at'>>;
      };
    };
  };
}; 