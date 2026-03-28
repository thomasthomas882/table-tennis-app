import { NavLink } from 'react-router-dom';
import { useApp } from '../App';

const links = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/queue', label: 'Queue', icon: '⏳' },
  { to: '/matches', label: 'Matches', icon: '🏓' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/players', label: 'Players', icon: '👤' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Navbar({ connected }: { connected: boolean }) {
  const { queue, activeMatches } = useApp();

  return (
    <nav className="bg-nav backdrop-blur-sm border-b border-theme sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-lg flex-shrink-0">
          <span className="text-2xl">🏓</span>
          <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
            PingTrack
          </span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-muted hover:text-primary hover:bg-white/5'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
              {to === '/queue' && queue.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-black text-[10px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center">
                  {queue.length}
                </span>
              )}
              {to === '/matches' && activeMatches.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center animate-pulse">
                  {activeMatches.length}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
          <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${connected ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-gray-600'}`} />
          <span className={`hidden sm:inline transition-colors duration-500 ${connected ? 'text-green-400' : 'text-muted'}`}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
    </nav>
  );
}
