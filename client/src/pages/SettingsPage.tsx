import { useState } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { sounds } from '../utils/sounds';

// ─── App Guide ───────────────────────────────────────────────────────────────

const APP_GUIDE_STEPS = [
  { icon: '👤', title: 'Add Players', desc: 'Go to the Players tab and add every club member by name. Each player starts at 1000 ELO.' },
  { icon: '🏓', title: 'Set Up Tables', desc: 'In Settings → Tables, add the tables at your venue (e.g. "Table 1", "Main Table").' },
  { icon: '⏳', title: 'Build the Queue', desc: 'Go to the Queue tab. Search for players and click + to add them to the waiting list. Drag rows to reorder.' },
  { icon: '▶', title: 'Start a Match', desc: 'Drag players from the queue onto a table card — left side and right side. Hit "Start Match". Supports singles (1v1) and doubles (2v2).' },
  { icon: '✓', title: 'Complete a Match', desc: 'In the Matches tab, click "Complete" on an active match. Enter the score and pick the winner — ELO updates automatically.' },
  { icon: '🏆', title: 'Check the Leaderboard', desc: 'The Leaderboard tab ranks all players by ELO in real time. Wins, losses, and win rate are all tracked.' },
  { icon: '⊞', title: 'Dashboard Overview', desc: 'The Dashboard shows active matches with live timers, the current queue, and recent results at a glance.' },
];

// ─── ELO Guide ───────────────────────────────────────────────────────────────

const ELO_SECTIONS = [
  {
    icon: '📊',
    title: 'What is ELO?',
    content: 'ELO is a skill rating system. Every player starts at 1000. When you win, you gain points; when you lose, you lose points. How many points change depends on how evenly matched you were.',
  },
  {
    icon: '🎯',
    title: 'Expected Score',
    content: 'Before each match, the system calculates how likely each player is to win based on the rating gap. The bigger the gap, the more lopsided the prediction. A 150-point difference means the higher-rated player is expected to win ~91% of the time.',
  },
  {
    icon: '⚡',
    title: 'K-Factor (How Fast Ratings Move)',
    content: null,
    tiers: [
      { label: 'New player (< 15 matches)', k: 40, note: 'Ratings calibrate quickly' },
      { label: 'Rating below 1500', k: 32, note: 'Standard movement' },
      { label: 'Rating 1500 – 1800', k: 26, note: 'Slower — more established' },
      { label: 'Rating above 1800', k: 20, note: 'Slowest — top players are stable' },
    ],
  },
  {
    icon: '🔢',
    title: 'The Formula',
    content: null,
    formula: true,
  },
  {
    icon: '💡',
    title: 'Real Examples',
    content: null,
    examples: [
      { scenario: 'Equal players (1000 vs 1000)', result: 'Winner: +20 pts · Loser: −20 pts', highlight: false },
      { scenario: 'Underdog wins (900 beats 1200)', result: 'Winner: +35 pts · Loser: −25 pts', highlight: true },
      { scenario: 'Favourite wins (1200 beats 900)', result: 'Winner: +7 pts · Loser: −9 pts', highlight: false },
      { scenario: 'Big upset (800 beats 1400)', result: 'Winner: ~+39 pts · Loser: ~−29 pts', highlight: true },
    ],
  },
];

// ─── Modals ──────────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={() => { sounds.cancel(); onClose(); }}
    >
      {/* pt-20 clears the sticky navbar; pb-8 gives room at bottom */}
      <div className="flex justify-center min-h-full px-4 pt-20 pb-8">
        <div
          className="card w-full max-w-2xl h-fit animate-slide-up p-10"
          onClick={e => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between mb-7">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-secondary text-sm mt-1">{subtitle}</p>
      </div>
      <button
        onClick={() => { sounds.cancel(); onClose(); }}
        className="text-muted hover:text-primary transition-colors text-3xl leading-none w-9 h-9 flex items-center justify-center rounded-lg hover:bg-card flex-shrink-0 ml-4"
      >×</button>
    </div>
  );
}

function AppGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="How to Use PingTrack" subtitle="Step-by-step app guide" onClose={onClose} />
      <ol className="space-y-5">
        {APP_GUIDE_STEPS.map((step, i) => (
          <li key={i} className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-sm font-bold text-green-400">
              {i + 1}
            </div>
            <div className="pt-1">
              <p className="font-semibold text-base">{step.icon} {step.title}</p>
              <p className="text-secondary text-sm mt-1 leading-relaxed">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8 pt-5 border-t border-theme text-center">
        <p className="text-sm text-muted">PingTrack is in beta — all data persists between sessions.</p>
      </div>
    </Modal>
  );
}

function EloGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="How ELO Works" subtitle="Understanding your rating" onClose={onClose} />
      <div className="space-y-7">
        {ELO_SECTIONS.map((section, i) => (
          <div key={i}>
            <p className="font-semibold text-base mb-3 flex items-center gap-2">
              <span>{section.icon}</span> {section.title}
            </p>

            {section.content && (
              <p className="text-secondary text-sm leading-relaxed">{section.content}</p>
            )}

            {section.tiers && (
              <div className="space-y-2">
                {section.tiers.map((tier, j) => (
                  <div key={j} className="flex items-center justify-between px-4 py-3 rounded-lg bg-input border border-theme">
                    <span className="text-secondary text-sm">{tier.label}</span>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="font-bold text-green-400 text-sm">K={tier.k}</span>
                      <span className="text-muted text-xs hidden sm:inline">— {tier.note}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {section.formula && (
              <div className="rounded-lg bg-input border border-theme p-5 space-y-3">
                <div className="text-sm font-mono text-center text-green-400 py-1">
                  Expected = 1 ÷ (1 + 10 ^ ((opponent − you) ÷ 150))
                </div>
                <div className="border-t border-theme pt-3 text-sm font-mono text-center text-primary">
                  New Rating = Old Rating + K × (Result − Expected)
                </div>
                <p className="text-sm text-muted text-center pt-1">Result = 1 for a win, 0 for a loss</p>
              </div>
            )}

            {section.examples && (
              <div className="space-y-2">
                {section.examples.map((ex, j) => (
                  <div key={j} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    ex.highlight ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-input border-theme'
                  }`}>
                    <span className="text-secondary text-sm">{ex.scenario}</span>
                    <span className={`font-medium flex-shrink-0 ml-4 text-sm ${ex.highlight ? 'text-yellow-400' : 'text-primary'}`}>
                      {ex.result}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {i < ELO_SECTIONS.length - 1 && <div className="border-b border-theme/50 mt-6" />}
          </div>
        ))}
      </div>
      <div className="mt-8 pt-5 border-t border-theme text-center">
        <p className="text-sm text-muted">PingTrack uses the TTR-style formula (divisor 150) used in German club table tennis.</p>
      </div>
    </Modal>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

function ToggleRow({
  icon, label, sublabel, value, onChange,
}: { icon: string; label: string; sublabel: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted truncate">{sublabel}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          value ? 'bg-green-500' : 'bg-card border border-theme'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { theme, setTheme, tables, soundEnabled, setSoundEnabled, hideElo, setHideElo } = useApp();
  const [newTable, setNewTable] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmResetElo, setConfirmResetElo] = useState(false);
  const [resettingElo, setResettingElo] = useState(false);
  const [showAppGuide, setShowAppGuide] = useState(false);
  const [showEloGuide, setShowEloGuide] = useState(false);

  async function handleResetElo() {
    if (!confirmResetElo) { setConfirmResetElo(true); return; }
    setResettingElo(true);
    try { await api.resetElo(); setConfirmResetElo(false); }
    catch (e: any) { setError(e.message); }
    finally { setResettingElo(false); }
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    if (!newTable.trim()) return;
    setLoading(true); setError('');
    try { await api.createTable(newTable.trim()); sounds.success(); setNewTable(''); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function removeTable(id: number) {
    try { sounds.remove(); await api.deleteTable(id); }
    catch (e: any) { setError(e.message); }
  }

  async function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return; }
    setResetting(true);
    try { await api.resetAll(); setConfirmReset(false); }
    catch (e: any) { setError(e.message); }
    finally { setResetting(false); }
  }

  return (
    <div className="animate-fade-in">
      {showAppGuide && <AppGuideModal onClose={() => setShowAppGuide(false)} />}
      {showEloGuide && <EloGuideModal onClose={() => setShowEloGuide(false)} />}

      <div className="mb-7">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-secondary text-sm mt-1">Manage your club, preferences, and account.</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-slide-up mb-6">
          <span>⚠</span> {error}
          <button onClick={() => { sounds.cancel(); setError(''); }} className="ml-auto opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* ── Main two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-6 items-start">

        {/* Left column: Appearance, Preferences, Help */}
        <div className="space-y-6">

          {/* Appearance */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🎨</span>
              <h2 className="font-semibold text-base">Appearance</h2>
            </div>
            <div className="flex gap-3">
              {[
                { value: 'dark' as const, icon: '🌙', label: 'Dark', sub: 'Easy on the eyes' },
                { value: 'light' as const, icon: '☀️', label: 'Light', sub: 'Bright and clean' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { sounds.click(); setTheme(opt.value); }}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                    theme === opt.value ? 'border-green-500 bg-green-500/10' : 'border-theme hover:border-hover'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-left">
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-muted text-xs">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⚙️</span>
              <h2 className="font-semibold text-base">Preferences</h2>
            </div>
            <div className="space-y-4">
              <ToggleRow
                icon={soundEnabled ? '🔊' : '🔇'}
                label="UI Sounds"
                sublabel="Sounds for drag, drop, and match events"
                value={soundEnabled}
                onChange={() => { sounds.tick(); setSoundEnabled(!soundEnabled); }}
              />
              <div className="border-t border-theme/50" />
              <ToggleRow
                icon="👁"
                label="Hide ELO Scores"
                sublabel="Mask ratings across the app"
                value={hideElo}
                onChange={() => { sounds.tick(); setHideElo(!hideElo); }}
              />
            </div>
          </div>

          {/* Help */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📚</span>
              <h2 className="font-semibold text-base">Help & Resources</h2>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { sounds.pickup(); setShowAppGuide(true); }}
                className="group w-full flex items-center gap-4 p-4 rounded-xl border border-theme hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-200 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-green-500/25 transition-colors">
                  📖
                </div>
                <div>
                  <p className="font-semibold text-sm">App Guide</p>
                  <p className="text-xs text-muted mt-0.5">Step-by-step walkthrough of every feature.</p>
                </div>
                <span className="ml-auto text-muted group-hover:text-primary transition-colors text-sm">→</span>
              </button>
              <button
                onClick={() => { sounds.pickup(); setShowEloGuide(true); }}
                className="group w-full flex items-center gap-4 p-4 rounded-xl border border-theme hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-blue-500/25 transition-colors">
                  📊
                </div>
                <div>
                  <p className="font-semibold text-sm">ELO Guide</p>
                  <p className="text-xs text-muted mt-0.5">How ratings work, K-factors, and examples.</p>
                </div>
                <span className="ml-auto text-muted group-hover:text-primary transition-colors text-sm">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Tables + Danger Zone */}
        <div className="space-y-6">

          {/* Tables */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🏓</span>
              <h2 className="font-semibold text-base">Tables</h2>
              <span className="ml-auto text-xs text-muted">{tables.length} configured</span>
            </div>

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
                {loading ? 'Adding…' : '+ Add'}
              </button>
            </form>

            {tables.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🏓</p>
                <p className="text-muted text-sm">No tables configured yet.</p>
                <p className="text-muted text-xs mt-1">Add one above to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tables.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-theme bg-input hover:border-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.status === 'available' ? 'bg-green-400' : 'bg-orange-400 animate-pulse'}`} />
                      <p className="font-medium text-sm">{t.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'available' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                        {t.status}
                      </span>
                    </div>
                    <button
                      onClick={() => removeTable(t.id)}
                      disabled={t.status === 'occupied'}
                      className="text-muted hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-lg leading-none"
                      title={t.status === 'occupied' ? 'Cannot remove while in use' : 'Remove'}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="card p-6 border-red-500/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⚠️</span>
              <h2 className="font-semibold text-base text-red-400">Danger Zone</h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5">
                <div className="min-w-0">
                  <p className="font-medium text-sm">Reset ELO Scores</p>
                  <p className="text-xs text-muted mt-0.5">Set all ratings to 1000. Match history is kept.</p>
                </div>
                {confirmResetElo ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0 animate-slide-up">
                    <span className="text-red-400 text-xs font-medium">Sure?</span>
                    <button onClick={() => { sounds.void(); handleResetElo(); }} disabled={resettingElo}
                      className="btn-danger text-xs py-1 px-3">{resettingElo ? '…' : 'Yes'}</button>
                    <button onClick={() => { sounds.cancel(); setConfirmResetElo(false); }}
                      className="btn-secondary text-xs py-1 px-3">No</button>
                  </div>
                ) : (
                  <button onClick={() => { sounds.void(); handleResetElo(); }}
                    className="btn-danger text-xs py-1.5 px-3 whitespace-nowrap flex-shrink-0">Reset ELO</button>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5">
                <div className="min-w-0">
                  <p className="font-medium text-sm">Reset Everything</p>
                  <p className="text-xs text-muted mt-0.5">Delete all players, matches, queue, and tables.</p>
                </div>
                {confirmReset ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0 animate-slide-up">
                    <span className="text-red-400 text-xs font-medium">Sure?</span>
                    <button onClick={() => { sounds.void(); handleReset(); }} disabled={resetting}
                      className="btn-danger text-xs py-1 px-3">{resetting ? '…' : 'Yes'}</button>
                    <button onClick={() => { sounds.cancel(); setConfirmReset(false); }}
                      className="btn-secondary text-xs py-1 px-3">No</button>
                  </div>
                ) : (
                  <button onClick={() => { sounds.void(); handleReset(); }}
                    className="btn-danger text-xs py-1.5 px-3 whitespace-nowrap flex-shrink-0">Reset All</button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
