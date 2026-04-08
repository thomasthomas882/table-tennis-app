import { NavLink } from 'react-router-dom';
import { useApp } from '../App';
import { useEffect, useState } from 'react';
import { sounds } from '../utils/sounds';

const links = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/queue', label: 'Queue', icon: '⏳' },
  { to: '/matches', label: 'Matches', icon: '🏓' },
  { to: '/players', label: 'Players', icon: '👤' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

function DigitalClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="font-mono tabular-nums select-none border-l border-theme pl-3 ml-1">
      <span className="text-base font-bold text-primary">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

export default function Navbar({ connected }: { connected: boolean }) {
  const { queue, activeMatches } = useApp();

  return (
    <nav className="bg-nav backdrop-blur-sm border-b border-theme sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-16 gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-lg flex-shrink-0">
          <span className="text-2xl">🏓</span>
          <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent hidden sm:inline">
            PingTrack
          </span>
          <span className="hidden sm:inline text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded-full border border-yellow-500/50 text-yellow-400 bg-yellow-500/10 leading-none">
            beta
          </span>
        </div>

        {/* Nav links — centered with flex-1, scrollable on tiny screens */}
        <div className="nav-links-scroll flex items-center gap-0.5 flex-1 justify-center overflow-x-auto overflow-y-visible py-2">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => sounds.click()}
              className={({ isActive }) =>
                `relative flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-muted hover:text-primary hover:bg-white/5'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              <span className="hidden lg:inline">{label}</span>
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

        {/* Right side: connection status then clock at far edge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${connected ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-gray-600'}`} />
            <span className={`hidden sm:inline transition-colors duration-500 ${connected ? 'text-green-400' : 'text-muted'}`}>
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <DigitalClock />
        </div>
      </div>
    </nav>
  );
}
