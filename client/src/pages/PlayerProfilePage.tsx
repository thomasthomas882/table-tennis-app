import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { PlayerStats, Match, EloHistoryEntry } from '../types';
import { useApp } from '../App';

function parseUTC(s: string) {
  return new Date(s.includes('T') ? s + (s.endsWith('Z') ? '' : 'Z') : s.replace(' ', 'T') + 'Z');
}

function EloChart({ history, currentElo }: { history: EloHistoryEntry[]; currentElo: number }) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted text-sm">
        No ELO history yet — play some matches!
      </div>
    );
  }

  // Build data points: start at 1000 (before first match), then each entry
  const startElo = history[0].elo - history[0].elo_delta;
  const points = [{ elo: startElo, label: 'Start' }, ...history.map((e, i) => ({ elo: e.elo, label: `#${i + 1}` }))];

  const elos = points.map(p => p.elo);
  const minElo = Math.min(...elos) - 20;
  const maxElo = Math.max(...elos) + 20;
  const range = maxElo - minElo || 1;

  const W = 500, H = 120;
  const padL = 40, padR = 10, padT = 10, padB = 20;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const x = (i: number) => padL + (i / (points.length - 1)) * chartW;
  const y = (elo: number) => padT + (1 - (elo - minElo) / range) * chartH;

  // Build SVG path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.elo).toFixed(1)}`).join(' ');
  const fillD = `${pathD} L ${x(points.length - 1).toFixed(1)} ${(padT + chartH).toFixed(1)} L ${padL} ${(padT + chartH).toFixed(1)} Z`;

  // Y-axis labels
  const yLabels = [minElo + 20, Math.round((minElo + maxElo) / 2), maxElo - 20];

  const lastY = y(points[points.length - 1].elo);
  const lastX = x(points.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      <defs>
        <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y grid lines */}
      {yLabels.map(v => (
        <g key={v}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
          <text x={padL - 4} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="currentColor" fillOpacity="0.4">{v}</text>
        </g>
      ))}

      {/* Fill */}
      <path d={fillD} fill="url(#eloFill)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Data points */}
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <circle key={i} cx={x(i)} cy={y(p.elo)} r={isLast ? 4 : 2.5}
            fill={isLast ? '#22c55e' : '#166534'}
            stroke={isLast ? '#4ade80' : 'none'}
            strokeWidth={isLast ? 1.5 : 0}
          />
        );
      })}

      {/* Current ELO label */}
      <text x={lastX + 5} y={lastY} fontSize="10" fill="#4ade80" dominantBaseline="middle">{currentElo}</text>
    </svg>
  );
}

function RecentMatchCard({ match, playerId, hideElo }: { match: Match; playerId: number; hideElo: boolean }) {
  const onTeam1 = match.player1_id === playerId || match.player3_id === playerId;
  const won = onTeam1 ? match.winner_id === match.player1_id : match.winner_id === match.player2_id;
  const isDoubles = !!(match.player3_id || match.player4_id);

  const myTeam = onTeam1
    ? [match.player1_name, match.player3_name].filter(Boolean).join(' & ')
    : [match.player2_name, match.player4_name].filter(Boolean).join(' & ');
  const oppTeam = onTeam1
    ? [match.player2_name, match.player4_name].filter(Boolean).join(' & ')
    : [match.player1_name, match.player3_name].filter(Boolean).join(' & ');
  const myScore = onTeam1 ? match.player1_score : match.player2_score;
  const oppScore = onTeam1 ? match.player2_score : match.player1_score;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${won ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        {won ? 'W' : 'L'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">vs {oppTeam}</p>
        <p className="text-xs text-muted">
          {myScore}–{oppScore}
          {isDoubles && ' · Doubles'}
          {match.completed_at && ' · ' + parseUTC(match.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hideElo } = useApp();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getPlayerStats(Number(id))
      .then(s => setStats(s as PlayerStats))
      .catch(() => navigate('/players'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="card shimmer h-28 !p-0" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card shimmer h-40 !p-0" />
          <div className="card shimmer h-40 !p-0" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { player, recentMatches, headToHead, eloHistory } = stats;
  const totalGames = player.wins + player.losses;
  const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : null;
  const eloDelta = eloHistory.length > 0 ? player.elo - (eloHistory[0].elo - eloHistory[0].elo_delta) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate('/players')} className="text-muted hover:text-primary text-sm flex items-center gap-1 transition-colors">
        ← Back to Players
      </button>

      {/* Hero card */}
      <div className="card">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/30 to-green-700/20 flex items-center justify-center text-green-400 font-bold text-3xl border border-green-500/20 flex-shrink-0">
            {player.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{player.name}</h1>
            <p className="text-muted text-sm mt-0.5">Member since {new Date(player.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}</p>
            <div className="flex flex-wrap gap-4 mt-3">
              {!hideElo && (
                <div>
                  <p className="text-3xl font-bold text-green-400 tabular-nums">{player.elo}</p>
                  <p className="text-xs text-muted">ELO Rating</p>
                </div>
              )}
              <div>
                <p className="text-2xl font-bold tabular-nums">{player.wins}<span className="text-muted font-normal text-base">W</span> {player.losses}<span className="text-muted font-normal text-base">L</span></p>
                <p className="text-xs text-muted">{totalGames} total games · {winRate ?? '—'}% win rate</p>
              </div>
              {player.current_streak > 1 && (
                <div>
                  <p className="text-2xl font-bold text-orange-400 tabular-nums">{player.current_streak} 🔥</p>
                  <p className="text-xs text-muted">Current win streak</p>
                </div>
              )}
              {player.best_streak > 0 && (
                <div>
                  <p className="text-2xl font-bold text-yellow-400 tabular-nums">{player.best_streak}</p>
                  <p className="text-xs text-muted">Best win streak</p>
                </div>
              )}
              {!hideElo && eloDelta !== 0 && (
                <div>
                  <p className={`text-2xl font-bold tabular-nums ${eloDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {eloDelta > 0 ? '+' : ''}{eloDelta}
                  </p>
                  <p className="text-xs text-muted">Total ELO change</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ELO history chart */}
        {!hideElo && (
          <div className="card">
            <h2 className="font-semibold mb-4">ELO Progression</h2>
            <EloChart history={eloHistory} currentElo={player.elo} />
            <div className="flex justify-between text-xs text-muted mt-2">
              <span>First match</span>
              <span>Latest</span>
            </div>
          </div>
        )}

        {/* Head-to-head */}
        <div className="card">
          <h2 className="font-semibold mb-4">Head-to-Head</h2>
          {headToHead.length === 0 ? (
            <p className="text-muted text-sm">No match data yet.</p>
          ) : (
            <div className="space-y-2">
              {headToHead.slice(0, 8).map(h => {
                const total = h.wins + h.losses;
                const winPct = Math.round((h.wins / total) * 100);
                return (
                  <div key={h.opponent_id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{h.opponent_name}</span>
                      <span className="text-xs tabular-nums">
                        <span className="text-green-400 font-bold">{h.wins}W</span>
                        <span className="text-muted mx-1">–</span>
                        <span className="text-red-400">{h.losses}L</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-input overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-700 to-green-400 transition-all duration-700"
                        style={{ width: `${winPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent matches */}
      <div className="card">
        <h2 className="font-semibold mb-4">Recent Matches</h2>
        {recentMatches.length === 0 ? (
          <p className="text-muted text-sm">No matches played yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {recentMatches.map(m => (
              <RecentMatchCard key={m.id} match={m} playerId={player.id} hideElo={hideElo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
