import { useApp } from '../App';
import { Link } from 'react-router-dom';
import { Match } from '../types';

function StatCard({ label, value, icon, gradient, delay }: {
  label: string; value: number | string; icon: string; gradient: string; delay: string;
}) {
  return (
    <div className={`card animate-slide-up`} style={{ animationDelay: delay }}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${gradient}`}>
          {icon}
        </div>
        <div>
          <p className="text-3xl font-bold tabular-nums animate-count-up">{value}</p>
          <p className="text-secondary text-sm">{label}</p>
        </div>
      </div>
    </div>
  );
}

function LiveMatchPreview({ match }: { match: Match }) {
  const p1Leading = match.player1_score > match.player2_score;
  const p2Leading = match.player2_score > match.player1_score;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-input border border-orange-500/20 hover:border-orange-500/40 transition-all duration-200">
      <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse flex-shrink-0" />
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className={`text-sm font-medium truncate flex-1 ${p1Leading ? 'text-primary' : 'text-secondary'}`}>
          {match.player1_name}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-lg font-bold tabular-nums ${p1Leading ? 'text-green-400' : 'text-muted'}`}>{match.player1_score}</span>
          <span className="text-faint text-xs">:</span>
          <span className={`text-lg font-bold tabular-nums ${p2Leading ? 'text-green-400' : 'text-muted'}`}>{match.player2_score}</span>
        </div>
        <span className={`text-sm font-medium truncate flex-1 text-right ${p2Leading ? 'text-primary' : 'text-secondary'}`}>
          {match.player2_name}
        </span>
      </div>
      {match.table_name && <span className="text-xs text-faint flex-shrink-0">{match.table_name}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { stats, activeMatches, queue, players } = useApp();

  const topPlayers = [...players]
    .filter(p => (p.wins + p.losses) > 0)
    .sort((a, b) => b.elo - a.elo)
    .slice(0, 5);

  return (
    <div className="space-y-7 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-secondary text-sm mt-1">Your club's live match tracker</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard label="Players" value={stats?.totalPlayers ?? '–'} icon="👤"
          gradient="bg-blue-500/15 text-blue-400" delay="0ms"/>
        <StatCard label="Live Matches" value={stats?.activeMatches ?? '–'} icon="🏓"
          gradient="bg-orange-500/15 text-orange-400" delay="60ms"/>
        <StatCard label="In Queue" value={stats?.queueLength ?? '–'} icon="⏳"
          gradient="bg-yellow-500/15 text-yellow-400" delay="120ms"/>
        <StatCard label="Played" value={stats?.totalMatches ?? '–'} icon="🏆"
          gradient="bg-green-500/15 text-green-400" delay="180ms"/>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Matches */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              Live Now
              {activeMatches.length > 0 && (
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              )}
            </h2>
            <Link to="/matches" className="text-green-400 text-sm hover:text-green-300 transition-colors">View all →</Link>
          </div>
          {activeMatches.length === 0 ? (
            <div className="card text-center py-8 text-muted">
              <p className="text-3xl mb-2">🏓</p>
              <p className="text-sm">No active matches</p>
              <Link to="/queue" className="text-green-400 text-sm hover:underline mt-1 block">Start one from the queue →</Link>
            </div>
          ) : (
            <div className="space-y-2 stagger">
              {activeMatches.slice(0, 4).map(m => <LiveMatchPreview key={m.id} match={m} />)}
              {activeMatches.length > 4 && (
                <p className="text-xs text-muted text-center">+{activeMatches.length - 4} more matches</p>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Queue */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Queue ({queue.length})</h2>
              <Link to="/queue" className="text-green-400 text-sm hover:text-green-300 transition-colors">Manage →</Link>
            </div>
            <div className="card">
              {queue.length === 0 ? (
                <p className="text-muted text-sm text-center py-3">Queue is empty</p>
              ) : (
                <ol className="space-y-2 stagger">
                  {queue.slice(0, 5).map((entry, i) => (
                    <li key={entry.id} className="flex items-center gap-3 text-sm animate-slide-up">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-green-500 text-black' : 'bg-card border border-theme text-secondary'
                      }`}>{i + 1}</span>
                      <span className="flex-1">{entry.name}</span>
                      <span className="text-muted text-xs">ELO {entry.elo}</span>
                    </li>
                  ))}
                  {queue.length > 5 && (
                    <p className="text-xs text-muted text-center pt-1">+{queue.length - 5} more</p>
                  )}
                </ol>
              )}
            </div>
          </div>

          {/* Top Players */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Top Players</h2>
              <Link to="/leaderboard" className="text-green-400 text-sm hover:text-green-300 transition-colors">Full leaderboard →</Link>
            </div>
            <div className="card">
              {topPlayers.length === 0 ? (
                <p className="text-muted text-sm text-center py-3">No ranked players yet</p>
              ) : (
                <ol className="space-y-2 stagger">
                  {topPlayers.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3 text-sm animate-slide-up">
                      <span className="text-lg w-6 text-center">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                      <span className="flex-1 font-medium">{p.name}</span>
                      <span className="text-green-400 font-bold">{p.elo}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
