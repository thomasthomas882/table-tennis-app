import { useState, useEffect } from 'react';
import { api } from '../api';
import { Player } from '../types';
import { useApp } from '../App';

const medals = ['🥇', '🥈', '🥉'];

function EloBar({ elo, max, delay }: { elo: number; max: number; delay: number }) {
  const [width, setWidth] = useState(0);
  const pct = Math.round((elo / max) * 100);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="w-full bg-card border border-theme rounded-full h-1.5 mt-1">
      <div
        className="h-1.5 rounded-full bg-gradient-to-r from-green-700 to-green-400"
        style={{ width: `${width}%`, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </div>
  );
}

export default function LeaderboardPage() {
  const { hideElo } = useApp();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard()
      .then(p => setPlayers(p as Player[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxElo = players[0]?.elo ?? 1000;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-secondary text-sm mt-1">
          {hideElo ? 'ELO scores are hidden — toggle in Settings.' : 'Ranked by ELO rating (TTR-style). Starting at 1000.'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card shimmer h-14 !p-0" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="card text-center py-14 animate-pop-in">
          <p className="text-5xl mb-3">🏆</p>
          <p className="text-secondary">No ranked players yet.</p>
          <p className="text-muted text-sm mt-1">Complete some matches to build the rankings!</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {players.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 stagger">
              {[players[1], players[0], players[2]].map((p, i) => {
                const ranks = [2, 1, 3];
                const rank = ranks[i];
                const heights = ['h-28', 'h-36', 'h-24'];
                const glows = [
                  'shadow-[0_0_20px_rgba(156,163,175,0.15)]',
                  'shadow-[0_0_30px_rgba(250,204,21,0.2)] border-yellow-500/30',
                  'shadow-[0_0_20px_rgba(180,120,60,0.15)]',
                ];
                return (
                  <div key={p.id}
                    className={`card flex flex-col items-center justify-end pb-4 ${heights[i]} relative animate-pop-in ${glows[i]}`}>
                    <span className="text-2xl">{medals[rank - 1]}</span>
                    <p className="font-bold text-sm mt-1 text-center truncate w-full px-2">{p.name}</p>
                    {!hideElo && <p className="text-green-400 font-bold">{p.elo}</p>}
                    <p className="text-xs text-muted">{p.wins}W – {p.losses}L</p>
                    {rank === 1 && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl animate-bounce">👑</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Full table */}
          <div className="rounded-xl border border-theme overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-input border-b border-theme text-secondary text-xs">
                  <th className="text-left px-4 py-3 w-10">#</th>
                  <th className="text-left px-4 py-3">Player</th>
                  {!hideElo && <th className="text-right px-4 py-3">ELO</th>}
                  <th className="text-right px-4 py-3">W</th>
                  <th className="text-right px-4 py-3">L</th>
                  <th className="text-right px-4 py-3">Win%</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Games</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p.id}
                    className={`border-b border-theme/40 hover:bg-card-hover transition-colors ${i < 3 ? 'bg-green-500/5' : 'bg-card'}`}>
                    <td className="px-4 py-3">
                      {medals[i] ?? <span className="text-muted text-xs font-medium">{i + 1}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center text-green-400 text-xs font-bold flex-shrink-0">
                          {p.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{p.name}</p>
                          {!hideElo && <EloBar elo={p.elo} max={maxElo} delay={i * 50} />}
                        </div>
                      </div>
                    </td>
                    {!hideElo && <td className="px-4 py-3 text-right font-bold text-green-400 tabular-nums">{p.elo}</td>}
                    <td className="px-4 py-3 text-right text-green-300 tabular-nums">{p.wins}</td>
                    <td className="px-4 py-3 text-right text-red-400 tabular-nums">{p.losses}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={`font-medium ${(p.win_rate ?? 0) >= 50 ? 'text-green-400' : 'text-secondary'}`}>
                        {p.win_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted tabular-nums hidden sm:table-cell">{p.total_games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
