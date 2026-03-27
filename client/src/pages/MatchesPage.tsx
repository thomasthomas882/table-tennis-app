import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { Match } from '../types';

function ScoreControl({
  value, onChange, label
}: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 rounded-lg bg-[#334155] hover:bg-[#475569] font-bold text-lg transition-colors"
        >−</button>
        <span className="text-3xl font-bold w-10 text-center text-green-400">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-lg bg-[#334155] hover:bg-[#475569] font-bold text-lg transition-colors"
        >+</button>
      </div>
    </div>
  );
}

function ActiveMatchCard({ match }: { match: Match }) {
  const [p1Score, setP1Score] = useState(match.player1_score);
  const [p2Score, setP2Score] = useState(match.player2_score);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Sync with live updates
  useEffect(() => {
    setP1Score(match.player1_score);
    setP2Score(match.player2_score);
  }, [match.player1_score, match.player2_score]);

  async function saveScore() {
    setSaving(true);
    try {
      await api.updateScore(match.id, p1Score, p2Score);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function completeMatch(winnerId: number) {
    setCompleting(true);
    try {
      await api.completeMatch(match.id, winnerId);
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(false);
    }
  }

  const p1Leading = p1Score > p2Score;
  const p2Leading = p2Score > p1Score;

  return (
    <div className="card border-orange-500/30">
      <div className="flex items-center justify-between mb-4">
        <span className="badge bg-orange-500/20 text-orange-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse inline-block" />
          Live
        </span>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {match.table_name && <span>📍 {match.table_name}</span>}
          <span>{new Date(match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="flex items-center justify-around gap-4 mb-4">
        <div className={`flex-1 text-center ${p1Leading ? 'opacity-100' : 'opacity-70'}`}>
          <p className={`font-semibold text-base truncate ${p1Leading ? 'text-white' : 'text-gray-400'}`}>
            {match.player1_name}
          </p>
          <p className="text-xs text-gray-500 mb-2">ELO {match.player1_elo}</p>
          <ScoreControl value={p1Score} onChange={setP1Score} label={match.player1_name} />
        </div>

        <div className="text-center">
          <p className="text-gray-600 font-bold text-lg">VS</p>
        </div>

        <div className={`flex-1 text-center ${p2Leading ? 'opacity-100' : 'opacity-70'}`}>
          <p className={`font-semibold text-base truncate ${p2Leading ? 'text-white' : 'text-gray-400'}`}>
            {match.player2_name}
          </p>
          <p className="text-xs text-gray-500 mb-2">ELO {match.player2_elo}</p>
          <ScoreControl value={p2Score} onChange={setP2Score} label={match.player2_name} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={saveScore}
          disabled={saving || (p1Score === match.player1_score && p2Score === match.player2_score)}
          className="btn-secondary text-sm flex-1"
        >
          {saving ? 'Saving…' : 'Update Score'}
        </button>
        <button
          onClick={() => completeMatch(match.player1_id)}
          disabled={completing}
          className="flex-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-700/50 text-blue-300 font-medium px-3 py-2 rounded-lg text-sm transition-colors"
        >
          {match.player1_name.split(' ')[0]} wins
        </button>
        <button
          onClick={() => completeMatch(match.player2_id)}
          disabled={completing}
          className="flex-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-700/50 text-purple-300 font-medium px-3 py-2 rounded-lg text-sm transition-colors"
        >
          {match.player2_name.split(' ')[0]} wins
        </button>
      </div>
    </div>
  );
}

function CompletedMatchCard({ match }: { match: Match }) {
  return (
    <div className="card opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex items-center justify-between mb-2">
        <span className="badge bg-gray-700 text-gray-300">Completed</span>
        <span className="text-xs text-gray-500">
          {match.completed_at
            ? new Date(match.completed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : ''}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className={`flex-1 text-center ${match.winner_id === match.player1_id ? 'text-white' : 'text-gray-500'}`}>
          <p className="font-medium text-sm">{match.player1_name}</p>
          <p className={`text-2xl font-bold ${match.winner_id === match.player1_id ? 'text-green-400' : ''}`}>
            {match.player1_score}
          </p>
        </div>
        <div className="text-gray-600 text-sm font-bold">vs</div>
        <div className={`flex-1 text-center ${match.winner_id === match.player2_id ? 'text-white' : 'text-gray-500'}`}>
          <p className="font-medium text-sm">{match.player2_name}</p>
          <p className={`text-2xl font-bold ${match.winner_id === match.player2_id ? 'text-green-400' : ''}`}>
            {match.player2_score}
          </p>
        </div>
      </div>
      {match.winner_name && (
        <p className="text-center text-xs text-green-400 mt-2">🏆 {match.winner_name} won</p>
      )}
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
  }, [activeMatches]); // refresh when active matches change

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Matches</h1>

      {/* Active */}
      <section>
        <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
          Active Matches
          {activeMatches.length > 0 && (
            <span className="badge bg-orange-500/20 text-orange-400">{activeMatches.length}</span>
          )}
        </h2>
        {activeMatches.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">
            <p className="text-4xl mb-2">🏓</p>
            <p>No active matches right now</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activeMatches.map(m => <ActiveMatchCard key={m.id} match={m} />)}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="font-semibold text-lg mb-3">Recent Matches</h2>
        {loadingHistory ? (
          <div className="text-gray-500 text-sm">Loading…</div>
        ) : completed.length === 0 ? (
          <div className="card text-center py-8 text-gray-500">No completed matches yet</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {completed.map(m => <CompletedMatchCard key={m.id} match={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}
