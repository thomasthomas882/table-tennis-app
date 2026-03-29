import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { Match } from '../types';

/** Parse SQLite UTC datetime string to a local Date object */
function parseUTC(s: string) {
  return new Date(s.includes('T') ? s + (s.endsWith('Z') ? '' : 'Z') : s.replace(' ', 'T') + 'Z');
}

function PingPongAnimation() {
  // Duration of one full rally cycle
  const D = '2.2s';
  // Ball travels left→peak→right→peak→left
  // Arc peaks are higher and asymmetric for realism
  const ballX   = '18;75;158;75;18';
  const ballY   = '34;6;34;6;34';
  const times   = '0;0.25;0.5;0.75;1';
  const splines = '0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1';

  return (
    <div className="flex justify-center items-center py-1">
      <svg width="176" height="56" viewBox="0 0 176 56" fill="none">
        <defs>
          {/* Table felt gradient */}
          <linearGradient id="tableGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#166534"/>
            <stop offset="100%" stopColor="#14532d"/>
          </linearGradient>
          {/* Table edge shadow */}
          <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15803d"/>
            <stop offset="100%" stopColor="#052e16"/>
          </linearGradient>
          {/* Ball gradient for 3-D look */}
          <radialGradient id="ballGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="60%" stopColor="#f0f0e8"/>
            <stop offset="100%" stopColor="#d4d4c8"/>
          </radialGradient>
          {/* Paddle rubber */}
          <radialGradient id="paddleGrad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fb923c"/>
            <stop offset="100%" stopColor="#c2410c"/>
          </radialGradient>
        </defs>

        {/* ── Table surface ── */}
        {/* Side panels (3-D depth) */}
        <rect x="14" y="38" width="148" height="5" rx="1" fill="url(#edgeGrad)" opacity="0.9"/>
        {/* Main felt */}
        <rect x="14" y="28" width="148" height="12" rx="2" fill="url(#tableGrad)"/>
        {/* White boundary lines */}
        <rect x="14" y="28" width="148" height="1.5" rx="0.5" fill="white" opacity="0.25"/>
        <rect x="14" y="37.5" width="148" height="1" rx="0.5" fill="white" opacity="0.12"/>
        <line x1="16" y1="29.5" x2="16" y2="37.5" stroke="white" strokeWidth="1" opacity="0.15"/>
        <line x1="160" y1="29.5" x2="160" y2="37.5" stroke="white" strokeWidth="1" opacity="0.15"/>
        {/* Center line */}
        <line x1="88" y1="29.5" x2="88" y2="37.5" stroke="white" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.3"/>
        {/* Net post left */}
        <rect x="85.5" y="21" width="1.5" height="8" rx="0.5" fill="#94a3b8" opacity="0.7"/>
        {/* Net post right */}
        <rect x="89" y="21" width="1.5" height="8" rx="0.5" fill="#94a3b8" opacity="0.7"/>
        {/* Net fabric */}
        <rect x="86" y="21" width="4" height="7" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4"
          style={{ strokeDasharray: '1.2 1.8' }}/>
        <line x1="86" y1="21" x2="90" y2="21" stroke="white" strokeWidth="1" opacity="0.6"/>
        <line x1="86" y1="28" x2="90" y2="28" stroke="white" strokeWidth="0.8" opacity="0.4"/>

        {/* ── Left player — handle + paddle ── */}
        {/* Handle */}
        <rect x="3" y="34" width="5" height="11" rx="2.5" fill="#78350f"/>
        {/* Paddle blade (wood layer) */}
        <ellipse cx="10" cy="26" rx="7" ry="10" fill="#d97706" opacity="0.9">
          <animateTransform attributeName="transform" type="rotate"
            values="-8 10 26;5 10 26;-8 10 26"
            keyTimes="0;0.05;0.12"
            dur={D} repeatCount="indefinite"
            calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </ellipse>
        {/* Paddle rubber (red face) */}
        <ellipse cx="10" cy="26" rx="6" ry="9" fill="url(#paddleGrad)">
          <animateTransform attributeName="transform" type="rotate"
            values="-8 10 26;5 10 26;-8 10 26"
            keyTimes="0;0.05;0.12"
            dur={D} repeatCount="indefinite"
            calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </ellipse>
        {/* Paddle sheen */}
        <ellipse cx="8" cy="21" rx="2.5" ry="3.5" fill="white" opacity="0.18">
          <animateTransform attributeName="transform" type="rotate"
            values="-8 10 26;5 10 26;-8 10 26"
            keyTimes="0;0.05;0.12"
            dur={D} repeatCount="indefinite"
            calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </ellipse>

        {/* ── Right player — handle + paddle ── */}
        <rect x="168" y="34" width="5" height="11" rx="2.5" fill="#78350f"/>
        <ellipse cx="166" cy="26" rx="7" ry="10" fill="#d97706" opacity="0.9">
          <animateTransform attributeName="transform" type="rotate"
            values="8 166 26;-5 166 26;8 166 26"
            keyTimes="0.5;0.55;0.62"
            dur={D} repeatCount="indefinite"
            calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </ellipse>
        <ellipse cx="166" cy="26" rx="6" ry="9" fill="url(#paddleGrad)">
          <animateTransform attributeName="transform" type="rotate"
            values="8 166 26;-5 166 26;8 166 26"
            keyTimes="0.5;0.55;0.62"
            dur={D} repeatCount="indefinite"
            calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </ellipse>
        <ellipse cx="164" cy="21" rx="2.5" ry="3.5" fill="white" opacity="0.18">
          <animateTransform attributeName="transform" type="rotate"
            values="8 166 26;-5 166 26;8 166 26"
            keyTimes="0.5;0.55;0.62"
            dur={D} repeatCount="indefinite"
            calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </ellipse>

        {/* ── Ball shadow on table ── */}
        <ellipse cy="37" ry="1.8" fill="black" opacity="0.25">
          <animate attributeName="cx" values={ballX} keyTimes={times} dur={D} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
          {/* Shadow squishes as ball gets closer to table */}
          <animate attributeName="rx" values="5;2;5;2;5" keyTimes={times} dur={D} repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.25;0.07;0.25;0.07;0.25" keyTimes={times} dur={D} repeatCount="indefinite"/>
        </ellipse>

        {/* ── Ball (main) ── */}
        <circle r="6" fill="url(#ballGrad)">
          <animate attributeName="cx" values={ballX} keyTimes={times} dur={D} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
          <animate attributeName="cy" values={ballY} keyTimes={times} dur={D} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
        </circle>

        {/* ── Spin seam on the ball ── */}
        <ellipse rx="6" ry="2.2" fill="none" stroke="#c8c8be" strokeWidth="0.8" opacity="0.5">
          <animate attributeName="cx" values={ballX} keyTimes={times} dur={D} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
          <animate attributeName="cy" values={ballY} keyTimes={times} dur={D} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
          <animateTransform attributeName="transform" type="rotate"
            values="0;360;720;1080;1440"
            keyTimes={times} dur={D} repeatCount="indefinite"/>
        </ellipse>

        {/* ── Ball specular highlight ── */}
        <circle r="2" fill="white" opacity="0.7">
          <animate attributeName="cx" values="21;78;161;78;21" keyTimes={times} dur={D} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
          <animate attributeName="cy" values="30;2;30;2;30" keyTimes={times} dur={D} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
        </circle>

        {/* ── Impact flash (left) ── */}
        <circle cx="18" cy="28" r="4" fill="#fed7aa" opacity="0">
          <animate attributeName="opacity" values="0;0.6;0;0;0" keyTimes="0;0.04;0.1;0.5;1" dur={D} repeatCount="indefinite"/>
          <animate attributeName="r" values="2;6;2;2;2" keyTimes="0;0.04;0.1;0.5;1" dur={D} repeatCount="indefinite"/>
        </circle>

        {/* ── Impact flash (right) ── */}
        <circle cx="158" cy="28" r="4" fill="#fed7aa" opacity="0">
          <animate attributeName="opacity" values="0;0;0;0.6;0" keyTimes="0;0.46;0.5;0.54;0.6" dur={D} repeatCount="indefinite"/>
          <animate attributeName="r" values="2;2;2;6;2" keyTimes="0;0.46;0.5;0.54;0.6" dur={D} repeatCount="indefinite"/>
        </circle>
      </svg>
    </div>
  );
}

function Stopwatch({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = parseUTC(startedAt).getTime();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const warn = elapsed > 1800; // > 30 min

  return (
    <span className={`font-mono tabular-nums text-xs font-semibold ${warn ? 'text-red-400' : 'text-orange-400'}`}>
      ⏱ {h > 0 ? `${h}:` : ''}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function ScoreDisplay({ value, flash }: { value: number; flash: boolean }) {
  return (
    <span className={`text-5xl font-bold tabular-nums transition-all duration-150 ${flash ? 'text-green-300 scale-125' : 'text-green-400 scale-100'} inline-block`}>
      {value}
    </span>
  );
}

function PlayerTeamDisplay({ names, elos, leading }: { names: string[]; elos: (number | null)[]; leading: boolean }) {
  return (
    <div className={`text-center transition-opacity duration-300 ${leading ? 'opacity-100' : 'opacity-60'}`}>
      {names.map((name, i) => (
        <div key={i} className={`inline-flex w-10 h-10 rounded-full items-center justify-center text-lg font-bold mb-1 mx-0.5 ${leading ? 'bg-green-500/20 text-green-400' : 'bg-card border border-theme text-secondary'}`}>
          {name[0].toUpperCase()}
        </div>
      ))}
      <p className={`text-sm font-semibold truncate ${leading ? 'text-primary' : 'text-secondary'}`}>
        {names.join(' & ')}
      </p>
      <p className="text-xs text-faint mb-2">ELO {elos.filter(Boolean).join(' / ')}</p>
    </div>
  );
}

function ActiveMatchCard({ match }: { match: Match }) {
  const [p1Score, setP1Score] = useState(match.player1_score);
  const [p2Score, setP2Score] = useState(match.player2_score);
  const [p1Flash, setP1Flash] = useState(false);
  const [p2Flash, setP2Flash] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);

  const isDoubles = !!(match.player3_id || match.player4_id);

  useEffect(() => {
    setP1Score(match.player1_score);
    setP1Flash(true);
    const t = setTimeout(() => setP1Flash(false), 300);
    return () => clearTimeout(t);
  }, [match.player1_score]);

  useEffect(() => {
    setP2Score(match.player2_score);
    setP2Flash(true);
    const t = setTimeout(() => setP2Flash(false), 300);
    return () => clearTimeout(t);
  }, [match.player2_score]);

  async function saveScore() {
    setSaving(true);
    try { await api.updateScore(match.id, p1Score, p2Score); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function completeMatch(winnerId: number) {
    setCompleting(true);
    try { await api.completeMatch(match.id, winnerId); }
    catch (e) { console.error(e); }
    finally { setCompleting(false); }
  }

  async function handleVoid() {
    if (!confirmVoid) { setConfirmVoid(true); return; }
    setVoiding(true);
    try { await api.voidMatch(match.id); }
    catch (e) { console.error(e); }
    finally { setVoiding(false); setConfirmVoid(false); }
  }

  const p1Leading = p1Score > p2Score;
  const p2Leading = p2Score > p1Score;

  const teamANames = [match.player1_name, match.player3_name].filter(Boolean) as string[];
  const teamBNames = [match.player2_name, match.player4_name].filter(Boolean) as string[];
  const teamAElos  = [match.player1_elo, match.player3_elo];
  const teamBElos  = [match.player2_elo, match.player4_elo];

  return (
    <div className="relative rounded-xl border border-orange-500/40 bg-card p-5 shadow-[0_0_24px_rgba(249,115,22,0.12)] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
            LIVE {isDoubles && '· DOUBLES'}
          </span>
          <Stopwatch startedAt={match.created_at} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          {match.table_name && <span className="text-secondary">📍 {match.table_name}</span>}
          <span>{parseUTC(match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Players + animation */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
        {/* Team A */}
        <div className="text-center">
          <PlayerTeamDisplay names={teamANames} elos={teamAElos} leading={p1Leading} />
          <ScoreDisplay value={p1Score} flash={p1Flash} />
          <div className="flex items-center justify-center gap-2 mt-2">
            <button onClick={() => setP1Score(s => Math.max(0, s - 1))}
              className="w-7 h-7 rounded-lg bg-card border border-theme hover:border-hover font-bold transition-colors text-sm">−</button>
            <button onClick={() => setP1Score(s => s + 1)}
              className="w-7 h-7 rounded-lg bg-card border border-theme hover:border-hover font-bold transition-colors text-sm">+</button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <PingPongAnimation />
          <span className="text-xs text-faint font-medium tracking-widest">VS</span>
        </div>

        {/* Team B */}
        <div className="text-center">
          <PlayerTeamDisplay names={teamBNames} elos={teamBElos} leading={p2Leading} />
          <ScoreDisplay value={p2Score} flash={p2Flash} />
          <div className="flex items-center justify-center gap-2 mt-2">
            <button onClick={() => setP2Score(s => Math.max(0, s - 1))}
              className="w-7 h-7 rounded-lg bg-card border border-theme hover:border-hover font-bold transition-colors text-sm">−</button>
            <button onClick={() => setP2Score(s => s + 1)}
              className="w-7 h-7 rounded-lg bg-card border border-theme hover:border-hover font-bold transition-colors text-sm">+</button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-theme/60">
        <button onClick={saveScore}
          disabled={saving || (p1Score === match.player1_score && p2Score === match.player2_score)}
          className="btn-secondary text-sm py-1.5 px-3">
          {saving ? 'Saving…' : 'Update Score'}
        </button>
        <button onClick={() => completeMatch(match.player1_id)} disabled={completing}
          className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/40 text-blue-300 font-medium px-3 py-1.5 rounded-lg text-sm transition-all">
          {isDoubles ? 'Team A wins 🏆' : `${match.player1_name.split(' ')[0]} wins 🏆`}
        </button>
        <button onClick={() => completeMatch(match.player2_id)} disabled={completing}
          className="flex-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-600/40 text-purple-300 font-medium px-3 py-1.5 rounded-lg text-sm transition-all">
          {isDoubles ? 'Team B wins 🏆' : `${match.player2_name.split(' ')[0]} wins 🏆`}
        </button>
        {confirmVoid ? (
          <div className="flex items-center gap-1.5 animate-slide-up">
            <span className="text-xs text-muted">Confirm void?</span>
            <button onClick={handleVoid} disabled={voiding}
              className="bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-300 text-xs px-2 py-1.5 rounded-lg transition-all">
              {voiding ? '…' : 'Void'}
            </button>
            <button onClick={() => setConfirmVoid(false)}
              className="text-muted hover:text-primary text-xs px-2 py-1.5 rounded-lg transition-all">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={handleVoid}
            className="bg-red-600/15 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-medium px-3 py-1.5 rounded-lg text-sm transition-all">
            Void
          </button>
        )}
      </div>
    </div>
  );
}

function CompletedMatchCard({ match }: { match: Match }) {
  const p1Won = match.winner_id === match.player1_id;
  const p2Won = match.winner_id === match.player2_id;
  const isDoubles = !!(match.player3_id || match.player4_id);

  const teamALabel = isDoubles
    ? [match.player1_name, match.player3_name].filter(Boolean).join(' & ')
    : match.player1_name;
  const teamBLabel = isDoubles
    ? [match.player2_name, match.player4_name].filter(Boolean).join(' & ')
    : match.player2_name;

  return (
    <div className="card hover:border-hover transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <span className="badge bg-card border border-theme text-secondary">
          {isDoubles ? 'Doubles' : 'Completed'}
        </span>
        <span className="text-xs text-muted">
          {match.completed_at
            ? parseUTC(match.completed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : ''}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex-1 text-center p-2 rounded-lg ${p1Won ? 'bg-green-500/10' : ''}`}>
          <p className={`text-sm font-medium ${p1Won ? 'text-primary' : 'text-muted'}`}>{teamALabel}</p>
          <p className={`text-3xl font-bold mt-0.5 ${p1Won ? 'text-green-400' : 'text-faint'}`}>{match.player1_score}</p>
          {p1Won && <p className="text-xs text-green-400 mt-0.5">Winner 🏆</p>}
        </div>
        <div className="text-faint font-bold text-sm">vs</div>
        <div className={`flex-1 text-center p-2 rounded-lg ${p2Won ? 'bg-green-500/10' : ''}`}>
          <p className={`text-sm font-medium ${p2Won ? 'text-primary' : 'text-muted'}`}>{teamBLabel}</p>
          <p className={`text-3xl font-bold mt-0.5 ${p2Won ? 'text-green-400' : 'text-faint'}`}>{match.player2_score}</p>
          {p2Won && <p className="text-xs text-green-400 mt-0.5">Winner 🏆</p>}
        </div>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const { activeMatches } = useApp();
  const [completed, setCompleted] = useState<Match[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    api.getMatches('completed')
      .then((m) => setCompleted(m as Match[]))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [activeMatches]);

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold">Matches</h1>

      <section>
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          Active Matches
          {activeMatches.length > 0 && (
            <span className="badge bg-orange-500/20 text-orange-400">{activeMatches.length}</span>
          )}
        </h2>
        {activeMatches.length === 0 ? (
          <div className="card text-center py-12 text-muted">
            <div className="text-5xl mb-3">🏓</div>
            <p>No active matches right now</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {activeMatches.map(m => <ActiveMatchCard key={m.id} match={m} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-4">Recent Matches</h2>
        {loadingHistory ? (
          <div className="text-muted text-sm">Loading…</div>
        ) : completed.length === 0 ? (
          <div className="card text-center py-8 text-muted">No completed matches yet</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {completed.map(m => <CompletedMatchCard key={m.id} match={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}
