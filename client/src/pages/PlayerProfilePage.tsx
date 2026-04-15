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
        No history yet — play some matches!
      </div>
    );
  }

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

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.elo).toFixed(1)}`).join(' ');
  const fillD = `${pathD} L ${x(points.length - 1).toFixed(1)} ${(padT + chartH).toFixed(1)} L ${padL} ${(padT + chartH).toFixed(1)} Z`;

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
      {yLabels.map(v => (
        <g key={v}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
          <text x={padL - 4} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="currentColor" fillOpacity="0.4">{v}</text>
        </g>
      ))}
      <path d={fillD} fill="url(#eloFill)" />
      <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
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
      <text x={lastX + 5} y={lastY} fontSize="10" fill="#4ade80" dominantBaseline="middle">{currentElo}</text>
    </svg>
  );
}

function RecentMatchCard({ match, playerId, hideElo, onDelete }: {
  match: Match; playerId: number; hideElo: boolean; onDelete: (id: number) => void;
}) {
  const onTeam1 = match.player1_id === playerId || match.player3_id === playerId;
  const won = onTeam1 ? match.winner_id === match.player1_id : match.winner_id === match.player2_id;
  const isDoubles = !!(match.player3_id || match.player4_id);

  const oppTeam = onTeam1
    ? [match.player2_name, match.player4_name].filter(Boolean).join(' & ')
    : [match.player1_name, match.player3_name].filter(Boolean).join(' & ');
  const myScore = onTeam1 ? match.player1_score : match.player2_score;
  const oppScore = onTeam1 ? match.player2_score : match.player1_score;

  return (
    <div className={`relative flex items-center gap-3 p-3 rounded-lg border group ${won ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
      <button
        onClick={() => onDelete(match.id)}
        className="absolute top-2 right-2 text-faint hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none"
        title="Delete match"
      >×</button>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        {won ? 'W' : 'L'}
      </div>
      <div className="flex-1 min-w-0 pr-4">
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
  const [eloTab, setEloTab] = useState<'singles' | 'doubles'>('singles');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getPlayerStats(Number(id))
      .then(s => setStats(s as PlayerStats))
      .catch(() => navigate('/players'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleResetElo() {
    if (!confirmReset) { setConfirmReset(true); return; }
    setConfirmReset(false);
    await api.resetPlayerElo(Number(id));
    const s = await api.getPlayerStats(Number(id));
    setStats(s as PlayerStats);
  }

  async function handleDeleteMatch(matchId: number) {
    if (!confirm('Delete this match? All player ratings will be recalculated from remaining history.')) return;
    await api.deleteMatchFromHistory(matchId);
    const s = await api.getPlayerStats(Number(id));
    setStats(s as PlayerStats);
  }

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

  const { player, recentMatches, headToHead, eloHistory, eloHistoryDoubles } = stats;

  const singlesGames = player.wins + player.losses;
  const doublesGames = (player.doubles_wins ?? 0) + (player.doubles_losses ?? 0);
  const singlesWinRate = singlesGames > 0 ? Math.round((player.wins / singlesGames) * 100) : null;
  const doublesWinRate = doublesGames > 0 ? Math.round(((player.doubles_wins ?? 0) / doublesGames) * 100) : null;

  const singlesEloDelta = eloHistory.length > 0 ? player.elo - (eloHistory[0].elo - eloHistory[0].elo_delta) : 0;
  const doublesEloDelta = eloHistoryDoubles.length > 0 ? player.elo_doubles - (eloHistoryDoubles[0].elo - eloHistoryDoubles[0].elo_delta) : 0;

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
            <div className="flex flex-wrap gap-5 mt-3">
              {/* Singles stats */}
              <div className="border-r border-theme pr-5">
                <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wide">Singles</p>
                <div className="flex flex-wrap gap-4">
                  {!hideElo && (
                    <div>
                      <p className="text-3xl font-bold text-green-400 tabular-nums">{player.elo}</p>
                      <p className="text-xs text-muted">ELO{singlesEloDelta !== 0 && <span className={`ml-1 ${singlesEloDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>({singlesEloDelta > 0 ? '+' : ''}{singlesEloDelta})</span>}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{player.wins}<span className="text-muted font-normal text-base">W</span> {player.losses}<span className="text-muted font-normal text-base">L</span></p>
                    <p className="text-xs text-muted">{singlesGames} games · {singlesWinRate ?? '—'}% win</p>
                  </div>
                  {player.current_streak > 1 && (
                    <div>
                      <p className="text-2xl font-bold text-orange-400 tabular-nums">{player.current_streak} 🔥</p>
                      <p className="text-xs text-muted">Streak</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Doubles stats */}
              <div>
                <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wide">Doubles</p>
                <div className="flex flex-wrap gap-4">
                  {!hideElo && (
                    <div>
                      <p className="text-3xl font-bold text-blue-400 tabular-nums">{player.elo_doubles ?? 1000}</p>
                      <p className="text-xs text-muted">ELO{doublesEloDelta !== 0 && <span className={`ml-1 ${doublesEloDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>({doublesEloDelta > 0 ? '+' : ''}{doublesEloDelta})</span>}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{player.doubles_wins ?? 0}<span className="text-muted font-normal text-base">W</span> {player.doubles_losses ?? 0}<span className="text-muted font-normal text-base">L</span></p>
                    <p className="text-xs text-muted">{doublesGames} games · {doublesWinRate ?? '—'}% win</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Reset ELO button */}
            <div className="mt-4 pt-3 border-t border-theme flex items-center gap-3">
              {confirmReset ? (
                <>
                  <span className="text-xs text-red-400">Reset this player's ELO to 1000 and clear all history?</span>
                  <button onClick={handleResetElo} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">Confirm reset</button>
                  <button onClick={() => setConfirmReset(false)} className="text-xs text-muted hover:text-primary transition-colors">Cancel</button>
                </>
              ) : (
                <button onClick={handleResetElo} className="text-xs text-muted hover:text-red-400 transition-colors">
                  Reset ELO history
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ELO history chart */}
        {!hideElo && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">ELO Progression</h2>
              <div className="flex gap-1 bg-input p-0.5 rounded-md border border-theme">
                <button
                  onClick={() => setEloTab('singles')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${eloTab === 'singles' ? 'bg-green-600 text-white' : 'text-secondary hover:text-primary'}`}
                >
                  Singles
                </button>
                <button
                  onClick={() => setEloTab('doubles')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${eloTab === 'doubles' ? 'bg-blue-600 text-white' : 'text-secondary hover:text-primary'}`}
                >
                  Doubles
                </button>
              </div>
            </div>
            <EloChart
              history={eloTab === 'singles' ? eloHistory : (eloHistoryDoubles ?? [])}
              currentElo={eloTab === 'singles' ? player.elo : (player.elo_doubles ?? 1000)}
            />
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
              <RecentMatchCard key={m.id} match={m} playerId={player.id} hideElo={hideElo} onDelete={handleDeleteMatch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
