import { useApp } from '../App';
import { Link } from 'react-router-dom';
import { Match } from '../types';

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`text-3xl w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-gray-400 text-sm">{label}</p>
      </div>
    </div>
  );
}

function ActiveMatchCard({ match }: { match: Match }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="badge bg-orange-500/20 text-orange-400">Live</span>
        {match.table_name && (
          <span className="text-xs text-gray-400">{match.table_name}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-center">
          <p className="font-semibold truncate">{match.player1_name}</p>
          <p className="text-4xl font-bold text-green-400">{match.player1_score}</p>
          <p className="text-xs text-gray-500">ELO {match.player1_elo}</p>
        </div>
        <div className="text-gray-500 font-bold text-xl">VS</div>
        <div className="flex-1 text-center">
          <p className="font-semibold truncate">{match.player2_name}</p>
          <p className="text-4xl font-bold text-green-400">{match.player2_score}</p>
          <p className="text-xs text-gray-500">ELO {match.player2_elo}</p>
        </div>
      </div>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Welcome to PingTrack – your club's live match tracker</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Players" value={stats?.totalPlayers ?? '–'} icon="👤" color="bg-blue-500/20 text-blue-400" />
        <StatCard label="Active Matches" value={stats?.activeMatches ?? '–'} icon="🏓" color="bg-orange-500/20 text-orange-400" />
        <StatCard label="In Queue" value={stats?.queueLength ?? '–'} icon="⏳" color="bg-yellow-500/20 text-yellow-400" />
        <StatCard label="Matches Played" value={stats?.totalMatches ?? '–'} icon="🏆" color="bg-green-500/20 text-green-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Matches */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Active Matches</h2>
            <Link to="/matches" className="text-green-400 text-sm hover:underline">View all →</Link>
          </div>
          {activeMatches.length === 0 ? (
            <div className="card text-center py-8 text-gray-500">
              <p className="text-3xl mb-2">🏓</p>
              <p>No active matches</p>
              <Link to="/queue" className="text-green-400 text-sm hover:underline mt-1 block">Start one from the queue →</Link>
            </div>
          ) : (
            activeMatches.slice(0, 3).map(m => <ActiveMatchCard key={m.id} match={m} />)
          )}
        </div>

        {/* Queue Preview + Top Players */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Queue ({queue.length})</h2>
              <Link to="/queue" className="text-green-400 text-sm hover:underline">Manage →</Link>
            </div>
            <div className="card">
              {queue.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Queue is empty</p>
              ) : (
                <ol className="space-y-2">
                  {queue.slice(0, 5).map((entry, i) => (
                    <li key={entry.id} className="flex items-center gap-3 text-sm">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-green-500 text-black' : 'bg-[#334155] text-gray-300'
                      }`}>{i + 1}</span>
                      <span className="flex-1">{entry.name}</span>
                      <span className="text-gray-500">ELO {entry.elo}</span>
                    </li>
                  ))}
                  {queue.length > 5 && (
                    <p className="text-xs text-gray-500 text-center pt-1">+{queue.length - 5} more</p>
                  )}
                </ol>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Top Players</h2>
              <Link to="/leaderboard" className="text-green-400 text-sm hover:underline">Full leaderboard →</Link>
            </div>
            <div className="card">
              {topPlayers.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No ranked players yet</p>
              ) : (
                <ol className="space-y-2">
                  {topPlayers.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3 text-sm">
                      <span className="text-lg">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                      <span className="flex-1 font-medium">{p.name}</span>
                      <span className="text-green-400 font-semibold">{p.elo}</span>
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
