import { useState, useEffect, useRef } from 'react';
import { sounds } from '../utils/sounds';
import { useApp } from '../App';
import { api } from '../api';
import { socket } from '../socket';
import { Match, Series } from '../types';

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
    <span className={`font-mono tabular-nums text-sm font-semibold ${warn ? 'text-red-400' : 'text-orange-400'}`}>
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

function ActiveMatchCard({ match, seriesContext }: { match: Match; seriesContext?: Series }) {
  const [p1Score, setP1Score] = useState(match.player1_score);
  const [p2Score, setP2Score] = useState(match.player2_score);
  const [p1Flash, setP1Flash] = useState(false);
  const [p2Flash, setP2Flash] = useState(false);
  const mountedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [confirmDraw, setConfirmDraw] = useState(false);
  const { skipMatchConfirm } = useApp();

  const isDoubles = !!(match.player3_id || match.player4_id);

  useEffect(() => {
    if (!mountedRef.current) return;
    setP1Score(match.player1_score);
    setP1Flash(true);
    const t = setTimeout(() => setP1Flash(false), 300);
    return () => clearTimeout(t);
  }, [match.player1_score]);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
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

  async function handleDraw() {
    if (!skipMatchConfirm && !confirmDraw) { setConfirmDraw(true); setConfirmVoid(false); return; }
    setDrawing(true);
    setConfirmDraw(false);
    try { await api.drawMatch(match.id); }
    catch (e) { console.error(e); }
    finally { setDrawing(false); }
  }

  async function handleVoid() {
    if (!skipMatchConfirm && !confirmVoid) { sounds.void(); setConfirmVoid(true); setConfirmDraw(false); return; }
    setVoiding(true);
    setConfirmVoid(false);
    sounds.void();
    try { await api.voidMatch(match.id); }
    catch (e) { console.error(e); }
    finally { setVoiding(false); }
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

      {/* Series context banner */}
      {seriesContext && (
        <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 mb-3 text-xs">
          <span className="text-blue-400 font-semibold">⚔️ Best of {seriesContext.format} Series</span>
          <span className="text-secondary tabular-nums">
            {seriesContext.wins1}–{seriesContext.wins2}
          </span>
        </div>
      )}

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
        {confirmDraw ? (
          <div className="flex items-center gap-1.5 animate-slide-up w-full">
            <span className="text-xs text-muted">Record as draw? No ELO changes.</span>
            <button onClick={handleDraw} disabled={drawing}
              className="bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/50 text-yellow-300 text-xs px-2 py-1.5 rounded-lg transition-all">
              {drawing ? '…' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmDraw(false)}
              className="text-muted hover:text-primary text-xs px-2 py-1.5 rounded-lg transition-all">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={handleDraw}
            className="bg-yellow-600/15 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-400 font-medium px-3 py-1.5 rounded-lg text-sm transition-all">
            Draw 🤝
          </button>
        )}
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
  const isDraw = match.winner_id === null;
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
        <span className={`badge border text-[10px] ${isDraw ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' : 'bg-card border-theme text-secondary'}`}>
          {isDraw ? 'Draw 🤝' : isDoubles ? 'Doubles' : 'Completed'}
        </span>
        <span className="text-xs text-muted">
          {match.completed_at
            ? parseUTC(match.completed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : ''}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex-1 text-center p-2 rounded-lg ${p1Won ? 'bg-green-500/10' : isDraw ? 'bg-yellow-500/5' : ''}`}>
          <p className={`text-sm font-medium ${p1Won ? 'text-primary' : isDraw ? 'text-yellow-300/80' : 'text-muted'}`}>{teamALabel}</p>
          <p className={`text-3xl font-bold mt-0.5 ${p1Won ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-faint'}`}>{match.player1_score}</p>
          {p1Won && <p className="text-xs text-green-400 mt-0.5">Winner 🏆</p>}
          {isDraw && <p className="text-xs text-yellow-400/70 mt-0.5">Draw</p>}
        </div>
        <div className="text-faint font-bold text-sm">vs</div>
        <div className={`flex-1 text-center p-2 rounded-lg ${p2Won ? 'bg-green-500/10' : isDraw ? 'bg-yellow-500/5' : ''}`}>
          <p className={`text-sm font-medium ${p2Won ? 'text-primary' : isDraw ? 'text-yellow-300/80' : 'text-muted'}`}>{teamBLabel}</p>
          <p className={`text-3xl font-bold mt-0.5 ${p2Won ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-faint'}`}>{match.player2_score}</p>
          {p2Won && <p className="text-xs text-green-400 mt-0.5">Winner 🏆</p>}
          {isDraw && <p className="text-xs text-yellow-400/70 mt-0.5">Draw</p>}
        </div>
      </div>
    </div>
  );
}

function SeriesProgressDots({ wins, needed, color }: { wins: number; needed: number; color: string }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: needed }).map((_, i) => (
        <span
          key={i}
          className={`w-3 h-3 rounded-full border ${i < wins ? `${color} border-transparent` : 'border-current opacity-30'}`}
        />
      ))}
    </div>
  );
}

function SeriesCard({ series, onCancel }: { series: Series; onCancel: (id: number) => void }) {
  const needed = Math.ceil(series.format / 2);
  const isCompleted = series.status === 'completed';

  return (
    <div className={`card transition-all duration-200 ${isCompleted ? 'border-green-500/30 bg-green-500/5' : 'hover:border-hover'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`badge text-[10px] ${isCompleted ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-blue-500/15 text-blue-400 border-blue-500/30'}`}>
          {isCompleted ? '🏆 Complete' : '⚔️ Active'} · Best of {series.format}
        </span>
        {!isCompleted && (
          <button
            onClick={() => onCancel(series.id)}
            className="text-faint hover:text-red-400 text-xs transition-colors"
            title="Cancel series"
          >Cancel</button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Player 1 */}
        <div className={`flex-1 text-center ${series.winner_id === series.player1_id ? 'opacity-100' : isCompleted ? 'opacity-50' : 'opacity-100'}`}>
          <p className={`font-semibold text-sm truncate mb-1 ${series.winner_id === series.player1_id ? 'text-green-400' : 'text-primary'}`}>
            {series.player1_name}
            {series.winner_id === series.player1_id && ' 🏆'}
          </p>
          <p className="text-3xl font-bold tabular-nums mb-2">{series.wins1}</p>
          <div className="flex justify-center">
            <SeriesProgressDots wins={series.wins1} needed={needed} color="bg-blue-400" />
          </div>
        </div>

        <div className="text-center px-2">
          <p className="text-faint text-xs font-bold">VS</p>
          <p className="text-xs text-muted mt-1">{needed} to win</p>
        </div>

        {/* Player 2 */}
        <div className={`flex-1 text-center ${series.winner_id === series.player2_id ? 'opacity-100' : isCompleted ? 'opacity-50' : 'opacity-100'}`}>
          <p className={`font-semibold text-sm truncate mb-1 ${series.winner_id === series.player2_id ? 'text-green-400' : 'text-primary'}`}>
            {series.player2_name}
            {series.winner_id === series.player2_id && ' 🏆'}
          </p>
          <p className="text-3xl font-bold tabular-nums mb-2">{series.wins2}</p>
          <div className="flex justify-center">
            <SeriesProgressDots wins={series.wins2} needed={needed} color="bg-purple-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StartSeriesModal({ players, tables, onClose, onCreate }: {
  players: { id: number; name: string }[];
  tables: { id: number; name: string; status: string }[];
  onClose: () => void;
  onCreate: (p1: number, p2: number, format: number, tableId: number) => Promise<void>;
}) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [format, setFormat] = useState(3);
  const [tableId, setTableId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const availableTables = tables.filter(t => t.status === 'available');

  async function handleCreate() {
    if (!p1 || !p2 || p1 === p2) { setError('Select two different players'); return; }
    if (!tableId) { setError('Select a table'); return; }
    setLoading(true); setError('');
    try {
      await onCreate(Number(p1), Number(p2), format, Number(tableId));
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-sm space-y-4 animate-pop-in">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Start Series</h3>
          <button onClick={onClose} className="text-muted hover:text-primary text-xl leading-none">×</button>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-secondary mb-1 font-medium">Player 1</label>
            <select value={p1} onChange={e => setP1(e.target.value)} className="input w-full">
              <option value="">Select player…</option>
              {players.map(p => (
                <option key={p.id} value={p.id} disabled={String(p.id) === p2}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1 font-medium">Player 2</label>
            <select value={p2} onChange={e => setP2(e.target.value)} className="input w-full">
              <option value="">Select player…</option>
              {players.map(p => (
                <option key={p.id} value={p.id} disabled={String(p.id) === p1}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1 font-medium">Table</label>
            <select value={tableId} onChange={e => setTableId(e.target.value)} className="input w-full">
              <option value="">Select table…</option>
              {availableTables.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {availableTables.length === 0 && (
              <p className="text-xs text-muted mt-1">No tables available right now</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1 font-medium">Format</label>
            <div className="flex gap-2">
              {[3, 5, 7].map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                    format === f
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-card border-theme text-secondary hover:border-hover'
                  }`}
                >
                  Best of {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleCreate} disabled={loading || !p1 || !p2 || p1 === p2 || !tableId}
            className="btn-primary flex-1">
            {loading ? 'Starting…' : 'Start Series'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const { activeMatches, players, tables } = useApp();
  const [completed, setCompleted] = useState<Match[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [series, setSeries] = useState<Series[]>([]);
  const [showSeriesModal, setShowSeriesModal] = useState(false);

  function fetchCompleted() {
    api.getMatches('completed')
      .then((m) => setCompleted(m as Match[]))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }

  function fetchAll() {
    fetchCompleted();
    api.getSeries().then(s => setSeries(s as Series[])).catch(() => {});
  }

  // Initial load + refresh on reconnect and match events
  useEffect(() => {
    fetchAll();
    const onSeriesUpdated = (s: Series[]) => setSeries(s);
    socket.on('connect', fetchAll);
    socket.on('match:completed', fetchCompleted);
    socket.on('series:updated', onSeriesUpdated);
    return () => {
      socket.off('connect', fetchAll);
      socket.off('match:completed', fetchCompleted);
      socket.off('series:updated', onSeriesUpdated);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateSeries(p1: number, p2: number, format: number, tableId: number) {
    await api.createSeries(p1, p2, format, tableId);
  }

  async function handleCancelSeries(id: number) {
    await api.cancelSeries(id);
  }

  const activeSeries = series.filter(s => s.status === 'active');
  const recentCompletedSeries = series.filter(s => s.status === 'completed').slice(0, 3);
  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold">Matches</h1>

      {/* Series Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            Series Mode
            {activeSeries.length > 0 && (
              <span className="badge bg-blue-500/20 text-blue-400">{activeSeries.length} active</span>
            )}
          </h2>
          <button onClick={() => setShowSeriesModal(true)} className="btn-secondary text-sm px-3 py-1.5">
            + Start Series
          </button>
        </div>

        {activeSeries.length === 0 && recentCompletedSeries.length === 0 ? (
          <div className="card text-center py-8 text-muted">
            <p className="text-3xl mb-2">⚔️</p>
            <p className="text-sm">No active series</p>
            <p className="text-xs mt-1">Start a Best-of series between two players to track results.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSeries.map(s => (
              <SeriesCard key={s.id} series={s} onCancel={handleCancelSeries} />
            ))}
            {recentCompletedSeries.map(s => (
              <SeriesCard key={s.id} series={s} onCancel={handleCancelSeries} />
            ))}
          </div>
        )}
      </section>

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
            {activeMatches.map(m => (
              <ActiveMatchCard
                key={m.id}
                match={m}
                seriesContext={m.series_id ? series.find(s => s.id === m.series_id) : undefined}
              />
            ))}
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

      {showSeriesModal && (
        <StartSeriesModal
          players={sortedPlayers}
          tables={tables}
          onClose={() => setShowSeriesModal(false)}
          onCreate={handleCreateSeries}
        />
      )}
    </div>
  );
}
