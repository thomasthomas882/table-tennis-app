import { useState, useEffect } from 'react';
import { sounds } from '../utils/sounds';
import { useApp } from '../App';
import { api } from '../api';
import { Match } from '../types';

/** Parse SQLite UTC datetime string to a local Date object */
function parseUTC(s: string) {
  return new Date(s.includes('T') ? s + (s.endsWith('Z') ? '' : 'Z') : s.replace(' ', 'T') + 'Z');
}

function PingPongAnimation() {
  const DUR = '2.2s';
  // Ball travels between the two paddles; paddles sit at x=18 and x=162
  const ballX   = '18;88;162;88;18';
  const ballY   = '34;8;34;8;34';
  const times   = '0;0.25;0.5;0.75;1';
  const splines = '0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1';
  // Specular highlight offset: +2 in x, -3 in y (inside the ball, not on the edge)
  const hlX = '20;90;164;90;20';
  const hlY = '31;5;31;5;31';

  return (
    <div className="flex justify-center items-center py-1">
      {/* viewBox expanded left/right to fully show rotating paddles */}
      <svg width="196" height="60" viewBox="-10 -4 196 60" fill="none">
        <defs>
          <style>{`
            @keyframes ppSwingL {
              0%   { transform: rotate(-7deg); }
              4%   { transform: rotate(14deg); }
              18%  { transform: rotate(-7deg); }
              100% { transform: rotate(-7deg); }
            }
            @keyframes ppSwingR {
              0%   { transform: rotate(7deg); }
              50%  { transform: rotate(7deg); }
              54%  { transform: rotate(-14deg); }
              68%  { transform: rotate(7deg); }
              100% { transform: rotate(7deg); }
            }
            .pp-paddle-l {
              transform-box: fill-box;
              transform-origin: 50% 85%;
              animation: ppSwingL ${DUR} ease-in-out infinite;
            }
            .pp-paddle-r {
              transform-box: fill-box;
              transform-origin: 50% 85%;
              animation: ppSwingR ${DUR} ease-in-out infinite;
            }
          `}</style>

          <linearGradient id="ppTableGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#166534"/>
            <stop offset="100%" stopColor="#14532d"/>
          </linearGradient>
          <linearGradient id="ppEdgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15803d"/>
            <stop offset="100%" stopColor="#052e16"/>
          </linearGradient>
          <radialGradient id="ppBallGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="60%" stopColor="#f0f0e8"/>
            <stop offset="100%" stopColor="#d4d4c8"/>
          </radialGradient>
          <radialGradient id="ppPaddleGrad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fb923c"/>
            <stop offset="100%" stopColor="#c2410c"/>
          </radialGradient>
        </defs>

        {/* ── Table (narrowed to leave paddle room) ── */}
        <rect x="28" y="38" width="124" height="5" rx="1" fill="url(#ppEdgeGrad)" opacity="0.9"/>
        <rect x="28" y="28" width="124" height="12" rx="2" fill="url(#ppTableGrad)"/>
        <rect x="28" y="28" width="124" height="1.5" rx="0.5" fill="white" opacity="0.25"/>
        <line x1="30" y1="29.5" x2="30" y2="37.5" stroke="white" strokeWidth="1" opacity="0.15"/>
        <line x1="150" y1="29.5" x2="150" y2="37.5" stroke="white" strokeWidth="1" opacity="0.15"/>
        <line x1="88" y1="29.5" x2="88" y2="37.5" stroke="white" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.3"/>
        {/* Net */}
        <rect x="85.5" y="20" width="1.5" height="9" rx="0.5" fill="#94a3b8" opacity="0.8"/>
        <rect x="89" y="20" width="1.5" height="9" rx="0.5" fill="#94a3b8" opacity="0.8"/>
        <line x1="86" y1="20" x2="90" y2="20" stroke="white" strokeWidth="1.2" opacity="0.7"/>

        {/* ── Left paddle ── */}
        <g className="pp-paddle-l">
          <rect x="14" y="33" width="6" height="13" rx="3" fill="#78350f"/>
          <ellipse cx="18" cy="24" rx="8" ry="11" fill="#d97706" opacity="0.9"/>
          <ellipse cx="18" cy="24" rx="7" ry="10" fill="url(#ppPaddleGrad)"/>
          <ellipse cx="16" cy="19" rx="2.5" ry="3.5" fill="white" opacity="0.2"/>
        </g>

        {/* ── Right paddle ── */}
        <g className="pp-paddle-r">
          <rect x="160" y="33" width="6" height="13" rx="3" fill="#78350f"/>
          <ellipse cx="162" cy="24" rx="8" ry="11" fill="#d97706" opacity="0.9"/>
          <ellipse cx="162" cy="24" rx="7" ry="10" fill="url(#ppPaddleGrad)"/>
          <ellipse cx="160" cy="19" rx="2.5" ry="3.5" fill="white" opacity="0.2"/>
        </g>

        {/* ── Ball shadow ── */}
        <ellipse cy="37.5" ry="1.8" fill="black" opacity="0.25">
          <animate attributeName="cx"
            values={ballX} keyTimes={times} dur={DUR} repeatCount="indefinite"
            calcMode="spline" keySplines={splines}/>
          <animate attributeName="rx"
            values="5;1.5;5;1.5;5" keyTimes={times} dur={DUR} repeatCount="indefinite"/>
          <animate attributeName="opacity"
            values="0.28;0.06;0.28;0.06;0.28" keyTimes={times} dur={DUR} repeatCount="indefinite"/>
        </ellipse>

        {/* ── Ball ── */}
        <circle r="6" fill="url(#ppBallGrad)">
          <animate attributeName="cx"
            values={ballX} keyTimes={times} dur={DUR} repeatCount="indefinite"
            calcMode="spline" keySplines={splines}/>
          <animate attributeName="cy"
            values={ballY} keyTimes={times} dur={DUR} repeatCount="indefinite"
            calcMode="spline" keySplines={splines}/>
        </circle>

        {/* ── Ball specular highlight (offset -3 from center so it stays inside the ball) ── */}
        <circle r="2" fill="white" opacity="0.65">
          <animate attributeName="cx"
            values={hlX} keyTimes={times} dur={DUR} repeatCount="indefinite"
            calcMode="spline" keySplines={splines}/>
          <animate attributeName="cy"
            values={hlY} keyTimes={times} dur={DUR} repeatCount="indefinite"
            calcMode="spline" keySplines={splines}/>
        </circle>
      </svg>
    </div>
  );
}

function DoublesAnimation() {
  // 4.4s cycle — each of the 4 paddles swings once per cycle (every 1.1s)
  const DUR = '4.4s';
  const ballX   = '18;88;162;88;18;88;162;88;18';
  const ballY   = '34;8;34;8;34;8;34;8;34';
  const times   = '0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1';
  const splines = '0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1';
  const hlX = '20;90;164;90;20;90;164;90;20';
  const hlY = '31;5;31;5;31;5;31;5;31';

  return (
    <div className="flex justify-center items-center py-1">
      <svg width="196" height="66" viewBox="-10 -4 196 66" fill="none">
        <defs>
          <style>{`
            /* L1 hits at t=0%, L2 hits at t=50% */
            @keyframes ppDblL1 {
              0%   { transform: rotate(-7deg); }
              4%   { transform: rotate(14deg); }
              14%  { transform: rotate(-7deg); }
              100% { transform: rotate(-7deg); }
            }
            @keyframes ppDblL2 {
              0%   { transform: rotate(-7deg); }
              50%  { transform: rotate(-7deg); }
              54%  { transform: rotate(14deg); }
              64%  { transform: rotate(-7deg); }
              100% { transform: rotate(-7deg); }
            }
            /* R1 hits at t=25%, R2 hits at t=75% */
            @keyframes ppDblR1 {
              0%   { transform: rotate(7deg); }
              25%  { transform: rotate(7deg); }
              29%  { transform: rotate(-14deg); }
              39%  { transform: rotate(7deg); }
              100% { transform: rotate(7deg); }
            }
            @keyframes ppDblR2 {
              0%   { transform: rotate(7deg); }
              75%  { transform: rotate(7deg); }
              79%  { transform: rotate(-14deg); }
              89%  { transform: rotate(7deg); }
              100% { transform: rotate(7deg); }
            }
            .pp-dbl-l1 { transform-box: fill-box; transform-origin: 50% 85%; animation: ppDblL1 ${DUR} ease-in-out infinite; }
            .pp-dbl-l2 { transform-box: fill-box; transform-origin: 50% 85%; animation: ppDblL2 ${DUR} ease-in-out infinite; }
            .pp-dbl-r1 { transform-box: fill-box; transform-origin: 50% 85%; animation: ppDblR1 ${DUR} ease-in-out infinite; }
            .pp-dbl-r2 { transform-box: fill-box; transform-origin: 50% 85%; animation: ppDblR2 ${DUR} ease-in-out infinite; }
          `}</style>

          <linearGradient id="dblTableGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#166534"/><stop offset="100%" stopColor="#14532d"/>
          </linearGradient>
          <linearGradient id="dblEdgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15803d"/><stop offset="100%" stopColor="#052e16"/>
          </linearGradient>
          <radialGradient id="dblBallGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#ffffff"/><stop offset="60%" stopColor="#f0f0e8"/><stop offset="100%" stopColor="#d4d4c8"/>
          </radialGradient>
          <radialGradient id="dblPaddleGrad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fb923c"/><stop offset="100%" stopColor="#c2410c"/>
          </radialGradient>
        </defs>

        {/* ── Table ── */}
        <rect x="28" y="42" width="124" height="5" rx="1" fill="url(#dblEdgeGrad)" opacity="0.9"/>
        <rect x="28" y="32" width="124" height="12" rx="2" fill="url(#dblTableGrad)"/>
        <rect x="28" y="32" width="124" height="1.5" rx="0.5" fill="white" opacity="0.25"/>
        <line x1="88" y1="33.5" x2="88" y2="41.5" stroke="white" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.3"/>
        {/* Net */}
        <rect x="85.5" y="24" width="1.5" height="9" rx="0.5" fill="#94a3b8" opacity="0.8"/>
        <rect x="89"   y="24" width="1.5" height="9" rx="0.5" fill="#94a3b8" opacity="0.8"/>
        <line x1="86" y1="24" x2="90" y2="24" stroke="white" strokeWidth="1.2" opacity="0.7"/>

        {/* ── Left paddle 1 (upper) — hits at t=0% ── */}
        <g className="pp-dbl-l1">
          <rect x="14" y="33" width="5" height="12" rx="2.5" fill="#78350f"/>
          <ellipse cx="17" cy="22" rx="7" ry="10" fill="#d97706" opacity="0.9"/>
          <ellipse cx="17" cy="22" rx="6" ry="9"  fill="url(#dblPaddleGrad)"/>
          <ellipse cx="15" cy="17" rx="2" ry="3"  fill="white" opacity="0.2"/>
        </g>

        {/* ── Left paddle 2 (lower) — hits at t=50% ── */}
        <g className="pp-dbl-l2">
          <rect x="14" y="42" width="5" height="10" rx="2.5" fill="#78350f"/>
          <ellipse cx="17" cy="34" rx="7" ry="8"  fill="#d97706" opacity="0.85"/>
          <ellipse cx="17" cy="34" rx="6" ry="7"  fill="url(#dblPaddleGrad)"/>
          <ellipse cx="15" cy="30" rx="2" ry="2.5" fill="white" opacity="0.2"/>
        </g>

        {/* ── Right paddle 1 (upper) — hits at t=25% ── */}
        <g className="pp-dbl-r1">
          <rect x="161" y="33" width="5" height="12" rx="2.5" fill="#78350f"/>
          <ellipse cx="163" cy="22" rx="7" ry="10" fill="#d97706" opacity="0.9"/>
          <ellipse cx="163" cy="22" rx="6" ry="9"  fill="url(#dblPaddleGrad)"/>
          <ellipse cx="161" cy="17" rx="2" ry="3"  fill="white" opacity="0.2"/>
        </g>

        {/* ── Right paddle 2 (lower) — hits at t=75% ── */}
        <g className="pp-dbl-r2">
          <rect x="161" y="42" width="5" height="10" rx="2.5" fill="#78350f"/>
          <ellipse cx="163" cy="34" rx="7" ry="8"  fill="#d97706" opacity="0.85"/>
          <ellipse cx="163" cy="34" rx="6" ry="7"  fill="url(#dblPaddleGrad)"/>
          <ellipse cx="161" cy="30" rx="2" ry="2.5" fill="white" opacity="0.2"/>
        </g>

        {/* ── Ball shadow ── */}
        <ellipse cy="41.5" ry="1.8" fill="black" opacity="0.25">
          <animate attributeName="cx" values={ballX} keyTimes={times} dur={DUR} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
          <animate attributeName="rx" values="5;1.5;5;1.5;5;1.5;5;1.5;5" keyTimes={times} dur={DUR} repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.28;0.06;0.28;0.06;0.28;0.06;0.28;0.06;0.28" keyTimes={times} dur={DUR} repeatCount="indefinite"/>
        </ellipse>

        {/* ── Ball ── */}
        <circle r="6" fill="url(#dblBallGrad)">
          <animate attributeName="cx" values={ballX} keyTimes={times} dur={DUR} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
          <animate attributeName="cy" values={ballY} keyTimes={times} dur={DUR} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
        </circle>

        {/* ── Specular highlight ── */}
        <circle r="2" fill="white" opacity="0.65">
          <animate attributeName="cx" values={hlX} keyTimes={times} dur={DUR} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
          <animate attributeName="cy" values={hlY} keyTimes={times} dur={DUR} repeatCount="indefinite" calcMode="spline" keySplines={splines}/>
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
  const { hideElo } = useApp();
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
      {!hideElo && <p className="text-xs text-faint mb-2">ELO {elos.filter(Boolean).join(' / ')}</p>}
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
    sounds.drop();
    try { await api.updateScore(match.id, p1Score, p2Score); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function completeMatch(winnerId: number) {
    setCompleting(true);
    sounds.startMatch();
    try { await api.completeMatch(match.id, winnerId); }
    catch (e) { console.error(e); }
    finally { setCompleting(false); }
  }

  async function handleVoid() {
    if (!confirmVoid) { sounds.void(); setConfirmVoid(true); return; }
    setVoiding(true);
    sounds.void();
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
            <button onClick={() => { sounds.scoreDown(); setP1Score(s => Math.max(0, s - 1)); }}
              className="w-9 h-9 rounded-lg bg-card border border-theme hover:border-hover font-bold transition-colors text-sm">−</button>
            <button onClick={() => { sounds.scoreUp(); setP1Score(s => s + 1); }}
              className="w-9 h-9 rounded-lg bg-card border border-theme hover:border-hover font-bold transition-colors text-sm">+</button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          {isDoubles ? <DoublesAnimation /> : <PingPongAnimation />}
          <span className="text-xs text-faint font-medium tracking-widest">VS</span>
        </div>

        {/* Team B */}
        <div className="text-center">
          <PlayerTeamDisplay names={teamBNames} elos={teamBElos} leading={p2Leading} />
          <ScoreDisplay value={p2Score} flash={p2Flash} />
          <div className="flex items-center justify-center gap-2 mt-2">
            <button onClick={() => { sounds.scoreDown(); setP2Score(s => Math.max(0, s - 1)); }}
              className="w-9 h-9 rounded-lg bg-card border border-theme hover:border-hover font-bold transition-colors text-sm">−</button>
            <button onClick={() => { sounds.scoreUp(); setP2Score(s => s + 1); }}
              className="w-9 h-9 rounded-lg bg-card border border-theme hover:border-hover font-bold transition-colors text-sm">+</button>
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
            <button onClick={() => { sounds.cancel(); setConfirmVoid(false); }}
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
