import { useState, useEffect } from 'react';
import { api } from '../api';
import { Match, MatchHistoryPage as HistoryPage } from '../types';
import { useApp } from '../App';

function parseUTC(s: string) {
  return new Date(s.includes('T') ? s + (s.endsWith('Z') ? '' : 'Z') : s.replace(' ', 'T') + 'Z');
}

function MatchRow({ match, hideElo }: { match: Match; hideElo: boolean }) {
  const isDoubles = !!(match.player3_id || match.player4_id);
  const teamA = [match.player1_name, match.player3_name].filter(Boolean).join(' & ');
  const teamB = [match.player2_name, match.player4_name].filter(Boolean).join(' & ');
  const p1Won = match.winner_id === match.player1_id;
  const p2Won = match.winner_id === match.player2_id;

  return (
    <tr className="border-b border-theme/40 hover:bg-card-hover transition-colors bg-card">
      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
        {match.completed_at
          ? parseUTC(match.completed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isDoubles && <span className="badge bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px]">2v2</span>}
          <div>
            <span className={`font-medium text-sm ${p1Won ? 'text-green-400' : 'text-secondary'}`}>{teamA}</span>
            {!hideElo && <span className="text-xs text-muted ml-1">({match.player1_elo}{match.player3_elo ? `/${match.player3_elo}` : ''})</span>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="font-bold tabular-nums text-sm">
          <span className={p1Won ? 'text-green-400' : 'text-faint'}>{match.player1_score}</span>
          <span className="text-muted mx-1">–</span>
          <span className={p2Won ? 'text-green-400' : 'text-faint'}>{match.player2_score}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <div>
          <span className={`font-medium text-sm ${p2Won ? 'text-green-400' : 'text-secondary'}`}>{teamB}</span>
          {!hideElo && <span className="text-xs text-muted ml-1">({match.player2_elo}{match.player4_elo ? `/${match.player4_elo}` : ''})</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted hidden sm:table-cell">
        {match.table_name ?? '—'}
      </td>
    </tr>
  );
}

export default function MatchHistoryPage() {
  const { hideElo, players } = useApp();
  const [data, setData] = useState<HistoryPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterPlayer, setFilterPlayer] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getMatchHistory(page, 25)
      .then(d => setData(d as HistoryPage))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const matches: Match[] = data?.matches ?? [];
  const filtered = filterPlayer
    ? matches.filter(m =>
        [m.player1_id, m.player2_id, m.player3_id, m.player4_id]
          .includes(Number(filterPlayer))
      )
    : matches;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Match History</h1>
        <p className="text-secondary text-sm mt-1">
          {data ? `${data.total} completed matches total` : 'Loading…'}
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterPlayer}
          onChange={e => { setFilterPlayer(e.target.value); setPage(1); }}
          className="input w-48"
        >
          <option value="">All players</option>
          {[...players].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {filterPlayer && (
          <button onClick={() => setFilterPlayer('')} className="text-muted hover:text-primary text-sm transition-colors">
            Clear filter
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="card shimmer h-12 !p-0" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14 animate-pop-in">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-secondary">{filterPlayer ? 'No matches found for this player.' : 'No completed matches yet.'}</p>
          <p className="text-muted text-sm mt-1">Complete some matches to see them here.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-theme overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-input border-b border-theme text-secondary text-xs">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Team A</th>
                  <th className="text-center px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3">Team B</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Table</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => <MatchRow key={m.id} match={m} hideElo={hideElo} />)}
              </tbody>
            </table>
          </div>

          {/* Pagination — only show when not filtered (client-side filter within the page) */}
          {!filterPlayer && data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-sm text-muted">Page {page} of {data.pages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
