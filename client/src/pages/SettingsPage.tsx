import { useState } from 'react';
import { useApp } from '../App';
import { api } from '../api';

export default function SettingsPage() {
  const { theme, setTheme, tables } = useApp();
  const [newTable, setNewTable] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

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
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-slide-up">
          <span>⚠</span> {error}
          <button onClick={() => setError('')} className="ml-auto opacity-60 hover:opacity-100">×</button>
        </div>
      )}

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

      {/* Reset */}
      <div className="card border-red-500/20">
        <h2 className="font-semibold text-lg mb-1 text-red-400">Danger Zone</h2>
        <p className="text-secondary text-sm mb-4">
          Reset everything — all players, matches, queue, and tables will be deleted. This cannot be undone.
        </p>
        {confirmReset ? (
          <div className="flex items-center gap-3 animate-slide-up">
            <p className="text-red-400 text-sm font-medium">Are you sure?</p>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="btn-danger"
            >
              {resetting ? 'Resetting…' : 'Yes, Reset Everything'}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={handleReset} className="btn-danger">
            Reset Everything
          </button>
        )}
      </div>
    </div>
  );
}
