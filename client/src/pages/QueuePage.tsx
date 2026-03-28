import { useState, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { QueueEntry, Player, Table } from '../types';
import { SearchableSelect } from '../components/SearchableSelect';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TableSides { A: number[]; B: number[] }
type Assignments = { [tableId: number]: TableSides };
type DragSource = 'queue' | 'available';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-xl' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-green-500/30 to-green-700/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold flex-shrink-0`}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ─── Table visual ─────────────────────────────────────────────────────────────

interface TableCardProps {
  table: Table;
  sides: TableSides;
  dragOverSide: 'A' | 'B' | null;
  onDragOver: (e: React.DragEvent, side: 'A' | 'B') => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, side: 'A' | 'B') => void;
  onRemovePlayer: (playerId: number, side: 'A' | 'B') => void;
  onStartMatch: () => void;
  onClear: () => void;
  allPlayers: Player[];
  starting: boolean;
}

function PlayerBubbleOnTable({
  playerId, allPlayers, onRemove, side,
}: {
  playerId: number; allPlayers: Player[]; onRemove: () => void; side: 'A' | 'B';
}) {
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) return null;
  return (
    <div className={`group relative flex flex-col items-center gap-0.5 ${side === 'A' ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}>
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400/40 to-green-600/30 border-2 border-green-400/60 flex items-center justify-center text-green-300 font-bold text-sm shadow-[0_0_10px_rgba(74,222,128,0.3)]">
          {player.name[0].toUpperCase()}
        </div>
        <button
          onClick={onRemove}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >×</button>
      </div>
      <span className="text-[10px] text-white/80 font-medium text-center max-w-[48px] truncate leading-tight">
        {player.name.split(' ')[0]}
      </span>
    </div>
  );
}

function TableCard({
  table, sides, dragOverSide, onDragOver, onDragLeave, onDrop,
  onRemovePlayer, onStartMatch, onClear, allPlayers, starting,
}: TableCardProps) {
  const canStart = sides.A.length > 0 && sides.B.length > 0;
  const isOccupied = table.status === 'occupied';
  const hasAssignments = sides.A.length + sides.B.length > 0;

  return (
    <div className={`card !p-4 space-y-3 transition-all duration-200 ${canStart && !isOccupied ? 'border-green-500/40 shadow-[0_0_20px_rgba(74,222,128,0.08)]' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{table.name}</span>
          {isOccupied && <span className="badge bg-orange-500/20 text-orange-400 text-[10px]">In Use</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`} />
          <span className="text-xs text-muted capitalize">{table.status}</span>
        </div>
      </div>

      {/* Table visual */}
      <div className={`relative rounded-xl overflow-hidden h-36 transition-all duration-200 ${isOccupied ? 'opacity-50' : ''}`}
        style={{ background: 'linear-gradient(160deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>

        {/* Table surface lines */}
        <div className="absolute inset-[5px] border border-white/20 rounded-lg pointer-events-none" />
        {/* Center short line */}
        <div className="absolute top-[5px] bottom-[5px] left-1/2 w-px bg-white/25 pointer-events-none" />

        {/* Net */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-3 pointer-events-none"
          style={{ background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 3px, transparent 3px, transparent 7px)', borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }} />

        {/* Side A drop zone */}
        <div
          onDragOver={isOccupied ? undefined : (e) => onDragOver(e, 'A')}
          onDragLeave={isOccupied ? undefined : onDragLeave}
          onDrop={isOccupied ? undefined : (e) => onDrop(e, 'A')}
          className={`absolute top-0 bottom-0 left-0 right-1/2 flex flex-col items-center justify-center gap-1.5 transition-all duration-150 ${
            dragOverSide === 'A' && !isOccupied ? 'bg-blue-400/20' : ''
          }`}
        >
          {sides.A.length === 0 && !isOccupied ? (
            <div className={`flex flex-col items-center gap-1 transition-opacity ${dragOverSide === 'A' ? 'opacity-100' : 'opacity-40'}`}>
              <span className="text-xl">👤</span>
              <span className="text-[10px] text-white/50 font-medium">Side A</span>
            </div>
          ) : (
            sides.A.map(pid => (
              <PlayerBubbleOnTable
                key={pid} playerId={pid} allPlayers={allPlayers} side="A"
                onRemove={() => onRemovePlayer(pid, 'A')}
              />
            ))
          )}
        </div>

        {/* Side B drop zone */}
        <div
          onDragOver={isOccupied ? undefined : (e) => onDragOver(e, 'B')}
          onDragLeave={isOccupied ? undefined : onDragLeave}
          onDrop={isOccupied ? undefined : (e) => onDrop(e, 'B')}
          className={`absolute top-0 bottom-0 right-0 left-1/2 flex flex-col items-center justify-center gap-1.5 transition-all duration-150 ${
            dragOverSide === 'B' && !isOccupied ? 'bg-purple-400/20' : ''
          }`}
        >
          {sides.B.length === 0 && !isOccupied ? (
            <div className={`flex flex-col items-center gap-1 transition-opacity ${dragOverSide === 'B' ? 'opacity-100' : 'opacity-40'}`}>
              <span className="text-xl">👤</span>
              <span className="text-[10px] text-white/50 font-medium">Side B</span>
            </div>
          ) : (
            sides.B.map(pid => (
              <PlayerBubbleOnTable
                key={pid} playerId={pid} allPlayers={allPlayers} side="B"
                onRemove={() => onRemovePlayer(pid, 'B')}
              />
            ))
          )}
        </div>

        {/* Drag-over overlay label */}
        {!isOccupied && (dragOverSide === 'A' || dragOverSide === 'B') && (
          <div className={`absolute top-0 bottom-0 pointer-events-none flex items-center justify-center ${dragOverSide === 'A' ? 'left-0 right-1/2 text-blue-300' : 'right-0 left-1/2 text-purple-300'}`}>
            <span className="text-2xl animate-bubble-pop">＋</span>
          </div>
        )}

        {isOccupied && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="text-white/60 text-xs font-semibold">Match in progress</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isOccupied && (
        <div className="flex gap-2">
          {canStart ? (
            <button
              onClick={onStartMatch}
              disabled={starting}
              className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1.5"
            >
              {starting ? 'Starting…' : '🏓 Start Match'}
            </button>
          ) : (
            <p className="flex-1 text-center text-xs text-muted py-2">
              {isOccupied ? 'Table occupied' : 'Drag players to both sides'}
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
  const { players, queue, tables, activeMatches } = useApp();

  // Drag state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragSource, setDragSource] = useState<DragSource>('queue');
  const [dragOverQueueId, setDragOverQueueId] = useState<number | null>(null);
  const [dragOverTableSide, setDragOverTableSide] = useState<{ id: number; side: 'A' | 'B' } | null>(null);
  const dragCounter = useRef(0); // track nested dragenter/leave

  // Table assignments (client-side staging before starting a match)
  const [assignments, setAssignments] = useState<Assignments>({});
  const [starting, setStarting] = useState<number | null>(null);

  // Add to queue form
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState('');

  // Derived data
  const queuedIds = new Set(queue.map(q => q.player_id));
  const activeIds = new Set([
    ...activeMatches.map(m => m.player1_id),
    ...activeMatches.map(m => m.player2_id),
    ...activeMatches.flatMap(m => [m.player3_id, m.player4_id].filter(Boolean) as number[]),
  ]);
  // All player IDs already staged on any table
  const stagedIds = new Set(Object.values(assignments).flatMap(s => [...s.A, ...s.B]));

  const availableForQueue = players.filter(p => !queuedIds.has(p.id) && !activeIds.has(p.id));
  const availableForTable = players.filter(p => !activeIds.has(p.id) && !stagedIds.has(p.id));

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
    setDraggedId(playerId);
    setDragSource('queue');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('playerId', String(playerId));
  }

  function handleQueueDragOver(e: React.DragEvent, targetId: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverQueueId(targetId);
  }

  function handleQueueDrop(e: React.DragEvent, targetId: number) {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) {
      setDragOverQueueId(null);
      return;
    }
    const newOrder = [...queue];
    const fromIdx = newOrder.findIndex(q => q.player_id === draggedId);
    const toIdx   = newOrder.findIndex(q => q.player_id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    api.reorderQueue(newOrder.map(q => q.player_id)).catch(() => {});
    setDragOverQueueId(null);
    setDraggedId(null);
  }

  // ── Table drag-drop ────────────────────────────────────────────

  function handleAvailableDragStart(e: React.DragEvent, playerId: number) {
    setDraggedId(playerId);
    setDragSource('available');
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('playerId', String(playerId));
  }

  function handleTableDragOver(e: React.DragEvent, tableId: number, side: 'A' | 'B') {
    e.preventDefault();
    e.stopPropagation();
    const curr = assignments[tableId] ?? { A: [], B: [] };
    if (curr[side].length >= 2) return; // max 2 per side
    e.dataTransfer.dropEffect = dragSource === 'queue' ? 'move' : 'copy';
    setDragOverTableSide({ id: tableId, side });
  }

  function handleTableDragLeave(e: React.DragEvent) {
    // Only clear if leaving the drop zone container (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTableSide(null);
    }
  }

  function handleTableDrop(e: React.DragEvent, tableId: number, side: 'A' | 'B') {
    e.preventDefault();
    e.stopPropagation();
    const pid = draggedId;
    if (!pid) return;

    const curr = assignments[tableId] ?? { A: [], B: [] };
    const other = side === 'A' ? 'B' : 'A';

    // Don't allow same player on both sides or >2 per side
    if (curr[side].includes(pid) || curr[other].includes(pid)) return;
    if (curr[side].length >= 2) return;

    setAssignments(prev => ({
      ...prev,
      [tableId]: { ...curr, [side]: [...curr[side], pid] },
    }));
    setDragOverTableSide(null);
    setDraggedId(null);
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

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverQueueId(null);
    setDragOverTableSide(null);
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in" onDragEnd={handleDragEnd}>
      <div>
        <h1 className="text-2xl font-bold">Match Queue & Tables</h1>
        <p className="text-secondary text-sm mt-1">
          Drag players from the queue onto a table to assign sides, then press Start Match.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-slide-up">
          <span>⚠</span> {error}
          <button onClick={() => setError('')} className="ml-auto opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Available players pool (not in queue and not playing) */}
      {availableForQueue.length > 0 && (
        <div className="card !p-4">
          <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-3">
            Available Players — drag to queue or table
          </p>
          <div className="flex flex-wrap gap-2">
            {availableForQueue.map(p => (
              <div
                key={p.id}
                draggable
                onDragStart={e => handleAvailableDragStart(e, p.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-input border border-theme rounded-full cursor-grab active:cursor-grabbing hover:border-hover transition-all duration-150 animate-bubble-pop select-none"
              >
                <Avatar name={p.name} size="sm" />
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted">{p.elo}</span>
              </div>
            ))}
          </div>
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
              <ol className="space-y-1.5">
                {queue.map((entry, i) => {
                  const isDragging = draggedId === entry.player_id;
                  const isDragOver = dragOverQueueId === entry.player_id;
                  return (
                    <li
                      key={entry.id}
                      draggable
                      onDragStart={e => handleQueueDragStart(e, entry.player_id)}
                      onDragOver={e => handleQueueDragOver(e, entry.player_id)}
                      onDragLeave={() => setDragOverQueueId(null)}
                      onDrop={e => handleQueueDrop(e, entry.player_id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
                        isDragging ? 'opacity-40 scale-95' : ''
                      } ${isDragOver ? 'border-green-500/60 bg-green-500/8 translate-y-0.5' : i === 0 ? 'border-green-500/30 bg-green-500/5' : 'border-theme bg-input/40 hover:border-hover'}`}
                    >
                      {/* Drag handle */}
                      <span className="text-muted text-base leading-none select-none cursor-grab">⠿</span>

                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-green-500 text-black' : 'bg-card border border-theme text-secondary'
                      }`}>{i + 1}</span>

                      <Avatar name={entry.name} size="sm" />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{entry.name}</p>
                        <p className="text-xs text-muted">ELO {entry.elo}</p>
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

            {/* Add to queue */}
            <div className="border-t border-theme pt-4">
              <p className="text-xs font-medium text-secondary mb-2 uppercase tracking-wider">Add player to queue</p>
              <div className="flex gap-2">
                <SearchableSelect
                  options={availableForQueue.map(p => ({ value: String(p.id), label: p.name, sublabel: `ELO ${p.elo}` }))}
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
            <p className="text-xs text-muted">Drag players from queue or pool onto a side</p>
          </div>

          {tables.length === 0 ? (
            <div className="card text-center py-10 text-muted">
              <p className="text-4xl mb-2">🏓</p>
              <p className="text-sm">No tables configured.</p>
              <p className="text-xs mt-1">Add tables in Settings.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {tables.map(table => {
                const sides = assignments[table.id] ?? { A: [], B: [] };
                const dragOver = dragOverTableSide?.id === table.id ? dragOverTableSide.side : null;
                return (
                  <TableCard
                    key={table.id}
                    table={table}
                    sides={sides}
                    dragOverSide={dragOver}
                    onDragOver={(e, side) => handleTableDragOver(e, table.id, side)}
                    onDragLeave={handleTableDragLeave}
                    onDrop={(e, side) => handleTableDrop(e, table.id, side)}
                    onRemovePlayer={(pid, side) => removeFromTable(table.id, pid, side)}
                    onStartMatch={() => startMatch(table.id)}
                    onClear={() => clearTable(table.id)}
                    allPlayers={availableForTable}
                    starting={starting === table.id}
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
