import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { Player, Table } from '../types';
import { SearchableSelect } from '../components/SearchableSelect';
import { sounds } from '../utils/sounds';
import { useTouchSort } from '../utils/useTouchSort';

function Stopwatch({ startedAt, tableName, isDoubles }: { startedAt: string, tableName: string, isDoubles: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const { matchTimeLimitSingles, matchTimeLimitDoubles } = useApp();

  useEffect(() => {
    const s = startedAt;
    const utcString = s.includes('T') ? s + (s.endsWith('Z') ? '' : 'Z') : s.replace(' ', 'T') + 'Z';
    const start = new Date(utcString).getTime();
    const update = () => {
      const currentElapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsed(currentElapsed);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const limitSeconds = (isDoubles ? matchTimeLimitDoubles : matchTimeLimitSingles) * 60;
  const warn = elapsed >= limitSeconds;
  return (
    <div className="flex flex-col items-center gap-1.5 animate-fade-in z-10">
      <div className="flex items-center gap-1.5 text-red-400 font-bold text-[10px] uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full border border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
        {warn ? 'Time Up' : 'Live'}
      </div>
      <span className={`font-mono tabular-nums text-3xl font-bold tracking-tight drop-shadow-md ${warn ? 'text-red-400 animate-pulse' : 'text-white'}`}>
        {h > 0 ? `${h}:` : ''}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
    </div>
  );
}

function formatWaitTime(joinedAt: string): string {
  const joined = new Date(
    joinedAt.includes('T')
      ? joinedAt + (joinedAt.endsWith('Z') ? '' : 'Z')
      : joinedAt.replace(' ', 'T') + 'Z'
  );
  const diffMs = Date.now() - joined.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
// ─── Types ───────────────────────────────────────────────────────────────────

interface TableSides { A: number[]; B: number[] }
type Assignments = { [tableId: number]: TableSides }

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-green-500/30 to-green-700/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold flex-shrink-0`}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ─── Player bubble on table ──────────────────────────────────────────────────

function PlayerBubbleOnTable({
  playerId, allPlayers, onRemove, side, compact, readOnly
}: {
  playerId: number; allPlayers: Player[]; onRemove: () => void;
  side: 'A' | 'B'; compact: boolean; readOnly?: boolean;
}) {
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) return null;

  const ring = compact ? 'w-11 h-11 text-sm' : 'w-12 h-12 text-base';
  const label = compact ? 'text-[10px] max-w-[48px]' : 'text-xs max-w-[60px]';

  return (
    <div
      className={`group relative flex flex-col items-center gap-0.5 ${
        side === 'A' ? 'animate-slide-in-left' : 'animate-slide-in-right'
      }`}
      style={{ transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
    >
      <div className="relative">
        <div
          className={`${ring} rounded-full bg-gradient-to-br from-green-400/40 to-green-600/30 border-2 border-green-400/60 flex items-center justify-center text-green-300 font-bold shadow-[0_0_10px_rgba(74,222,128,0.35)] transition-all duration-300`}
        >
          {player.name[0].toUpperCase()}
        </div>
        {!readOnly && (
          <button
            onClick={() => { sounds.remove(); onRemove(); }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          >×</button>
        )}
      </div>
      <span className={`${label} text-white/80 font-medium text-center truncate leading-tight transition-all duration-300`}>
        {player.name.split(' ')[0]}
      </span>
    </div>
  );
}

// ─── Table card ───────────────────────────────────────────────────────────────

interface TableCardProps {
  table: Table;
  sides: TableSides;
  dragOverSide: 'A' | 'B' | null;
  isDragOver: boolean;      // for reorder highlight
  isDragging: boolean;      // this card being dragged
  onDragOver: (e: React.DragEvent, side: 'A' | 'B') => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, side: 'A' | 'B') => void;
  onRemovePlayer: (playerId: number, side: 'A' | 'B') => void;
  onStartMatch: () => void;
  onClear: () => void;
  onCardDragStart: (e: React.DragEvent) => void;
  onCardDragOver: (e: React.DragEvent) => void;
  onCardDrop: (e: React.DragEvent) => void;
  allPlayers: Player[];
  starting: boolean;
  // Touch tap-to-assign
  selectedQueuePlayer: { id: number; name: string } | null;
  onTapSide: (tableId: number, side: 'A' | 'B') => void;
  matchStartedAt?: string;
  isDoubles?: boolean;
}

function TableCard({
  table, sides, dragOverSide, isDragOver, isDragging,
  onDragOver, onDragLeave, onDrop,
  onRemovePlayer, onStartMatch, onClear,
  onCardDragStart, onCardDragOver, onCardDrop,
  allPlayers, starting,
  selectedQueuePlayer, onTapSide,
  matchStartedAt, isDoubles,
  autoStartDeadline,
}: TableCardProps & { autoStartDeadline?: number }) {
  const canStart = sides.A.length > 0 && sides.B.length > 0;
  const isOccupied = table.status === 'occupied';
  const hasAssignments = sides.A.length + sides.B.length > 0;

  return (
    <div
      onDragOver={onCardDragOver}
      onDrop={onCardDrop}
      className={`card !p-4 space-y-3 transition-all duration-200 ${
        isDragging ? 'opacity-40 scale-95' : ''
      } ${isDragOver ? 'border-blue-400/60 bg-blue-400/5 scale-[1.01]' : ''} ${
        canStart && !isOccupied ? 'border-green-500/40 shadow-[0_0_20px_rgba(74,222,128,0.08)]' : ''
      }`}
    >
      {/* Header with drag handle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Table drag handle */}
          <span
            draggable
            onDragStart={e => { sounds.pickup(); onCardDragStart(e); }}
            className="text-muted cursor-grab active:cursor-grabbing text-base leading-none select-none hover:text-secondary transition-colors"
            title="Drag to reorder table"
          >⠿</span>
          <span className="font-semibold text-sm">{table.name}</span>
          {isOccupied && <span className="badge bg-orange-500/20 text-orange-400 text-[10px]">In Use</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`} />
          <span className="text-xs text-muted capitalize">{table.status}</span>
        </div>
      </div>

      {/* Table surface */}
      <div
        className={`relative rounded-xl overflow-hidden h-48 transition-all duration-200 ${isOccupied ? 'opacity-50' : ''}`}
        style={{ background: 'linear-gradient(160deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}
      >
        {/* Boundary lines */}
        <div className="absolute inset-[5px] border border-white/20 rounded-lg pointer-events-none" />
        {/* Center divider line */}
        <div className="absolute top-[5px] bottom-[5px] left-1/2 w-px bg-white/25 pointer-events-none" />
        
        {/* Auto-Start Timer Overlay */}
        {autoStartDeadline && !isOccupied && canStart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-fade-in">
            <div className="flex flex-col items-center gap-1 bg-gray-900/90 border border-theme px-4 py-2 rounded-xl shadow-2xl scale-110">
              <span className="text-[10px] text-green-400 font-bold tracking-widest uppercase animate-pulse">Starting</span>
              <span className="text-3xl font-mono font-bold text-white tabular-nums drop-shadow-md">
                {Math.max(0, Math.ceil((autoStartDeadline - Date.now()) / 1000))}s
              </span>
            </div>
          </div>
        )}

        {/* Net texture */}
        <div
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-3 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 3px, transparent 3px, transparent 7px)',
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            borderRight: '1px solid rgba(255,255,255,0.2)',
          }}
        />

        {/* Side A */}
        <div
          onDragOver={isOccupied ? undefined : e => onDragOver(e, 'A')}
          onDragLeave={isOccupied ? undefined : onDragLeave}
          onDrop={isOccupied ? undefined : e => onDrop(e, 'A')}
          onClick={selectedQueuePlayer && !isOccupied && sides.A.length < 2 ? () => onTapSide(table.id, 'A') : undefined}
          className={`absolute top-0 bottom-0 left-0 right-1/2 flex items-center justify-center transition-all duration-150 ${
            dragOverSide === 'A' && !isOccupied ? 'bg-blue-400/25' : ''
          } ${selectedQueuePlayer && !isOccupied && sides.A.length < 2 ? 'cursor-pointer bg-green-400/10' : ''}`}
        >
          <div className={`flex items-center justify-center gap-1 transition-all duration-300 ${sides.A.length === 2 ? 'flex-row' : 'flex-col'}`}>
            {sides.A.length === 0 && !isOccupied ? (
              <div className={`flex flex-col items-center gap-1 transition-opacity duration-200 ${dragOverSide === 'A' || (selectedQueuePlayer && sides.A.length < 2) ? 'opacity-100' : 'opacity-35'}`}>
                <span className="text-2xl">👤</span>
                <span className="text-[10px] text-white/50 font-medium">
                  {selectedQueuePlayer && sides.A.length < 2 ? `Tap to assign` : 'Side A'}
                </span>
              </div>
            ) : (
              sides.A.map(pid => (
                <PlayerBubbleOnTable
                  key={pid} playerId={pid} allPlayers={allPlayers} side="A"
                  onRemove={() => onRemovePlayer(pid, 'A')} compact={sides.A.length === 2}
                  readOnly={isOccupied}
                />
              ))
            )}
            {sides.A.length > 0 && sides.A.length < 2 && selectedQueuePlayer && !isOccupied && (
              <span className="text-[9px] text-green-400 font-medium">Tap to assign</span>
            )}
          </div>
          {dragOverSide === 'A' && !isOccupied && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl text-blue-300 animate-bubble-pop">＋</span>
            </div>
          )}
        </div>

        {/* Side B */}
        <div
          onDragOver={isOccupied ? undefined : e => onDragOver(e, 'B')}
          onDragLeave={isOccupied ? undefined : onDragLeave}
          onDrop={isOccupied ? undefined : e => onDrop(e, 'B')}
          onClick={selectedQueuePlayer && !isOccupied && sides.B.length < 2 ? () => onTapSide(table.id, 'B') : undefined}
          className={`absolute top-0 bottom-0 right-0 left-1/2 flex items-center justify-center transition-all duration-150 ${
            dragOverSide === 'B' && !isOccupied ? 'bg-purple-400/25' : ''
          } ${selectedQueuePlayer && !isOccupied && sides.B.length < 2 ? 'cursor-pointer bg-green-400/10' : ''}`}
        >
          <div className={`flex items-center justify-center gap-1 transition-all duration-300 ${sides.B.length === 2 ? 'flex-row' : 'flex-col'}`}>
            {sides.B.length === 0 && !isOccupied ? (
              <div className={`flex flex-col items-center gap-1 transition-opacity duration-200 ${dragOverSide === 'B' || (selectedQueuePlayer && sides.B.length < 2) ? 'opacity-100' : 'opacity-35'}`}>
                <span className="text-2xl">👤</span>
                <span className="text-[10px] text-white/50 font-medium">
                  {selectedQueuePlayer && sides.B.length < 2 ? `Tap to assign` : 'Side B'}
                </span>
              </div>
            ) : (
              sides.B.map(pid => (
                <PlayerBubbleOnTable
                  key={pid} playerId={pid} allPlayers={allPlayers} side="B"
                  onRemove={() => onRemovePlayer(pid, 'B')} compact={sides.B.length === 2}
                  readOnly={isOccupied}
                />
              ))
            )}
            {sides.B.length > 0 && sides.B.length < 2 && selectedQueuePlayer && !isOccupied && (
              <span className="text-[9px] text-green-400 font-medium">Tap to assign</span>
            )}
          </div>
          {dragOverSide === 'B' && !isOccupied && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl text-purple-300 animate-bubble-pop">＋</span>
            </div>
          )}
        </div>

        {isOccupied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 pointer-events-none">
            {matchStartedAt && <Stopwatch startedAt={matchStartedAt} tableName={table.name} isDoubles={!!isDoubles} />}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isOccupied && (
        <div className="flex gap-2">
          {canStart ? (
            <button
              onClick={() => { sounds.startMatch(); onStartMatch(); }}
              disabled={starting}
              className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1.5"
            >
              {starting ? 'Starting…' : '🏓 Start Match'}
            </button>
          ) : (
            <p className="flex-1 text-center text-xs text-muted py-2 italic">
              Drag players to both sides
            </p>
          )}
          {hasAssignments && (
            <button onClick={onClear} className="btn-secondary px-3 py-2 text-xs">Clear</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const { players, queue, tables, activeMatches, showElo, autoStartMatches } = useApp();

  // ── Touch device detection ─────────────────────────────────────
  const isTouchDevice = useRef(
    typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
  );

  // ── Touch tap-to-assign state ──────────────────────────────────
  const [selectedQueuePlayer, setSelectedQueuePlayer] = useState<{ id: number; name: string } | null>(null);

  // ── Queue list ref for touch sort ─────────────────────────────
  const queueListRef = useRef<HTMLOListElement>(null);

  // ── Local ordered tables (optimistic reorder) ──────────────────
  const [localTableIds, setLocalTableIds] = useState<number[]>([]);
  useEffect(() => {
    setLocalTableIds(prev => {
      // Add any new tables not yet tracked, remove deleted ones
      const existing = new Set(prev);
      const incoming = new Set(tables.map(t => t.id));
      const merged = prev.filter(id => incoming.has(id));
      const added = tables.filter(t => !existing.has(t.id)).map(t => t.id);
      return [...merged, ...added];
    });
  }, [tables]);
  const orderedTables = localTableIds.map(id => tables.find(t => t.id === id)).filter(Boolean) as Table[];

  // ── Player drag state ──────────────────────────────────────────
  const [draggedPlayerId, setDraggedPlayerId] = useState<number | null>(null);
  const [dragOverQueueId, setDragOverQueueId] = useState<number | null>(null);
  const [dragOverTableSide, setDragOverTableSide] = useState<{ id: number; side: 'A' | 'B' } | null>(null);

  // ── Table drag-to-reorder state ────────────────────────────────
  const [draggedTableId, setDraggedTableId] = useState<number | null>(null);
  const [dragOverTableReorderId, setDragOverTableReorderId] = useState<number | null>(null);

  // ── Table assignments ──────────────────────────────────────────
  const [assignments, setAssignments] = useState<Assignments>({});
  const [starting, setStarting] = useState<number | null>(null);
  
  // ── Auto-Start Countdown State ─────────────────────────────────
  const [autoStartDeadlines, setAutoStartDeadlines] = useState<{ [tableId: number]: number }>({});
  const [, setTimerTick] = useState(0);

  // Auto-Start Timer Loop
  useEffect(() => {
    if (!autoStartMatches) return;
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
      const now = Date.now();
      for (const [tId, deadline] of Object.entries(autoStartDeadlines)) {
        if (now >= deadline && starting !== Number(tId)) {
          startMatch(Number(tId));
        }
      }
    }, 100); // 100ms for smooth UI updates
    return () => clearInterval(interval);
  }, [autoStartDeadlines, autoStartMatches, starting]);

  // Sync deadlines with assignments
  useEffect(() => {
    if (!autoStartMatches) {
      setAutoStartDeadlines({});
      return;
    }
    setAutoStartDeadlines(prev => {
      const next = { ...prev };
      let changed = false;
      for (const tId in assignments) {
        const sides = assignments[tId];
        const canStart = sides.A.length > 0 && sides.B.length > 0;
        
        // If it can start, set/reset the deadline
        if (canStart) {
          next[tId] = Date.now() + 15000;
          changed = true;
        } else if (next[tId]) {
          delete next[tId];
          changed = true;
        }
      }
      // Also clean up any deadlines for tables that no longer have assignments
      for (const tId in next) {
        if (!assignments[tId]) {
          delete next[tId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [assignments, autoStartMatches]);

  // ── Queue form ─────────────────────────────────────────────────
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Clock tick for wait times (every 30s) ──────────────────
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // ── Safety net: reset stuck drag state ────────────────────────
  // If the user drags outside the Electron window and releases there,
  // dragend never fires in the browser and all subsequent mouse clicks
  // are silently consumed by the drag system. Listening for window blur
  // (drag left the window) and document dragend (belt-and-suspenders)
  // ensures we always exit drag mode.
  useEffect(() => {
    function resetDrag() {
      setDraggedPlayerId(null);
      setDraggedTableId(null);
      setDragOverQueueId(null);
      setDragOverTableSide(null);
      setDragOverTableReorderId(null);
    }
    window.addEventListener('blur', resetDrag);
    document.addEventListener('dragend', resetDrag);
    return () => {
      window.removeEventListener('blur', resetDrag);
      document.removeEventListener('dragend', resetDrag);
    };
  }, []);

  // ── Sync table assignments with queue ────────────────────────────
  useEffect(() => {
    setAssignments(prev => {
      let changed = false;
      const next = { ...prev };
      const currentQueuedIds = new Set(queue.map(q => q.player_id));
      for (const tId in next) {
        const t = next[tId];
        const newA = t.A.filter(id => currentQueuedIds.has(id));
        const newB = t.B.filter(id => currentQueuedIds.has(id));
        if (newA.length !== t.A.length || newB.length !== t.B.length) {
          next[tId] = { A: newA, B: newB };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [queue]);

  // ── Derived ────────────────────────────────────────────────────
  const queuedIds = new Set(queue.map(q => q.player_id));
  const activeIds = new Set([
    ...activeMatches.map(m => m.player1_id),
    ...activeMatches.map(m => m.player2_id),
    ...activeMatches.flatMap(m => [m.player3_id, m.player4_id].filter(Boolean) as number[]),
  ]);
  const stagedIds = new Set(Object.values(assignments).flatMap(s => [...s.A, ...s.B]));

  // Players who can be added to queue (not queued, not active)
  const availableForQueue = players.filter(p => !queuedIds.has(p.id) && !activeIds.has(p.id));

  // ── Touch sort for queue ───────────────────────────────────────
  const { getTouchHandlers } = useTouchSort({
    containerRef: queueListRef as React.RefObject<HTMLElement | null>,
    onReorder: (fromIdx, toIdx) => {
      sounds.tick();
      const newOrder = [...queue];
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);
      api.reorderQueue(newOrder.map(q => q.player_id)).catch(() => {});
    },
  });

  // ── Escape key to cancel tap-to-assign selection ──────────────
  useEffect(() => {
    if (!selectedQueuePlayer) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedQueuePlayer(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedQueuePlayer]);

  // ── Touch tap-to-assign handler ────────────────────────────────
  function handleTapQueueItem(playerId: number, playerName: string) {
    if (selectedQueuePlayer?.id === playerId) {
      setSelectedQueuePlayer(null);
    } else {
      setSelectedQueuePlayer({ id: playerId, name: playerName });
    }
  }

  function handleTapSide(tableId: number, side: 'A' | 'B') {
    if (!selectedQueuePlayer) return;
    const pid = selectedQueuePlayer.id;
    const curr = assignments[tableId] ?? { A: [], B: [] };
    const other = side === 'A' ? 'B' : 'A';
    if (curr[side].includes(pid) || curr[other].includes(pid) || curr[side].length >= 2) return;

    sounds.drop();
    const newAssignments = { ...curr, [side]: [...curr[side], pid] };
    setAssignments(prev => ({ ...prev, [tableId]: newAssignments }));
    setSelectedQueuePlayer(null);
  }

  // ── Queue actions ──────────────────────────────────────────────

  async function joinQueue() {
    if (!selectedPlayer) return;
    setAddLoading(true); setError('');
    try {
      await api.joinQueue(Number(selectedPlayer));
      setSelectedPlayer('');
    } catch (e: any) { setError(e.message); }
    finally { setAddLoading(false); }
  }

  async function leaveQueue(playerId: number) {
    await api.leaveQueue(playerId).catch(() => {});
  }

  // ── Queue drag-to-reorder ──────────────────────────────────────

  function handleQueueDragStart(e: React.DragEvent, playerId: number) {
    sounds.pickup();
    setDraggedPlayerId(playerId);
    setDraggedTableId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('type', 'player');
    e.dataTransfer.setData('playerId', String(playerId));

    // Custom drag ghost — styled player card instead of browser default screenshot
    const player = players.find(p => p.id === playerId);
    if (player) {
      const ghost = document.createElement('div');
      ghost.style.cssText = [
        'position:fixed', 'top:-9999px', 'left:-9999px',
        'background:linear-gradient(135deg,#0f2035 0%,#162032 100%)',
        'border:1.5px solid rgba(74,222,128,0.55)',
        'border-radius:12px', 'padding:8px 14px 8px 10px',
        'display:inline-flex', 'align-items:center', 'gap:10px',
        'color:#e2e8f0',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-size:14px', 'font-weight:600', 'line-height:1',
        'box-shadow:0 12px 32px rgba(0,0,0,0.6),0 0 0 1px rgba(74,222,128,0.1)',
        'white-space:nowrap', 'pointer-events:none',
      ].join(';');
      const eloHtml = showElo
        ? `<span style="color:#4ade80;font-size:11px;font-weight:700;opacity:0.85">${player.elo}</span>`
        : '';
      ghost.innerHTML = `
        <span style="width:30px;height:30px;border-radius:50%;background:rgba(74,222,128,0.15);border:1.5px solid rgba(74,222,128,0.35);display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#4ade80;flex-shrink:0">${player.name[0].toUpperCase()}</span>
        <span>${player.name.split(' ')[0]}</span>
        ${eloHtml}
        <span style="font-size:16px;margin-left:2px">🏓</span>
      `;
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
      requestAnimationFrame(() => ghost.remove());
    }
  }

  function handleQueueItemDragOver(e: React.DragEvent, targetId: number) {
    e.preventDefault();
    if (e.dataTransfer.types.includes('type')) {
      e.dataTransfer.dropEffect = 'move';
    }
    setDragOverQueueId(targetId);
  }

  function handleQueueItemDrop(e: React.DragEvent, targetId: number) {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (type !== 'player' || draggedPlayerId === null || draggedPlayerId === targetId) {
      setDragOverQueueId(null); return;
    }
    sounds.tick();
    const newOrder = [...queue];
    const fromIdx = newOrder.findIndex(q => q.player_id === draggedPlayerId);
    const toIdx   = newOrder.findIndex(q => q.player_id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    api.reorderQueue(newOrder.map(q => q.player_id)).catch(() => {});
    setDragOverQueueId(null);
    setDraggedPlayerId(null);
  }

  // ── Table side drop ────────────────────────────────────────────

  function handleTableSideDragOver(e: React.DragEvent, tableId: number, side: 'A' | 'B') {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('type') || (draggedPlayerId !== null ? 'player' : '');
    if (type !== 'player' && draggedPlayerId === null) return;
    const curr = assignments[tableId] ?? { A: [], B: [] };
    if (curr[side].length >= 2) return;
    e.dataTransfer.dropEffect = 'move';
    setDragOverTableSide({ id: tableId, side });
  }

  function handleTableSideDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTableSide(null);
    }
  }

  function handleTableSideDrop(e: React.DragEvent, tableId: number, side: 'A' | 'B') {
    e.preventDefault();
    e.stopPropagation();
    const pid = draggedPlayerId;
    if (!pid) return;

    const curr = assignments[tableId] ?? { A: [], B: [] };
    const other = side === 'A' ? 'B' : 'A';
    if (curr[side].includes(pid) || curr[other].includes(pid) || curr[side].length >= 2) return;

    sounds.drop();
    const newAssignments = { ...curr, [side]: [...curr[side], pid] };
    setAssignments(prev => ({ ...prev, [tableId]: newAssignments }));
    setDragOverTableSide(null);
    setDraggedPlayerId(null);
    setSelectedQueuePlayer(null);
  }

  function removeFromTable(tableId: number, pid: number, side: 'A' | 'B') {
    setAssignments(prev => {
      const curr = prev[tableId] ?? { A: [], B: [] };
      return { ...prev, [tableId]: { ...curr, [side]: curr[side].filter(id => id !== pid) } };
    });
  }

  function clearTable(tableId: number) {
    setAssignments(prev => ({ ...prev, [tableId]: { A: [], B: [] } }));
  }

  async function startMatch(tableId: number, directSides?: { A: number[]; B: number[] }) {
    const sides = directSides || assignments[tableId];
    if (!sides || sides.A.length === 0 || sides.B.length === 0) return;
    setStarting(tableId);
    try {
      await api.startMatch(sides.A[0], sides.B[0], {
        table_id: tableId,
        player3_id: sides.A[1],
        player4_id: sides.B[1],
      });
      clearTable(tableId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(null);
    }
  }

  // ── Table card drag-to-reorder ─────────────────────────────────

  function handleTableCardDragStart(e: React.DragEvent, tableId: number) {
    setDraggedTableId(tableId);
    setDraggedPlayerId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('type', 'table');
    e.dataTransfer.setData('tableId', String(tableId));
  }

  function handleTableCardDragOver(e: React.DragEvent, tableId: number) {
    e.preventDefault();
    const type = e.dataTransfer.getData('type') || (draggedTableId !== null ? 'table' : '');
    if (type !== 'table' && draggedTableId === null) return;
    if (draggedTableId === tableId) return;
    setDragOverTableReorderId(tableId);
  }

  function handleTableCardDrop(e: React.DragEvent, targetTableId: number) {
    e.preventDefault();
    const type = e.dataTransfer.getData('type') || (draggedTableId !== null ? 'table' : '');
    if (type !== 'table' || !draggedTableId || draggedTableId === targetTableId) {
      setDragOverTableReorderId(null); return;
    }
    sounds.tick();
    setLocalTableIds(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(draggedTableId!);
      const toIdx   = next.indexOf(targetTableId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      api.reorderTables(next).catch(() => {});
      return next;
    });
    setDragOverTableReorderId(null);
    setDraggedTableId(null);
  }

  function handleDragEnd() {
    setDraggedPlayerId(null);
    setDraggedTableId(null);
    setDragOverQueueId(null);
    setDragOverTableSide(null);
    setDragOverTableReorderId(null);
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in" onDragEnd={handleDragEnd}>
      <div>
        <h1 className="text-2xl font-bold">Match Queue & Tables</h1>
        <p className="text-secondary text-sm mt-1">
          Drag a player onto a table side — or tap a player to select, then tap a side. Drag ⠿ to reorder tables.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-slide-up">
          <span>⚠</span> {error}
          <button onClick={() => setError('')} className="ml-auto opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      <div className="grid lg:grid-cols-[5fr_7fr] gap-6">

        {/* ── Left: Queue ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Lobby</h2>
              <span className="badge bg-card border border-theme text-secondary">{queue.length} players</span>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <p className="text-4xl mb-3">⏳</p>
                <p className="text-sm">Queue is empty — add players below</p>
              </div>
            ) : (
              <ol ref={queueListRef} className="grid grid-cols-2 gap-2">
                {queue.map((entry, i) => {
                  const isDragging = draggedPlayerId === entry.player_id;
                  const isDragOver = dragOverQueueId === entry.player_id;
                  const isStaged = stagedIds.has(entry.player_id);
                  const isSelected = selectedQueuePlayer?.id === entry.player_id;
                  const stagedOnTable = isStaged
                    ? tables.find(t => {
                        const s = assignments[t.id];
                        return s && ([...s.A, ...s.B].includes(entry.player_id));
                      })
                    : null;

                  return (
                    <li
                      key={entry.id}
                      data-touch-sort-item
                      draggable
                      onDragStart={e => handleQueueDragStart(e, entry.player_id)}
                      onDragOver={e => handleQueueItemDragOver(e, entry.player_id)}
                      onDragLeave={() => setDragOverQueueId(null)}
                      onDrop={e => handleQueueItemDrop(e, entry.player_id)}
                      {...getTouchHandlers(i)}
                      onClick={() => handleTapQueueItem(entry.player_id, entry.name)}
                      className={`flex items-center gap-2 p-2.5 min-h-[64px] rounded-lg border transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
                        isDragging ? 'opacity-40 scale-95' : ''
                      } ${isSelected ? 'border-green-400 ring-2 ring-green-400/50 bg-green-500/10' : isDragOver ? 'border-green-500/60 bg-green-500/8 translate-y-0.5' : 'border-theme bg-input/40 hover:border-hover'} ${
                        isStaged ? 'opacity-70' : ''
                      }`}
                    >
                      <span className="text-muted text-base leading-none select-none cursor-grab">⠿</span>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-card border border-theme text-secondary">
                        {i + 1}
                      </span>
                      <Avatar name={entry.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{entry.name}</p>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
                          {showElo && <span>ELO {entry.elo}</span>}
                          <span>⏳ {formatWaitTime(entry.joined_at)}</span>
                          {stagedOnTable && (
                            <span className="text-blue-400">📍 {stagedOnTable.name}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); leaveQueue(entry.player_id); }}
                        className="text-faint hover:text-red-400 transition-colors text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-500/10 flex-shrink-0"
                        title="Remove from queue"
                      >×</button>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Touch tap-to-assign helper text */}
            {selectedQueuePlayer && (
              <p className="text-xs text-green-400 font-medium text-center py-1 animate-slide-up">
                "{selectedQueuePlayer.name}" selected — tap a table side to assign
              </p>
            )}

            {/* Add to queue */}
            <div className="border-t border-theme pt-4">
              <p className="text-xs font-medium text-secondary mb-2 uppercase tracking-wider">Add player to queue</p>
              <div className="flex gap-2">
                <SearchableSelect
                  options={availableForQueue.map(p => ({ value: String(p.id), label: p.name, sublabel: !showElo ? undefined : `ELO ${p.elo}` }))}
                  value={selectedPlayer}
                  onChange={setSelectedPlayer}
                  onEnter={() => { if (selectedPlayer && !addLoading) joinQueue(); }}
                  placeholder="Search player…"
                  className="flex-1"
                />
                <button onClick={joinQueue} disabled={!selectedPlayer || addLoading} className="btn-primary whitespace-nowrap">
                  {addLoading ? '…' : '+ Join'}
                </button>
              </div>
              {availableForQueue.length === 0 && players.length > 0 && (
                <p className="text-xs text-muted mt-1.5">All players are queued or playing</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Tables ─────────────────────────────────────── */}
        <div className="space-y-3">

          {orderedTables.length === 0 ? (
            <div className="card text-center py-10 text-muted">
              <p className="text-4xl mb-2">🏓</p>
              <p className="text-sm">No tables configured.</p>
              <p className="text-xs mt-1">Add tables in Settings.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {orderedTables.map(table => {
                const activeMatch = activeMatches.find(m => m.table_id === table.id);
                let sides = assignments[table.id] ?? { A: [], B: [] };
                
                // If occupied, override sides with the active match players
                if (table.status === 'occupied' && activeMatch) {
                  sides = {
                    A: [activeMatch.player1_id, activeMatch.player3_id].filter(Boolean) as number[],
                    B: [activeMatch.player2_id, activeMatch.player4_id].filter(Boolean) as number[]
                  };
                }

                const dragOverSide = dragOverTableSide?.id === table.id ? dragOverTableSide.side : null;
                const isDragOver = dragOverTableReorderId === table.id;
                const isDragging = draggedTableId === table.id;

                return (
                  <TableCard
                    key={table.id}
                    table={table}
                    sides={sides}
                    autoStartDeadline={autoStartDeadlines[table.id]}
                    dragOverSide={dragOverSide}
                    isDragOver={isDragOver}
                    isDragging={isDragging}
                    onDragOver={(e, side) => handleTableSideDragOver(e, table.id, side)}
                    onDragLeave={handleTableSideDragLeave}
                    onDrop={(e, side) => handleTableSideDrop(e, table.id, side)}
                    onRemovePlayer={(pid, side) => removeFromTable(table.id, pid, side)}
                    onStartMatch={() => startMatch(table.id)}
                    onClear={() => clearTable(table.id)}
                    onCardDragStart={e => handleTableCardDragStart(e, table.id)}
                    onCardDragOver={e => handleTableCardDragOver(e, table.id)}
                    onCardDrop={e => handleTableCardDrop(e, table.id)}
                    allPlayers={players}
                    starting={starting === table.id}
                    selectedQueuePlayer={selectedQueuePlayer}
                    onTapSide={handleTapSide}
                    matchStartedAt={activeMatch?.created_at}
                    isDoubles={!!activeMatch?.player3_id}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
