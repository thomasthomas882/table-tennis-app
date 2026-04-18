const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.DB_PATH || path.join(__dirname, 'tabletennis.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    elo INTEGER NOT NULL DEFAULT 1000,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tables_tt (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    position INTEGER,
    UNIQUE(player_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER REFERENCES tables_tt(id),
    player1_id INTEGER NOT NULL REFERENCES players(id),
    player2_id INTEGER NOT NULL REFERENCES players(id),
    player3_id INTEGER REFERENCES players(id),
    player4_id INTEGER REFERENCES players(id),
    player1_score INTEGER NOT NULL DEFAULT 0,
    player2_score INTEGER NOT NULL DEFAULT 0,
    winner_id INTEGER REFERENCES players(id),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS elo_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    elo INTEGER NOT NULL,
    elo_delta INTEGER NOT NULL,
    match_id INTEGER REFERENCES matches(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id INTEGER NOT NULL REFERENCES players(id),
    player2_id INTEGER NOT NULL REFERENCES players(id),
    format INTEGER NOT NULL DEFAULT 3,
    wins1 INTEGER NOT NULL DEFAULT 0,
    wins2 INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
    winner_id INTEGER REFERENCES players(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  )
`);

// Migrations for existing databases (safe to re-run)
try { db.exec('ALTER TABLE queue ADD COLUMN position INTEGER'); } catch (_) {}
try { db.exec('ALTER TABLE matches ADD COLUMN player3_id INTEGER REFERENCES players(id)'); } catch (_) {}
try { db.exec('ALTER TABLE matches ADD COLUMN player4_id INTEGER REFERENCES players(id)'); } catch (_) {}
try { db.exec('ALTER TABLE tables_tt ADD COLUMN position INTEGER'); } catch (_) {}
try { db.exec('ALTER TABLE players ADD COLUMN current_streak INTEGER DEFAULT 0'); } catch (_) {}
try { db.exec('ALTER TABLE players ADD COLUMN best_streak INTEGER DEFAULT 0'); } catch (_) {}
try { db.exec('ALTER TABLE matches ADD COLUMN series_id INTEGER REFERENCES series(id)'); } catch (_) {}
try { db.exec('ALTER TABLE players ADD COLUMN elo_doubles INTEGER DEFAULT 1000'); } catch (_) {}
try { db.exec('ALTER TABLE players ADD COLUMN doubles_wins INTEGER DEFAULT 0'); } catch (_) {}
try { db.exec('ALTER TABLE players ADD COLUMN doubles_losses INTEGER DEFAULT 0'); } catch (_) {}
try { db.exec("ALTER TABLE elo_history ADD COLUMN rating_type TEXT DEFAULT 'singles'"); } catch (_) {}
try { db.exec('ALTER TABLE players ADD COLUMN current_losing_streak INTEGER DEFAULT 0'); } catch (_) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(player_id, achievement_id)
  )
`);

// Indexes for high-frequency query columns
try { db.exec('CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)'); } catch (_) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_matches_players ON matches(player1_id, player2_id)'); } catch (_) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_matches_series ON matches(series_id)'); } catch (_) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_elo_history_player ON elo_history(player_id)'); } catch (_) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_elo_history_match ON elo_history(match_id)'); } catch (_) {}

// Seed default tables if empty
const tableCount = db.prepare('SELECT COUNT(*) as c FROM tables_tt').get().c;
if (tableCount === 0) {
  const insert = db.prepare("INSERT INTO tables_tt (name) VALUES (?)");
  insert.run('Table 1');
  insert.run('Table 2');
  insert.run('Table 3');
  insert.run('Table 4');
}

module.exports = db;
