import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { socket } from './socket';
import { Player, QueueEntry, Table, Match, Notification, Stats } from './types';
import { api } from './api';
import Navbar from './components/Navbar';
import NotificationToast from './components/NotificationToast';
import { setSoundEnabled } from './utils/sounds';
import Dashboard from './pages/Dashboard';
import QueuePage from './pages/QueuePage';
import MatchesPage from './pages/MatchesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PlayersPage from './pages/PlayersPage';
import SettingsPage from './pages/SettingsPage';

// ─── App Context ─────────────────────────────────────────────────────────────

type Theme = 'dark' | 'light';

interface AppCtx {
  players: Player[];
  queue: QueueEntry[];
  tables: Table[];
  activeMatches: Match[];
  stats: Stats | null;
  connected: boolean;
  refreshStats: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  hideElo: boolean;
  setHideElo: (v: boolean) => void;
}

const AppContext = createContext<AppCtx>({
  players: [], queue: [], tables: [], activeMatches: [],
  stats: null, connected: false, refreshStats: () => {},
  theme: 'dark', setTheme: () => {},
  soundEnabled: true, setSoundEnabled: () => {},
  hideElo: false, setHideElo: () => {},
});

export function useApp() {
  return useContext(AppContext);
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [connected, setConnected] = useState(false);
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('pingtrack-theme') as Theme) || 'dark';
  });
  const [soundEnabledState, setSoundEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('pingtrack-sound') !== 'false';
  });
  const [hideElo, setHideEloState] = useState<boolean>(() => {
    return localStorage.getItem('pingtrack-hide-elo') === 'true';
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('pingtrack-theme', t);
  };

  const handleSetSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v);
    setSoundEnabled(v);
    localStorage.setItem('pingtrack-sound', String(v));
  };

  const handleSetHideElo = (v: boolean) => {
    setHideEloState(v);
    localStorage.setItem('pingtrack-hide-elo', String(v));
  };

  // Sync sound module with persisted preference on mount
  useEffect(() => { setSoundEnabled(soundEnabledState); }, []);

  // Apply theme class to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const refreshStats = () => {
    api.getStats().then((s) => setStats(s as Stats)).catch(() => {});
  };

  const pushNotification = (n: Notification) => {
    setNotifications((prev) => [n, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    }, 5000);
  };

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('init', (data) => {
      setPlayers(data.players);
      setQueue(data.queue);
      setTables(data.tables);
      setActiveMatches(data.matches);
    });

    socket.on('players:updated', setPlayers);
    socket.on('queue:updated', setQueue);
    socket.on('tables:updated', setTables);

    socket.on('match:started', (match: Match) => {
      setActiveMatches((prev) => [match, ...prev]);
      refreshStats();
    });

    socket.on('match:scoreUpdated', (match: Match) => {
      setActiveMatches((prev) => prev.map((m) => (m.id === match.id ? match : m)));
    });

    socket.on('match:completed', () => {
      api.getMatches('in_progress').then((m) => setActiveMatches(m as Match[])).catch(() => {});
      refreshStats();
    });

    socket.on('leaderboard:updated', setPlayers);

    socket.on('notification', pushNotification);

    refreshStats();

    return () => { socket.removeAllListeners(); };
  }, []);

  const dismissNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <AppContext.Provider value={{
      players, queue, tables, activeMatches, stats, connected, refreshStats,
      theme, setTheme,
      soundEnabled: soundEnabledState, setSoundEnabled: handleSetSoundEnabled,
      hideElo, setHideElo: handleSetHideElo,
    }}>
      <div className="min-h-screen bg-page text-primary transition-colors duration-300">
        <Navbar connected={connected} />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
      </div>
    </AppContext.Provider>
  );
}
