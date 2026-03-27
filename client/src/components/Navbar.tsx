import { NavLink } from 'react-router-dom';
import { useApp } from '../App';

const links = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/queue', label: 'Queue', icon: '⏳' },
  { to: '/matches', label: 'Matches', icon: '🏓' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/players', label: 'Players', icon: '👤' },
];

export default function Navbar({ connected }: { connected: boolean }) {
  const { queue, activeMatches } = useApp();

  return (
    <nav className="bg-[#1e293b] border-b border-[#334155] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">🏓</span>
          <span className="text-green-400">PingTrack</span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-gray-400 hover:text-white hover:bg-[#334155]'
                }`
              }
            >
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
              {to === '/queue' && queue.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-black text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {queue.length}
                </span>
              )}
              {to === '/matches' && activeMatches.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeMatches.length}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-gray-400 hidden sm:inline">{connected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
    </nav>
  );
}
