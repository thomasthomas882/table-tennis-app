const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, 'tabletennis.db'));

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

// Migrations for existing databases (safe to re-run)
try { db.exec('ALTER TABLE queue ADD COLUMN position INTEGER'); } catch (_) {}
try { db.exec('ALTER TABLE matches ADD COLUMN player3_id INTEGER REFERENCES players(id)'); } catch (_) {}
try { db.exec('ALTER TABLE matches ADD COLUMN player4_id INTEGER REFERENCES players(id)'); } catch (_) {}
try { db.exec('ALTER TABLE tables_tt ADD COLUMN position INTEGER'); } catch (_) {}

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
