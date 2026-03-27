import { useState } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { Table } from '../types';

export default function QueuePage() {
  const { players, queue, tables, activeMatches } = useApp();
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [startP1, setStartP1] = useState('');
  const [startP2, setStartP2] = useState('');
  const [startTable, setStartTable] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const queuedIds = new Set(queue.map(q => q.player_id));
  const activeIds = new Set([
    ...activeMatches.map(m => m.player1_id),
    ...activeMatches.map(m => m.player2_id),
  ]);
  const availablePlayers = players.filter(p => !queuedIds.has(p.id) && !activeIds.has(p.id));
  const availableTables = tables.filter(t => t.status === 'available');

  async function joinQueue() {
    if (!selectedPlayer) return;
    setLoading(true);
    setError('');
    try {
      await api.joinQueue(Number(selectedPlayer));
      setSelectedPlayer('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function leaveQueue(playerId: number) {
    await api.leaveQueue(playerId).catch(() => {});
  }

  async function startMatch() {
    if (!startP1 || !startP2 || startP1 === startP2) {
      setError('Select two different players');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.startMatch(Number(startP1), Number(startP2), startTable ? Number(startTable) : undefined);
      setStartP1('');
      setStartP2('');
      setStartTable('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const queueP1Available = queue.filter(q => q.player_id !== Number(startP2));
  const queueP2Available = queue.filter(q => q.player_id !== Number(startP1));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Match Queue</h1>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Queue list */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Waiting ({queue.length})</h2>
          {queue.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-3">⏳</p>
              <p>Queue is empty</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {queue.map((entry, i) => (
                <li
                  key={entry.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    i === 0 ? 'border-green-500/40 bg-green-500/10' : 'border-[#334155] bg-[#0f172a]'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-green-500 text-black' : 'bg-[#334155] text-gray-300'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{entry.name}</p>
                    <p className="text-xs text-gray-500">ELO {entry.elo}</p>
                  </div>
                  <p className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(entry.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button
                    onClick={() => leaveQueue(entry.player_id)}
                    className="text-gray-500 hover:text-red-400 text-sm transition-colors"
                    title="Remove from queue"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          )}

          {/* Add to queue */}
          <div className="border-t border-[#334155] pt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Add player to queue</h3>
            <div className="flex gap-2">
              <select
                value={selectedPlayer}
                onChange={e => setSelectedPlayer(e.target.value)}
                className="input flex-1"
              >
                <option value="">Select player…</option>
                {availablePlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (ELO {p.elo})</option>
                ))}
              </select>
              <button
                onClick={joinQueue}
                disabled={!selectedPlayer || loading}
                className="btn-primary whitespace-nowrap"
              >
                Join
              </button>
            </div>
            {availablePlayers.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">All players are in queue or playing</p>
            )}
          </div>
        </div>

        {/* Start Match panel */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Start Match</h2>
          <p className="text-sm text-gray-400">Select two players from the queue to start a match.</p>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Player 1</label>
              <select value={startP1} onChange={e => setStartP1(e.target.value)} className="input">
                <option value="">Choose from queue…</option>
                {queueP1Available.map(q => (
                  <option key={q.player_id} value={q.player_id}>
                    #{queue.findIndex(x => x.player_id === q.player_id) + 1} {q.name} (ELO {q.elo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Player 2</label>
              <select value={startP2} onChange={e => setStartP2(e.target.value)} className="input">
                <option value="">Choose from queue…</option>
                {queueP2Available.map(q => (
                  <option key={q.player_id} value={q.player_id}>
                    #{queue.findIndex(x => x.player_id === q.player_id) + 1} {q.name} (ELO {q.elo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Table (optional)</label>
              <select value={startTable} onChange={e => setStartTable(e.target.value)} className="input">
                <option value="">Any available table</option>
                {availableTables.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={startMatch}
              disabled={!startP1 || !startP2 || loading}
              className="btn-primary w-full"
            >
              🏓 Start Match
            </button>
          </div>

          {/* Tables status */}
          <div className="border-t border-[#334155] pt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Tables</h3>
            <div className="grid grid-cols-2 gap-2">
              {tables.map(t => (
                <div
                  key={t.id}
                  className={`text-center p-2 rounded-lg border text-sm font-medium ${
                    t.status === 'available'
                      ? 'border-green-500/40 bg-green-500/10 text-green-400'
                      : 'border-orange-500/40 bg-orange-500/10 text-orange-400'
                  }`}
                >
                  <p>{t.name}</p>
                  <p className="text-xs opacity-75">{t.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
