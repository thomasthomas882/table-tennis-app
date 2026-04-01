import { useState } from 'react';
import { useApp } from '../App';
import { api } from '../api';

export default function PlayersPage() {
  const { players, queue, activeMatches, hideElo } = useApp();
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const queuedIds = new Set(queue.map(q => q.player_id));
  const activeIds = new Set([
    ...activeMatches.map(m => m.player1_id),
    ...activeMatches.map(m => m.player2_id),
  ]);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.createPlayer(newName.trim());
      setNewName('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function removePlayer(id: number, name: string) {
    if (!confirm(`Remove ${name} from the club? This cannot be undone.`)) return;
    await api.deletePlayer(id).catch((e) => setError(e.message));
  }

  function getStatus(id: number) {
    if (activeIds.has(id)) return { label: 'Playing', dot: 'bg-orange-400', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
    if (queuedIds.has(id)) return { label: 'In Queue', dot: 'bg-yellow-400', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' };
    return { label: 'Available', dot: 'bg-green-400', color: 'bg-green-500/15 text-green-400 border-green-500/30' };
  }

  const sortedPlayers = [...players].sort((a, b) => b.elo - a.elo);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Players</h1>

      {/* Add player form */}
      <div className="card">
        <h2 className="font-semibold mb-3">Add New Player</h2>
        <form onSubmit={addPlayer} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Player name…"
            className="input flex-1"
            maxLength={40}
          />
          <button type="submit" disabled={loading || !newName.trim()} className="btn-primary whitespace-nowrap">
            {loading ? 'Adding…' : '+ Add'}
          </button>
        </form>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Player grid */}
      {players.length === 0 ? (
        <div className="card text-center py-14 animate-pop-in">
          <p className="text-5xl mb-3">👤</p>
          <p className="text-secondary">No players yet.</p>
          <p className="text-muted text-sm mt-1">Add the first player above to get started!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
          {sortedPlayers.map((p, i) => {
            const status = getStatus(p.id);
            const totalGames = p.wins + p.losses;
            const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : null;
            const rank = i < 3 ? ['🥇','🥈','🥉'][i] : null;

            return (
              <div key={p.id}
                className="card relative group cursor-default animate-pop-in"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                <button
                  onClick={() => removePlayer(p.id, p.name)}
                  className="absolute top-3 right-3 text-faint hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-150 text-xl leading-none"
                  title="Remove player"
                >
                  ×
                </button>

                {/* Avatar + rank */}
                <div className="flex items-start justify-between mb-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500/30 to-green-700/20 flex items-center justify-center text-green-400 font-bold text-xl border border-green-500/20">
                      {p.name[0].toUpperCase()}
                    </div>
                    {rank && (
                      <span className="absolute -top-1.5 -right-1.5 text-sm">{rank}</span>
                    )}
                  </div>
                  <span className={`badge border ${status.color} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${status.label === 'Playing' ? 'animate-pulse' : ''}`} />
                    {status.label}
                  </span>
                </div>

                <h3 className="font-semibold truncate pr-4">{p.name}</h3>
                {!hideElo && (
                  <p className="text-3xl font-bold text-green-400 mt-0.5 tabular-nums">
                    {p.elo}
                    <span className="text-sm text-muted font-normal ml-1">ELO</span>
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-theme grid grid-cols-3 gap-1 text-center text-xs">
                  <div>
                    <p className="text-green-400 font-bold text-base tabular-nums">{p.wins}</p>
                    <p className="text-muted">Wins</p>
                  </div>
                  <div>
                    <p className="text-red-400 font-bold text-base tabular-nums">{p.losses}</p>
                    <p className="text-muted">Losses</p>
                  </div>
                  <div>
                    <p className={`font-bold text-base tabular-nums ${winRate !== null && winRate >= 50 ? 'text-green-400' : 'text-secondary'}`}>
                      {winRate !== null ? `${winRate}%` : '–'}
                    </p>
                    <p className="text-muted">Win%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
