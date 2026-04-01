// Lazy AudioContext — created on first user interaction to comply with browser policies
let ctx: AudioContext | null = null;
let soundEnabled = true;
export function setSoundEnabled(v: boolean) { soundEnabled = v; }

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08,
  delay = 0,
  freqEnd?: number,
) {
  if (!soundEnabled) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration * 0.9);
  }
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

export const sounds = {
  /** Soft click when picking up a draggable item */
  pickup() {
    tone(700, 0.07, 'sine', 0.06);
  },

  /** Satisfying thud when dropping a player on a table */
  drop() {
    const c = getCtx(); if (!c) return;
    tone(260, 0.14, 'sine', 0.13, 0, 130);
    tone(120, 0.18, 'sine', 0.07, 0.04);
  },

  /** Ascending chime when a match starts */
  startMatch() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'sine', 0.09, i * 0.09));
  },

  /** Downward pop when removing a player from a table */
  remove() {
    tone(400, 0.18, 'sine', 0.07, 0, 200);
  },

  /** Tiny tick for queue reorder */
  tick() {
    tone(1000, 0.04, 'triangle', 0.04);
  },

  /** Descending tone for void match */
  void() {
    [380, 290, 200].forEach((f, i) => tone(f, 0.18, 'sawtooth', 0.04, i * 0.08));
  },

  /** Notification sounds keyed by type */
  notification(type: 'success' | 'info' | 'warning' | 'match') {
    if (type === 'success') {
      [880, 1320].forEach((f, i) => tone(f, 0.22, 'sine', 0.07, i * 0.09));
    } else if (type === 'match') {
      tone(660, 0.12, 'sine', 0.09);
      tone(990, 0.25, 'sine', 0.07, 0.1);
    } else if (type === 'warning') {
      [440, 380].forEach((f, i) => tone(f, 0.18, 'triangle', 0.06, i * 0.08));
    } else {
      tone(520, 0.18, 'sine', 0.05);
    }
  },

  /** Drag handle hover — very subtle */
  hover() {
    tone(1200, 0.03, 'sine', 0.025);
  },

  /** Generic button click for nav tabs, toggles, settings */
  click() {
    tone(480, 0.07, 'sine', 0.05);
  },

  /** Score increment — bright ping */
  scoreUp() {
    tone(880, 0.09, 'sine', 0.07);
  },

  /** Score decrement — soft thud downward */
  scoreDown() {
    tone(440, 0.09, 'sine', 0.06, 0, 300);
  },

  /** Dismissing an error or cancel */
  cancel() {
    tone(360, 0.1, 'sine', 0.045, 0, 280);
  },

  /** Pleasant two-note confirm for successful adds */
  success() {
    tone(520, 0.1,  'sine', 0.07);
    tone(780, 0.14, 'sine', 0.06, 0.09);
  },
};
