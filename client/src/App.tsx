import { useEffect, useState, createContext, useContext, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { socket } from './socket';
import { Player, QueueEntry, Table, Match, Notification, Stats } from './types';
import { api } from './api';
import Navbar from './components/Navbar';
import NotificationToast from './components/NotificationToast';
import { setSoundEnabled, sounds } from './utils/sounds';
import Dashboard from './pages/Dashboard';
import QueuePage from './pages/QueuePage';
import MatchesPage from './pages/MatchesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PlayersPage from './pages/PlayersPage';
import SettingsPage from './pages/SettingsPage';
import MatchHistoryPage from './pages/MatchHistoryPage';
import PlayerProfilePage from './pages/PlayerProfilePage';

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
  showElo: boolean;
  setShowElo: (v: boolean) => void;
  skipMatchConfirm: boolean;
  setSkipMatchConfirm: (v: boolean) => void;
  matchTimeLimitSingles: number;
  setMatchTimeLimitSingles: (v: number) => void;
  matchTimeLimitDoubles: number;
  setMatchTimeLimitDoubles: (v: number) => void;
  voiceGender: 'male' | 'female';
  setVoiceGender: (v: 'male' | 'female') => void;
  announcerVolume: number;
  setAnnouncerVolume: (v: number) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  autoStartMatches: boolean;
  setAutoStartMatches: (v: boolean) => void;
}

const AppContext = createContext<AppCtx>({
  players: [], queue: [], tables: [], activeMatches: [],
  stats: null, connected: false, refreshStats: () => {},
  theme: 'dark', setTheme: () => {},
  soundEnabled: true, setSoundEnabled: () => {},
  showElo: true, setShowElo: () => {},
  skipMatchConfirm: false, setSkipMatchConfirm: () => {},
  matchTimeLimitSingles: 15, setMatchTimeLimitSingles: () => {},
  matchTimeLimitDoubles: 20, setMatchTimeLimitDoubles: () => {},
  voiceGender: 'female', setVoiceGender: () => {},
  announcerVolume: 1, setAnnouncerVolume: () => {},
  notificationsEnabled: true, setNotificationsEnabled: () => {},
  autoStartMatches: false, setAutoStartMatches: () => {},
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
  const [skipMatchConfirm, setSkipMatchConfirmState] = useState<boolean>(() => {
    return localStorage.getItem('pingtrack-skip-match-confirm') === 'true';
  });
  const [showElo, setShowEloState] = useState<boolean>(() => {
    return localStorage.getItem('pingtrack-show-elo') !== 'false';
  });
  const [matchTimeLimitSinglesState, setMatchTimeLimitSinglesState] = useState<number>(() => {
    return parseInt(localStorage.getItem('pingtrack-match-time') || '15', 10);
  });
  const [matchTimeLimitDoublesState, setMatchTimeLimitDoublesState] = useState<number>(() => {
    return parseInt(localStorage.getItem('pingtrack-match-time-doubles') || '20', 10);
  });
  const [voiceGenderState, setVoiceGenderState] = useState<'male' | 'female'>(() => {
    return (localStorage.getItem('pingtrack-voice-gender') as 'male' | 'female') || 'female';
  });
  const [announcerVolumeState, setAnnouncerVolumeState] = useState<number>(() => {
    const stored = localStorage.getItem('pingtrack-announcer-volume');
    return stored ? parseFloat(stored) : 1;
  });
  const [notificationsEnabledState, setNotificationsEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('pingtrack-notifications') !== 'false';
  });
  const [autoStartMatchesState, setAutoStartMatchesState] = useState<boolean>(() => {
    return localStorage.getItem('pingtrack-auto-start') === 'true';
  });

  const notificationsEnabledRef = useRef(notificationsEnabledState);
  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabledState;
  }, [notificationsEnabledState]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('pingtrack-theme', t);
  };

  const handleSetSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v);
    setSoundEnabled(v);
    localStorage.setItem('pingtrack-sound', String(v));
  };

  const handleSetShowElo = (v: boolean) => {
    setShowEloState(v);
    localStorage.setItem('pingtrack-show-elo', String(v));
  };

  const handleSetSkipMatchConfirm = (v: boolean) => {
    setSkipMatchConfirmState(v);
    localStorage.setItem('pingtrack-skip-match-confirm', String(v));
  };

  const handleSetMatchTimeLimitSingles = (v: number) => {
    setMatchTimeLimitSinglesState(v);
    localStorage.setItem('pingtrack-match-time', String(v));
  };

  const handleSetMatchTimeLimitDoubles = (v: number) => {
    setMatchTimeLimitDoublesState(v);
    localStorage.setItem('pingtrack-match-time-doubles', String(v));
  };

  const handleSetVoiceGender = (v: 'male' | 'female') => {
    setVoiceGenderState(v);
    localStorage.setItem('pingtrack-voice-gender', v);
  };

  const handleSetAnnouncerVolume = (v: number) => {
    setAnnouncerVolumeState(v);
    localStorage.setItem('pingtrack-announcer-volume', String(v));
  };

  const handleSetNotificationsEnabled = (v: boolean) => {
    setNotificationsEnabledState(v);
    localStorage.setItem('pingtrack-notifications', String(v));
  };

  const handleSetAutoStartMatches = (v: boolean) => {
    setAutoStartMatchesState(v);
    localStorage.setItem('pingtrack-auto-start', String(v));
  };

  // Sync state across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pingtrack-theme' && e.newValue) setThemeState(e.newValue as Theme);
      if (e.key === 'pingtrack-sound' && e.newValue) setSoundEnabledState(e.newValue !== 'false');
      if (e.key === 'pingtrack-show-elo' && e.newValue) setShowEloState(e.newValue !== 'false');
      if (e.key === 'pingtrack-skip-match-confirm' && e.newValue) setSkipMatchConfirmState(e.newValue === 'true');
      if (e.key === 'pingtrack-match-time' && e.newValue) setMatchTimeLimitSinglesState(parseInt(e.newValue, 10));
      if (e.key === 'pingtrack-match-time-doubles' && e.newValue) setMatchTimeLimitDoublesState(parseInt(e.newValue, 10));
      if (e.key === 'pingtrack-voice-gender' && e.newValue) setVoiceGenderState(e.newValue as 'male' | 'female');
      if (e.key === 'pingtrack-announcer-volume' && e.newValue) setAnnouncerVolumeState(parseFloat(e.newValue));
      if (e.key === 'pingtrack-notifications' && e.newValue) setNotificationsEnabledState(e.newValue !== 'false');
      if (e.key === 'pingtrack-auto-start' && e.newValue) setAutoStartMatchesState(e.newValue === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Sync sound module with persisted preference on mount
  useEffect(() => { setSoundEnabled(soundEnabledState); }, []);

  // Apply theme class to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const refreshStats = () => {
    api.getStats().then((s) => setStats(s as Stats)).catch(() => {});
  };

  // Global Match Timer loop
  useEffect(() => {
    const interval = setInterval(() => {
      activeMatches.forEach(match => {
        if (!match.created_at) return;
        
        const s = match.created_at;
        const utcString = s.includes('T') ? s + (s.endsWith('Z') ? '' : 'Z') : s.replace(' ', 'T') + 'Z';
        const start = new Date(utcString).getTime();
        const currentElapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
        
        const isDoubles = !!match.player3_id;
        const limitSeconds = (isDoubles ? matchTimeLimitDoublesState : matchTimeLimitSinglesState) * 60;
        
        if (currentElapsed >= limitSeconds) {
          const lockKey = `alerted-${match.created_at}-${limitSeconds}`;
          // Initial check
          if (!localStorage.getItem(lockKey)) {
            localStorage.setItem(lockKey, 'true');
            
            // Cross-tab deduplication using a random jitter
            setTimeout(() => {
              if (localStorage.getItem(`${lockKey}-spoken`)) return;
              localStorage.setItem(`${lockKey}-spoken`, 'true');

              sounds.notification('match');
              if ('speechSynthesis' in window) {
                const msg = new SpeechSynthesisUtterance(`${match.table_name || 'Table'}, time is up.`);
                const voices = window.speechSynthesis.getVoices();
                let voice = voices.find(v => 
                  v.lang.startsWith('en') && 
                  (voiceGenderState === 'female' 
                    ? /female|woman|zira|samantha|hazel|catherine|susan|victoria|karen|moira|tessa|fiona|google us english/i.test(v.name) 
                    : /male|man|david|mark|george|alex|daniel|fred|oliver|arthur/i.test(v.name))
                );
                if (!voice) voice = voices.find(v => v.lang.startsWith('en'));
                if (voice) msg.voice = voice;
                msg.volume = announcerVolumeState;
                window.speechSynthesis.speak(msg);
              }
            }, Math.random() * 200 + 50); // Jitter between 50ms and 250ms
          }
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMatches, matchTimeLimitSinglesState, matchTimeLimitDoublesState, voiceGenderState, announcerVolumeState]);

  const pushNotification = (n: Notification) => {
    if (!notificationsEnabledRef.current) return;
    setNotifications((prev) => [n, ...prev].slice(0, 5));
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
    socket.connect();

    return () => { socket.removeAllListeners(); socket.disconnect(); };
  }, []);

  const dismissNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <AppContext.Provider value={{
      players, queue, tables, activeMatches, stats, connected, refreshStats,
      theme, setTheme,
      soundEnabled: soundEnabledState, setSoundEnabled: handleSetSoundEnabled,
      showElo, setShowElo: handleSetShowElo,
      skipMatchConfirm, setSkipMatchConfirm: handleSetSkipMatchConfirm,
      matchTimeLimitSingles: matchTimeLimitSinglesState, setMatchTimeLimitSingles: handleSetMatchTimeLimitSingles,
      matchTimeLimitDoubles: matchTimeLimitDoublesState, setMatchTimeLimitDoubles: handleSetMatchTimeLimitDoubles,
      voiceGender: voiceGenderState, setVoiceGender: handleSetVoiceGender,
      announcerVolume: announcerVolumeState, setAnnouncerVolume: handleSetAnnouncerVolume,
      notificationsEnabled: notificationsEnabledState, setNotificationsEnabled: handleSetNotificationsEnabled,
      autoStartMatches: autoStartMatchesState, setAutoStartMatches: handleSetAutoStartMatches,
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
            <Route path="/players/:id" element={<PlayerProfilePage />} />
            <Route path="/history" element={<MatchHistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
      </div>
    </AppContext.Provider>
  );
}
