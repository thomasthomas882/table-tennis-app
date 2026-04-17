export interface Player {
  id: number;
  name: string;
  elo: number;
  elo_doubles: number;
  wins: number;
  losses: number;
  doubles_wins: number;
  doubles_losses: number;
  current_streak: number;
  best_streak: number;
  created_at: string;
  total_games?: number;
  win_rate?: number;
}

export interface EloHistoryEntry {
  elo: number;
  elo_delta: number;
  match_id: number;
  created_at: string;
  rating_type: 'singles' | 'doubles';
}

export interface HeadToHead {
  opponent_id: number;
  opponent_name: string;
  wins: number;
  losses: number;
}

export interface PlayerStats {
  player: Player;
  recentMatches: Match[];
  headToHead: HeadToHead[];
  eloHistory: EloHistoryEntry[];
  eloHistoryDoubles: EloHistoryEntry[];
}

export interface MatchHistoryPage {
  matches: Match[];
  total: number;
  page: number;
  pages: number;
}

export interface QueueEntry {
  id: number;
  player_id: number;
  name: string;
  elo: number;
  joined_at: string;
  position: number | null;
}

export interface Table {
  id: number;
  name: string;
  status: 'available' | 'occupied';
}

export interface Match {
  id: number;
  table_id: number | null;
  table_name: string | null;
  player1_id: number;
  player1_name: string;
  player1_elo: number;
  player2_id: number;
  player2_name: string;
  player2_elo: number;
  player3_id: number | null;
  player3_name: string | null;
  player3_elo: number | null;
  player4_id: number | null;
  player4_name: string | null;
  player4_elo: number | null;
  player1_score: number;
  player2_score: number;
  winner_id: number | null;
  winner_name: string | null;
  series_id: number | null;
  status: 'in_progress' | 'completed';
  created_at: string;
  completed_at: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  ephemeral?: boolean;
  earnedAt: string | null; // ISO string, 'active' for ephemeral, or null if locked
}

export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'success' | 'match' | 'warning';
}

export interface Stats {
  totalPlayers: number;
  totalMatches: number;
  activeMatches: number;
  queueLength: number;
  todayMatches: number;
  topPlayerToday: { name: string; count: number } | null;
  biggestSwingToday: { name: string; delta: number } | null;
}

export interface Series {
  id: number;
  player1_id: number;
  player1_name: string;
  player2_id: number;
  player2_name: string;
  format: number;
  wins1: number;
  wins2: number;
  status: 'active' | 'completed';
  winner_id: number | null;
  winner_name: string | null;
  created_at: string;
  completed_at: string | null;
}
