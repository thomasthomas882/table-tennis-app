const ACHIEVEMENTS = [
  // ── Milestones ──────────────────────────────────────────────────────────────
  { id: 'first_win',        name: 'First Blood',       icon: '🩸', description: 'Win your very first match' },
  { id: 'first_loss',       name: 'Gravity Check',     icon: '😭', description: 'Lose your very first match. Happens to everyone.' },
  { id: 'getting_started',  name: 'Getting Started',   icon: '🏓', description: 'Play 10 total matches' },
  { id: 'veteran',          name: 'Veteran',            icon: '🎗️', description: 'Play 50 total matches' },
  { id: 'centurion',        name: 'Centurion',          icon: '⚔️', description: 'Play 100 total matches' },
  { id: 'quarter_century',  name: 'Quarter Century',    icon: '🎖️', description: 'Win 25 matches total' },
  { id: 'ace',              name: 'Ace',                icon: '🏆', description: 'Win 50 matches total' },

  // ── Win Streaks ─────────────────────────────────────────────────────────────
  { id: 'hat_trick',        name: 'Hat Trick',          icon: '🎩', description: 'Win 3 matches in a row' },
  { id: 'on_fire',          name: 'On Fire',            icon: '🔥', description: 'Win 5 matches in a row' },
  { id: 'unstoppable',      name: 'Unstoppable',        icon: '🌊', description: 'Win 10 matches in a row. Simply unstoppable.' },

  // ── Losing (fun) ────────────────────────────────────────────────────────────
  { id: 'rough_patch',      name: 'Rough Patch',        icon: '😬', description: 'Lose 3 matches in a row. It happens to the best of us.' },
  { id: 'rock_bottom',      name: 'Rock Bottom',        icon: '⛏️', description: 'Lose 5 matches in a row. Nowhere to go but up!' },

  // ── Score-based ─────────────────────────────────────────────────────────────
  { id: 'bagel',            name: 'Bagel Baker',        icon: '🥯', description: 'Win a match without your opponent scoring a single point' },
  { id: 'squeaky',          name: 'Squeaky Clean',      icon: '😤', description: 'Win by exactly 2 points — the closest possible victory' },
  { id: 'obliterate',       name: 'Obliteration',       icon: '💥', description: 'Win by 7 or more points. Absolute domination.' },

  // ── ELO ─────────────────────────────────────────────────────────────────────
  { id: 'underdog',         name: 'David vs Goliath',   icon: '🪨', description: 'Beat someone with 100+ more ELO than you' },
  { id: 'kingslayer',       name: 'Kingslayer',         icon: '🗡️', description: 'Defeat the current #1 ranked player' },
  { id: 'rising_star',      name: 'Rising Star',        icon: '⭐', description: 'Reach 1100 ELO' },
  { id: 'sharp_paddle',     name: 'Sharp Paddle',       icon: '🎯', description: 'Reach 1200 ELO' },
  { id: 'elite',            name: 'Elite',              icon: '👑', description: 'Reach 1500 ELO. You are among the very best.' },
  { id: 'freefall',         name: 'Freefall',           icon: '📉', description: 'Drop 100 ELO below your personal best. Ouch.' },
  { id: 'comeback_king',    name: 'Comeback King',      icon: '🔄', description: 'Set a new personal ELO high after dropping 50+ points from your peak' },

  // ── Doubles ─────────────────────────────────────────────────────────────────
  { id: 'dynamic_duo',      name: 'Dynamic Duo',        icon: '🤝', description: 'Win your first doubles match' },
  { id: 'doubles_devotee',  name: 'Doubles Devotee',    icon: '👥', description: 'Win 10 doubles matches' },

  // ── Social ──────────────────────────────────────────────────────────────────
  { id: 'social_butterfly', name: 'Social Butterfly',   icon: '🦋', description: 'Beat 5 different opponents' },
  { id: 'rivals',           name: "Everyone's Rival",   icon: '😈', description: 'Beat 10 different opponents. No one is safe.' },

  // ── Time-based ──────────────────────────────────────────────────────────────
  { id: 'night_owl',        name: 'Night Owl',          icon: '🦉', description: 'Win a match after 9pm. The late-night grind.' },
  { id: 'dedicated',        name: 'Dedicated',          icon: '🌅', description: 'Win a match before 8am. Absolute dedication.' },

  // ── Ephemeral (computed on request, not stored in DB) ───────────────────────
  { id: 'ghost',            name: 'Ghost',              icon: '👻', description: "Hasn't been seen at the club in over a week", ephemeral: true },
  { id: 'hermit',           name: 'Hermit',             icon: '🏠', description: "Has completely vanished from the club for over a month", ephemeral: true },
];

module.exports = { ACHIEVEMENTS };
