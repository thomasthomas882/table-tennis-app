import { useState, useEffect } from 'react';
import { api } from '../api';
import { Player } from '../types';

const medals = ['🥇', '🥈', '🥉'];

function EloBar({ elo, max }: { elo: number; max: number }) {
  const pct = Math.round((elo / max) * 100);
  return (
    <div className="w-full bg-[#334155] rounded-full h-1.5 mt-1">
      <div
        className="h-1.5 rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function LeaderboardPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-gray-400 text-sm mt-1">Ranked by ELO rating (K=32). Initial rating: 1000.</p>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-10">Loading…</div>
      ) : players.length === 0 ? (
        <div className="card text-center py-14">
          <p className="text-5xl mb-3">🏆</p>
          <p className="text-gray-400">No ranked players yet.</p>
          <p className="text-gray-500 text-sm mt-1">Complete some matches to build the rankings!</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {players.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[players[1], players[0], players[2]].map((p, i) => {
                const ranks = [2, 1, 3];
                const rank = ranks[i];
                const heights = ['h-28', 'h-36', 'h-24'];
                return (
                  <div key={p.id} className={`card flex flex-col items-center justify-end pb-4 ${heights[i]} relative`}>
                    <span className="text-2xl">{medals[rank - 1]}</span>
                    <p className="font-bold text-sm mt-1 text-center truncate w-full px-2">{p.name}</p>
                    <p className="text-green-400 font-semibold">{p.elo}</p>
                    <p className="text-xs text-gray-500">{p.wins}W – {p.losses}L</p>
                    {rank === 1 && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">👑</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Full table */}
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#334155] text-gray-400 text-xs">
                  <th className="text-left px-4 py-3 w-8">#</th>
                  <th className="text-left px-4 py-3">Player</th>
                  <th className="text-right px-4 py-3">ELO</th>
                  <th className="text-right px-4 py-3">W</th>
                  <th className="text-right px-4 py-3">L</th>
                  <th className="text-right px-4 py-3">Win%</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Games</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-[#334155]/50 hover:bg-[#334155]/30 transition-colors ${
                      i < 3 ? 'bg-green-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      {medals[i] ?? <span className="text-gray-500 text-xs">{i + 1}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <EloBar elo={p.elo} max={maxElo} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-400">{p.elo}</td>
                    <td className="px-4 py-3 text-right text-green-300">{p.wins}</td>
                    <td className="px-4 py-3 text-right text-red-400">{p.losses}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${(p.win_rate ?? 0) >= 50 ? 'text-green-400' : 'text-gray-400'}`}>
                        {p.win_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{p.total_games}</td>
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
