import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { Player, Table } from '../types';
import { SearchableSelect } from '../components/SearchableSelect';
import { sounds } from '../utils/sounds';
import { useTouchSort } from '../utils/useTouchSort';

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
  playerId, allPlayers, onRemove, side, compact,
}: {
  playerId: number; allPlayers: Player[]; onRemove: () => void;
  side: 'A' | 'B'; compact: boolean;
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
        <button
          onClick={() => { sounds.remove(); onRemove(); }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
        >×</button>
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
}

function TableCard({
  table, sides, dragOverSide, isDragOver, isDragging,
  onDragOver, onDragLeave, onDrop,
  onRemovePlayer, onStartMatch, onClear,
  onCardDragStart, onCardDragOver, onCardDrop,
  allPlayers, starting,
  selectedQueuePlayer, onTapSide,
}: TableCardProps) {
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <span className="text-white/60 text-xs font-semibold">Match in progress</span>
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
  const { players, queue, tables, activeMatches, hideElo } = useApp();

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

  // ── Queue form ─────────────────────────────────────────────────
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState('');

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

  // ── Touch tap-to-assign handler ────────────────────────────────
  function handleTapQueueItem(playerId: number, playerName: string) {
    if (!isTouchDevice.current) return;
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
    setAssignments(prev => ({
      ...prev,
      [tableId]: { ...curr, [side]: [...curr[side], pid] },
    }));
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
    setAssignments(prev => ({
      ...prev,
      [tableId]: { ...curr, [side]: [...curr[side], pid] },
    }));
    setDragOverTableSide(null);
    setDraggedPlayerId(null);
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

  async function startMatch(tableId: number) {
    const sides = assignments[tableId];
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
          {isTouchDevice.current
            ? 'Tap a player to select, then tap a table side to assign.'
            : 'Drag players onto table sides to assign them, then press Start Match. Drag ⠿ to reorder.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-slide-up">
          <span>⚠</span> {error}
          <button onClick={() => setError('')} className="ml-auto opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      <div className="grid lg:grid-cols-[2fr_3fr] gap-6">

        {/* ── Left: Queue ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Waiting Queue</h2>
              <span className="badge bg-card border border-theme text-secondary">{queue.length} players</span>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <p className="text-4xl mb-3">⏳</p>
                <p className="text-sm">Queue is empty — add players below</p>
              </div>
            ) : (
              <ol ref={queueListRef} className="space-y-2">
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
                      className={`flex items-center gap-3 p-4 min-h-[64px] rounded-lg border transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
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
                        <p className="font-medium text-base truncate">{entry.name}</p>
                        <p className="text-sm text-muted">
                          {!hideElo && <>ELO {entry.elo}</>}
                          {stagedOnTable && (
                            <span className="ml-2 text-blue-400">📍 {stagedOnTable.name}</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => leaveQueue(entry.player_id)}
                        className="text-faint hover:text-red-400 transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/10 flex-shrink-0"
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
                  options={availableForQueue.map(p => ({ value: String(p.id), label: p.name, sublabel: hideElo ? undefined : `ELO ${p.elo}` }))}
                  value={selectedPlayer}
                  onChange={setSelectedPlayer}
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
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Tables</h2>
            <p className="text-xs text-muted">Drag ⠿ to reorder • Drag players onto sides</p>
          </div>

          {orderedTables.length === 0 ? (
            <div className="card text-center py-10 text-muted">
              <p className="text-4xl mb-2">🏓</p>
              <p className="text-sm">No tables configured.</p>
              <p className="text-xs mt-1">Add tables in Settings.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {orderedTables.map(table => {
                const sides = assignments[table.id] ?? { A: [], B: [] };
                const dragOverSide = dragOverTableSide?.id === table.id ? dragOverTableSide.side : null;
                const isDragOver = dragOverTableReorderId === table.id;
                const isDragging = draggedTableId === table.id;

                return (
                  <TableCard
                    key={table.id}
                    table={table}
                    sides={sides}
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
