import { useState } from 'react';
import { useApp } from '../App';
import { api } from '../api';

export default function PlayersPage() {
  const { players, queue, activeMatches } = useApp();
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
    if (activeIds.has(id)) return { label: 'Playing', color: 'bg-orange-500/20 text-orange-400' };
    if (queuedIds.has(id)) return { label: 'In Queue', color: 'bg-yellow-500/20 text-yellow-400' };
    return { label: 'Available', color: 'bg-green-500/20 text-green-400' };
  }

  return (
    <div className="space-y-6">
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
        <div className="card text-center py-14">
          <p className="text-5xl mb-3">👤</p>
          <p className="text-gray-400">No players yet.</p>
          <p className="text-gray-500 text-sm mt-1">Add the first player above to get started!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {players.map((p) => {
            const status = getStatus(p.id);
            const totalGames = p.wins + p.losses;
            const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : null;
            return (
              <div key={p.id} className="card relative group">
                <button
                  onClick={() => removePlayer(p.id, p.name)}
                  className="absolute top-3 right-3 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
                  title="Remove player"
                >
                  ×
                </button>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-lg">
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className={`badge ${status.color}`}>{status.label}</span>
                </div>
                <h3 className="font-semibold truncate pr-4">{p.name}</h3>
                <p className="text-2xl font-bold text-green-400 mt-1">{p.elo} <span className="text-sm text-gray-500 font-normal">ELO</span></p>
                <div className="mt-3 pt-3 border-t border-[#334155] flex justify-between text-xs text-gray-400">
                  <span><span className="text-green-400 font-semibold">{p.wins}</span> wins</span>
                  <span><span className="text-red-400 font-semibold">{p.losses}</span> losses</span>
                  <span>{winRate !== null ? `${winRate}% WR` : 'No games'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
