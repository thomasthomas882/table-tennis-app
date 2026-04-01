import { useState } from 'react';
import { useApp } from '../App';
import { api } from '../api';

const GUIDE_STEPS = [
  {
    icon: '👤',
    title: 'Add Players',
    desc: 'Head to the Players tab and add every club member by name. Each player starts with a 1000 ELO rating.',
  },
  {
    icon: '🏓',
    title: 'Set Up Tables',
    desc: 'In Settings → Tables, add the tables available at your venue (e.g. "Table 1", "Main Table").',
  },
  {
    icon: '⏳',
    title: 'Build the Queue',
    desc: 'Go to the Queue tab. Search for players and click the + button to add them to the waiting list. Drag rows to reorder.',
  },
  {
    icon: '▶',
    title: 'Start a Match',
    desc: 'In the Queue tab, drag players from the waiting list onto a table card — left side and right side. Hit "Start Match" when ready. Supports singles (1v1) and doubles (2v2).',
  },
  {
    icon: '✓',
    title: 'Complete a Match',
    desc: 'Open the Matches tab, find the active match, and click "Complete". Enter the final score and confirm — ELO ratings update automatically.',
  },
  {
    icon: '🏆',
    title: 'Check the Leaderboard',
    desc: 'The Leaderboard tab ranks all players by ELO in real time. Wins, losses, and win rate are all tracked.',
  },
  {
    icon: '⊞',
    title: 'Dashboard Overview',
    desc: 'The Dashboard shows you everything at a glance: active matches with a live timer, the current queue, and recent match results.',
  },
];

function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold">How to Use PingTrack</h2>
            <p className="text-secondary text-xs mt-0.5">A quick step-by-step guide</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-card"
          >
            ×
          </button>
        </div>
        <ol className="space-y-4">
          {GUIDE_STEPS.map((step, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-xs font-bold text-green-400">
                {i + 1}
              </div>
              <div className="pt-0.5">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <span>{step.icon}</span> {step.title}
                </p>
                <p className="text-secondary text-xs mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 pt-4 border-t border-theme">
          <p className="text-xs text-muted text-center">
            PingTrack is in beta — ratings and data persist across sessions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, tables, soundEnabled, setSoundEnabled, hideElo, setHideElo } = useApp();
  const [newTable, setNewTable] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmResetElo, setConfirmResetElo] = useState(false);
  const [resettingElo, setResettingElo] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  async function handleResetElo() {
    if (!confirmResetElo) { setConfirmResetElo(true); return; }
    setResettingElo(true);
    try {
      await api.resetElo();
      setConfirmResetElo(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResettingElo(false);
    }
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    if (!newTable.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.createTable(newTable.trim());
      setNewTable('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeTable(id: number) {
    try {
      await api.deleteTable(id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setResetting(true);
    try {
      await api.resetAll();
      setConfirmReset(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      <h1 className="text-2xl font-bold">Settings</h1>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-slide-up">
          <span>⚠</span> {error}
          <button onClick={() => setError('')} className="ml-auto opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Appearance + Help side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Theme Toggle */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-1">Appearance</h2>
          <p className="text-secondary text-sm mb-4">Choose your preferred theme.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                theme === 'dark'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-theme hover:border-hover'
              }`}
            >
              <span className="text-2xl">🌙</span>
              <div className="text-left">
                <p className="font-medium">Dark</p>
                <p className="text-muted text-xs">Easy on the eyes</p>
              </div>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                theme === 'light'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-theme hover:border-hover'
              }`}
            >
              <span className="text-2xl">☀️</span>
              <div className="text-left">
                <p className="font-medium">Light</p>
                <p className="text-muted text-xs">Bright and clean</p>
              </div>
            </button>
          </div>
        </div>

        {/* Help */}
        <div className="card flex flex-col">
          <h2 className="font-semibold text-lg mb-1">Help</h2>
          <p className="text-secondary text-sm mb-4 flex-1">
            New to PingTrack? The guide walks you through every step — from adding players to completing matches.
          </p>
          <button
            onClick={() => setShowGuide(true)}
            className="btn-primary flex items-center justify-center gap-2 w-full"
          >
            <span>📖</span> Open Guide
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Preferences</h2>
        <div className="space-y-3">
          {/* Sound toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-theme bg-input">
            <div className="flex items-center gap-3">
              <span className="text-xl">{soundEnabled ? '🔊' : '🔇'}</span>
              <div>
                <p className="font-medium text-sm">UI Sounds</p>
                <p className="text-xs text-muted">Play sounds for drag, drop, and match events</p>
              </div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                soundEnabled ? 'bg-green-500' : 'bg-card border border-theme'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Hide ELO toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-theme bg-input">
            <div className="flex items-center gap-3">
              <span className="text-xl">👁</span>
              <div>
                <p className="font-medium text-sm">Hide ELO Scores</p>
                <p className="text-xs text-muted">Mask rating numbers across the app</p>
              </div>
            </div>
            <button
              onClick={() => setHideElo(!hideElo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                hideElo ? 'bg-green-500' : 'bg-card border border-theme'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                hideElo ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Table Management */}
      <div className="card">
        <h2 className="font-semibold text-lg mb-1">Tables</h2>
        <p className="text-secondary text-sm mb-4">Add or remove tables for your club.</p>

        <form onSubmit={addTable} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTable}
            onChange={e => setNewTable(e.target.value)}
            placeholder="New table name…"
            className="input flex-1"
            maxLength={40}
          />
          <button type="submit" disabled={loading || !newTable.trim()} className="btn-primary whitespace-nowrap">
            {loading ? 'Adding…' : '+ Add Table'}
          </button>
        </form>

        {tables.length === 0 ? (
          <p className="text-muted text-sm text-center py-4">No tables configured.</p>
        ) : (
          <div className="space-y-2">
            {tables.map(t => (
              <div key={t.id}
                className="flex items-center justify-between p-3 rounded-lg border border-theme bg-input transition-all duration-200 hover:border-hover"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🏓</span>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        t.status === 'available' ? 'bg-green-400' : 'bg-orange-400 animate-pulse'
                      }`} />
                      <span className="text-xs text-muted capitalize">{t.status}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeTable(t.id)}
                  disabled={t.status === 'occupied'}
                  className="text-muted hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10"
                  title={t.status === 'occupied' ? 'Cannot remove while in use' : 'Remove table'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card border-red-500/20">
        <h2 className="font-semibold text-lg mb-1 text-red-400">Danger Zone</h2>
        <p className="text-secondary text-sm mb-4">Destructive actions that cannot be undone.</p>

        <div className="space-y-3">
          {/* Reset ELO only */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/5">
            <div>
              <p className="font-medium text-sm">Reset ELO Scores</p>
              <p className="text-xs text-muted">Set all player ratings back to 1000. Match history is kept.</p>
            </div>
            {confirmResetElo ? (
              <div className="flex items-center gap-2 animate-slide-up">
                <span className="text-red-400 text-xs font-medium">Sure?</span>
                <button onClick={handleResetElo} disabled={resettingElo} className="btn-danger text-xs py-1 px-3">
                  {resettingElo ? '…' : 'Yes'}
                </button>
                <button onClick={() => setConfirmResetElo(false)} className="btn-secondary text-xs py-1 px-3">No</button>
              </div>
            ) : (
              <button onClick={handleResetElo} className="btn-danger text-xs py-1.5 px-3 whitespace-nowrap">
                Reset ELO
              </button>
            )}
          </div>

          {/* Reset everything */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/5">
            <div>
              <p className="font-medium text-sm">Reset Everything</p>
              <p className="text-xs text-muted">Delete all players, matches, queue, and tables.</p>
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-2 animate-slide-up">
                <span className="text-red-400 text-xs font-medium">Sure?</span>
                <button onClick={handleReset} disabled={resetting} className="btn-danger text-xs py-1 px-3">
                  {resetting ? '…' : 'Yes'}
                </button>
                <button onClick={() => setConfirmReset(false)} className="btn-secondary text-xs py-1 px-3">No</button>
              </div>
            ) : (
              <button onClick={handleReset} className="btn-danger text-xs py-1.5 px-3 whitespace-nowrap">
                Reset All
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
