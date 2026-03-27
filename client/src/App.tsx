import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { socket } from './socket';
import { Player, QueueEntry, Table, Match, Notification, Stats } from './types';
import { api } from './api';
import Navbar from './components/Navbar';
import NotificationToast from './components/NotificationToast';
import Dashboard from './pages/Dashboard';
import QueuePage from './pages/QueuePage';
import MatchesPage from './pages/MatchesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PlayersPage from './pages/PlayersPage';

// ─── App Context ─────────────────────────────────────────────────────────────

interface AppCtx {
  players: Player[];
  queue: QueueEntry[];
  tables: Table[];
  activeMatches: Match[];
  stats: Stats | null;
  connected: boolean;
  refreshStats: () => void;
}

const AppContext = createContext<AppCtx>({
  players: [], queue: [], tables: [], activeMatches: [],
  stats: null, connected: false, refreshStats: () => {},
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

    socket.on('match:completed', (match: Match) => {
      setActiveMatches((prev) => prev.filter((m) => m.id !== match.id));
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
    <AppContext.Provider value={{ players, queue, tables, activeMatches, stats, connected, refreshStats }}>
      <div className="min-h-screen bg-[#0f172a] text-white">
        <Navbar connected={connected} />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
      </div>
    </AppContext.Provider>
  );
}
