import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { api } from '../api';
import { sounds } from '../utils/sounds';

type SortKey = 'elo_desc' | 'elo_asc' | 'name' | 'joined';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'elo_desc', label: 'Highest' },
  { key: 'elo_asc', label: 'Lowest' },
  { key: 'name',    label: 'A – Z' },
  { key: 'joined',  label: 'Newest' },
];

export default function PlayersPage() {
  const { players, queue, activeMatches, showElo, refreshStats } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'add' | 'find'>('add');
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('elo_desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const queuedIds = new Set(queue.map(q => q.player_id));
  const activeIds = new Set([
    ...activeMatches.flatMap(m => [m.player1_id, m.player2_id, m.player3_id, m.player4_id].filter(Boolean)),
  ]);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.createPlayer(newName.trim());
      sounds.success();
      setNewName('');
      refreshStats();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function removePlayer(id: number, name: string) {
    if (!confirm(`Remove ${name} from the club? This cannot be undone.`)) return;
    sounds.remove();
    await api.deletePlayer(id).catch((e) => setError(e.message));
    refreshStats();
  }

  function getStatus(id: number) {
    if (activeIds.has(id)) return { label: 'Playing',   dot: 'bg-orange-400', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
    if (queuedIds.has(id)) return { label: 'In Queue',  dot: 'bg-yellow-400', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' };
    return                        { label: 'Available', dot: 'bg-green-400',  color: 'bg-green-500/15 text-green-400 border-green-500/30' };
  }

  // Precompute global ELO rank (rank badge shows position across ALL players, not just filtered)
  const globalEloRank = new Map(
    [...players].sort((a, b) => b.elo - a.elo).map((p, i) => [p.id, i])
  );

  const displayPlayers = players
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'elo_desc': return b.elo - a.elo;
        case 'elo_asc':  return a.elo - b.elo;
        case 'name':     return a.name.localeCompare(b.name);
        case 'joined':   return b.id - a.id;
        default:         return 0;
      }
    });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Players</h1>

      {/* Tab card */}
      <div className="card !p-0 overflow-hidden">
        <div className="flex border-b border-theme">
          <button
            onClick={() => { setTab('add'); setSearchQuery(''); setError(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'add'
                ? 'bg-green-500/10 text-green-400 border-b-2 border-green-500'
                : 'text-muted hover:text-primary'
            }`}
          >
            + Add Player
          </button>
          <button
            onClick={() => { setTab('find'); setError(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'find'
                ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-500'
                : 'text-muted hover:text-primary'
            }`}
          >
            🔍 Find Player
          </button>
        </div>

        <div className="p-4">
          {tab === 'add' ? (
            <form onSubmit={addPlayer} className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => { setNewName(e.target.value); if (error) setError(''); }}
                placeholder="Player name…"
                className="input flex-1"
                maxLength={40}
              />
              <button type="submit" disabled={loading || !newName.trim()} className="btn-primary whitespace-nowrap">
                {loading ? 'Adding…' : '+ Add'}
              </button>
            </form>
          ) : (
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search among ${players.length} player${players.length !== 1 ? 's' : ''}…`}
              className="input w-full"
              autoFocus
            />
          )}
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Sort + count bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-secondary">
          {searchQuery
            ? `${displayPlayers.length} result${displayPlayers.length !== 1 ? 's' : ''} for "${searchQuery}"`
            : `${players.length} player${players.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted">Sort:</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                sortBy === opt.key
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : 'bg-card border-theme text-muted hover:text-primary hover:border-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Player grid */}
      {players.length === 0 ? (
        <div className="card text-center py-14 animate-pop-in">
          <p className="text-5xl mb-3">👤</p>
          <p className="text-secondary">No players yet.</p>
          <p className="text-muted text-sm mt-1">Add the first player above to get started!</p>
        </div>
      ) : displayPlayers.length === 0 ? (
        <div className="card text-center py-10 animate-pop-in">
          <p className="text-4xl mb-2">🔍</p>
          <p className="text-secondary">No players match "{searchQuery}"</p>
          <p className="text-muted text-sm mt-1">Try a different name.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayPlayers.map((p) => {
            const status = getStatus(p.id);
            const totalGames = p.wins + p.losses;
            const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : null;
            const rankIdx = globalEloRank.get(p.id) ?? 99;
            const rankEmoji = totalGames > 0 && rankIdx < 3 ? ['🥇','🥈','🥉'][rankIdx] : null;

            return (
              <div key={p.id}
                className="card relative group cursor-pointer hover:border-hover transition-all hover:-translate-y-0.5"
                onClick={() => { sounds.click(); navigate(`/players/${p.id}`); }}>
                <button
                  onClick={(e) => { e.stopPropagation(); removePlayer(p.id, p.name); }}
                  className="absolute top-3 right-3 text-faint hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-150 text-xl leading-none"
                  title="Remove player"
                >×</button>

                <div className="flex items-start justify-between mb-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500/30 to-green-700/20 flex items-center justify-center text-green-400 font-bold text-xl border border-green-500/20">
                      {p.name[0].toUpperCase()}
                    </div>
                    {rankEmoji && (
                      <span className="absolute -top-1.5 -right-1.5 text-sm">{rankEmoji}</span>
                    )}
                  </div>
                  <span className={`badge border ${status.color} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${status.label === 'Playing' ? 'animate-pulse' : ''}`} />
                    {status.label}
                  </span>
                </div>

                <h3 className="font-semibold truncate pr-4">{p.name}</h3>
                {showElo && (
                  <div className="flex gap-3 mt-0.5">
                    <div>
                      <p className="text-2xl font-bold text-green-400 tabular-nums">
                        {p.elo}
                        <span className="text-xs text-muted font-normal ml-1">S</span>
                      </p>
                    </div>
                    {(p.doubles_wins ?? 0) + (p.doubles_losses ?? 0) > 0 && (
                      <div>
                        <p className="text-2xl font-bold text-blue-400 tabular-nums">
                          {p.elo_doubles ?? 1000}
                          <span className="text-xs text-muted font-normal ml-1">D</span>
                        </p>
                      </div>
                    )}
                  </div>
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
                {(p.current_streak ?? 0) > 1 && (
                  <p className="text-xs text-orange-400 mt-2 text-center">
                    🔥 {p.current_streak}-game win streak
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
