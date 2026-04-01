const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { calculateNewRatings } = require('./elo');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function broadcast(event, data) { io.emit(event, data); }
function notify(message, type = 'info') {
  broadcast('notification', { message, type, id: Date.now() });
}

// ─── Players ─────────────────────────────────────────────────────────────────

app.get('/api/players', (req, res) => {
  res.json(db.prepare('SELECT * FROM players ORDER BY elo DESC').all());
});

app.post('/api/players', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = db.prepare('INSERT INTO players (name) VALUES (?)').run(name.trim());
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
    broadcast('players:updated', db.prepare('SELECT * FROM players ORDER BY elo DESC').all());
    notify(`${player.name} joined the club!`, 'success');
    res.status(201).json(player);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Player already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/players/:id', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  broadcast('players:updated', db.prepare('SELECT * FROM players ORDER BY elo DESC').all());
  res.json({ ok: true });
});

// ─── Queue ───────────────────────────────────────────────────────────────────

function getQueue() {
  return db.prepare(`
    SELECT q.id, q.joined_at, q.position, p.id as player_id, p.name, p.elo
    FROM queue q JOIN players p ON q.player_id = p.id
    ORDER BY COALESCE(q.position, q.id) ASC
  `).all();
}

app.get('/api/queue', (req, res) => res.json(getQueue()));

app.post('/api/queue', (req, res) => {
  const { player_id } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(player_id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const activeMatch = db.prepare(`
    SELECT id FROM matches WHERE status = 'in_progress'
    AND (player1_id = ? OR player2_id = ? OR player3_id = ? OR player4_id = ?)
  `).get(player_id, player_id, player_id, player_id);
  if (activeMatch) return res.status(409).json({ error: 'Player already in a match' });

  try {
    const maxPos = db.prepare('SELECT MAX(position) as mp FROM queue').get().mp ?? -1;
    db.prepare('INSERT INTO queue (player_id, position) VALUES (?, ?)').run(player_id, maxPos + 1);
    const queue = getQueue();
    broadcast('queue:updated', queue);
    notify(`${player.name} joined the queue (position ${queue.length})`, 'info');
    res.status(201).json(queue);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already in queue' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/queue/:player_id', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.player_id);
  db.prepare('DELETE FROM queue WHERE player_id = ?').run(req.params.player_id);
  const queue = getQueue();
  broadcast('queue:updated', queue);
  if (player) notify(`${player.name} left the queue`, 'info');
  res.json(queue);
});

// Reorder queue
app.patch('/api/queue/reorder', (req, res) => {
  const { playerIds } = req.body;
  if (!Array.isArray(playerIds)) return res.status(400).json({ error: 'playerIds array required' });

  db.exec('BEGIN');
  try {
    playerIds.forEach((pid, idx) => {
      db.prepare('UPDATE queue SET position = ? WHERE player_id = ?').run(idx, pid);
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Reorder failed' });
  }

  const queue = getQueue();
  broadcast('queue:updated', queue);
  res.json(queue);
});

// ─── Tables ──────────────────────────────────────────────────────────────────

function getTables() {
  return db.prepare('SELECT * FROM tables_tt ORDER BY COALESCE(position, id)').all();
}

app.get('/api/tables', (req, res) => res.json(getTables()));

app.post('/api/tables', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const result = db.prepare('INSERT INTO tables_tt (name) VALUES (?)').run(name.trim());
    const table = db.prepare('SELECT * FROM tables_tt WHERE id = ?').get(result.lastInsertRowid);
    broadcast('tables:updated', getTables());
    res.status(201).json(table);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Table name taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tables/:id', (req, res) => {
  db.prepare('DELETE FROM tables_tt WHERE id = ?').run(req.params.id);
  broadcast('tables:updated', getTables());
  res.json({ ok: true });
});

// Reorder tables
app.patch('/api/tables/reorder', (req, res) => {
  const { tableIds } = req.body;
  if (!Array.isArray(tableIds)) return res.status(400).json({ error: 'tableIds array required' });

  db.exec('BEGIN');
  try {
    tableIds.forEach((id, idx) => {
      db.prepare('UPDATE tables_tt SET position = ? WHERE id = ?').run(idx, id);
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Reorder failed' });
  }

  const tables = getTables();
  broadcast('tables:updated', tables);
  res.json(tables);
});

// ─── Matches ─────────────────────────────────────────────────────────────────

function getMatches(status) {
  const where = status ? `WHERE m.status = '${status}'` : '';
  return db.prepare(`
    SELECT m.*,
      p1.name as player1_name, p1.elo as player1_elo,
      p2.name as player2_name, p2.elo as player2_elo,
      p3.name as player3_name, p3.elo as player3_elo,
      p4.name as player4_name, p4.elo as player4_elo,
      w.name as winner_name,
      t.name as table_name
    FROM matches m
    JOIN players p1 ON m.player1_id = p1.id
    JOIN players p2 ON m.player2_id = p2.id
    LEFT JOIN players p3 ON m.player3_id = p3.id
    LEFT JOIN players p4 ON m.player4_id = p4.id
    LEFT JOIN players w ON m.winner_id = w.id
    LEFT JOIN tables_tt t ON m.table_id = t.id
    ${where}
    ORDER BY m.created_at DESC
    LIMIT 100
  `).all();
}

app.get('/api/matches', (req, res) => {
  res.json(getMatches(req.query.status));
});

// Start a match
app.post('/api/matches/start', (req, res) => {
  const { player1_id, player2_id, player3_id, player4_id, table_id } = req.body;
  if (!player1_id || !player2_id) return res.status(400).json({ error: 'At least two players required' });

  const ids = [player1_id, player2_id, player3_id, player4_id].filter(Boolean);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) return res.status(400).json({ error: 'Players must be distinct' });

  const players = ids.map(id => db.prepare('SELECT * FROM players WHERE id = ?').get(id));
  if (players.some(p => !p)) return res.status(404).json({ error: 'Player not found' });

  db.exec('BEGIN');
  try {
    const result = db.prepare(
      'INSERT INTO matches (player1_id, player2_id, player3_id, player4_id, table_id) VALUES (?, ?, ?, ?, ?)'
    ).run(player1_id, player2_id, player3_id || null, player4_id || null, table_id || null);

    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM queue WHERE player_id IN (${placeholders})`).run(...ids);

    if (table_id) {
      db.prepare("UPDATE tables_tt SET status = 'occupied' WHERE id = ?").run(table_id);
    }

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const match = getMatches()[0];
  broadcast('match:started', match);
  broadcast('queue:updated', getQueue());
  broadcast('tables:updated', getTables());

  const p1 = players[0], p2 = players[1];
  const isDoubles = !!(player3_id || player4_id);
  notify(`Match started: ${p1.name}${player3_id ? ' & ' + players[2]?.name : ''} vs ${p2.name}${player4_id ? ' & ' + players[3]?.name : ''}`, 'match');
  res.status(201).json(match);
});

// Update score
app.patch('/api/matches/:id/score', (req, res) => {
  const { player1_score, player2_score } = req.body;
  const match = db.prepare("SELECT * FROM matches WHERE id = ? AND status = 'in_progress'").get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Active match not found' });

  db.prepare('UPDATE matches SET player1_score = ?, player2_score = ? WHERE id = ?')
    .run(player1_score ?? match.player1_score, player2_score ?? match.player2_score, match.id);

  const updated = getMatches('in_progress').find(m => m.id === match.id);
  broadcast('match:scoreUpdated', updated);
  res.json(updated);
});

// Complete match
app.post('/api/matches/:id/complete', (req, res) => {
  const { winner_id } = req.body;
  const match = db.prepare("SELECT * FROM matches WHERE id = ? AND status = 'in_progress'").get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Active match not found' });
  if (!winner_id) return res.status(400).json({ error: 'winner_id required' });

  // Determine teams (winner_id is either player1_id or player2_id = team captain)
  let winnerIds, loserIds;
  if (winner_id === match.player1_id) {
    winnerIds = [match.player1_id, match.player3_id].filter(Boolean);
    loserIds  = [match.player2_id, match.player4_id].filter(Boolean);
  } else if (winner_id === match.player2_id) {
    winnerIds = [match.player2_id, match.player4_id].filter(Boolean);
    loserIds  = [match.player1_id, match.player3_id].filter(Boolean);
  } else {
    return res.status(400).json({ error: 'Winner must be a match participant' });
  }

  const winnerPlayers = winnerIds.map(id => db.prepare('SELECT * FROM players WHERE id = ?').get(id));
  const loserPlayers  = loserIds.map(id  => db.prepare('SELECT * FROM players WHERE id = ?').get(id));

  const avgWinnerElo     = Math.round(winnerPlayers.reduce((s, p) => s + p.elo, 0) / winnerPlayers.length);
  const avgLoserElo      = Math.round(loserPlayers.reduce((s, p)  => s + p.elo, 0)  / loserPlayers.length);
  const avgWinnerMatches = Math.round(winnerPlayers.reduce((s, p) => s + p.wins + p.losses, 0) / winnerPlayers.length);
  const avgLoserMatches  = Math.round(loserPlayers.reduce((s, p)  => s + p.wins + p.losses, 0)  / loserPlayers.length);
  const { winnerDelta, loserDelta } = calculateNewRatings(avgWinnerElo, avgLoserElo, avgWinnerMatches, avgLoserMatches);

  const allPlayerIds = [match.player1_id, match.player2_id, match.player3_id, match.player4_id].filter(Boolean);

  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE matches SET status = 'completed', winner_id = ?, completed_at = datetime('now') WHERE id = ?`)
      .run(winner_id, match.id);

    winnerIds.forEach(id => db.prepare('UPDATE players SET wins = wins + 1, elo = elo + ? WHERE id = ?').run(winnerDelta, id));
    loserIds.forEach(id  => db.prepare('UPDATE players SET losses = losses + 1, elo = elo + ? WHERE id = ?').run(loserDelta, id));

    if (match.table_id) {
      db.prepare("UPDATE tables_tt SET status = 'available' WHERE id = ?").run(match.table_id);
    }

    // Auto re-queue all match players
    const maxPos = db.prepare('SELECT MAX(position) as mp FROM queue').get().mp ?? -1;
    allPlayerIds.forEach((pid, i) => {
      try {
        db.prepare('INSERT INTO queue (player_id, position) VALUES (?, ?)').run(pid, maxPos + 1 + i);
      } catch (_) { /* already in queue */ }
    });

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const completedMatch = getMatches().find(m => m.id === match.id);
  broadcast('match:completed', completedMatch);
  broadcast('tables:updated', getTables());
  broadcast('queue:updated', getQueue());
  broadcast('leaderboard:updated', db.prepare('SELECT * FROM players ORDER BY elo DESC').all());

  const winnerName = winnerPlayers.map(p => p.name).join(' & ');
  const loserName  = loserPlayers.map(p => p.name).join(' & ');
  notify(`${winnerName} beat ${loserName}! ELO: ${winnerDelta > 0 ? '+' : ''}${winnerDelta}`, 'success');
  res.json(completedMatch);
});

// Void match
app.delete('/api/matches/:id', (req, res) => {
  const match = db.prepare("SELECT * FROM matches WHERE id = ? AND status = 'in_progress'").get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Active match not found' });

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM matches WHERE id = ?').run(match.id);
    if (match.table_id) {
      db.prepare("UPDATE tables_tt SET status = 'available' WHERE id = ?").run(match.table_id);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to void match' });
  }

  broadcast('tables:updated', getTables());
  broadcast('match:completed', null);
  notify('Match voided — no scores recorded', 'warning');
  res.json({ ok: true });
});

// ─── Leaderboard ─────────────────────────────────────────────────────────────

app.get('/api/leaderboard', (req, res) => {
  res.json(db.prepare(`
    SELECT *, (wins + losses) as total_games,
    CASE WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1) ELSE 0 END as win_rate
    FROM players
    WHERE (wins + losses) > 0
    ORDER BY elo DESC
  `).all());
});

// ─── Stats ────────────────────────────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  res.json({
    totalPlayers: db.prepare('SELECT COUNT(*) as c FROM players').get().c,
    totalMatches: db.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'completed'").get().c,
    activeMatches: db.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'in_progress'").get().c,
    queueLength: db.prepare('SELECT COUNT(*) as c FROM queue').get().c,
  });
});

// ─── Reset ELO only ──────────────────────────────────────────────────────────

app.post('/api/reset-elo', (req, res) => {
  db.exec('UPDATE players SET elo = 1000');
  const players = db.prepare('SELECT * FROM players ORDER BY elo DESC').all();
  broadcast('players:updated', players);
  broadcast('leaderboard:updated', players);
  notify('All ELO ratings have been reset to 1000', 'warning');
  res.json({ ok: true });
});

// ─── Reset ────────────────────────────────────────────────────────────────────

app.post('/api/reset', (req, res) => {
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM matches');
    db.exec('DELETE FROM queue');
    db.exec('DELETE FROM players');
    db.exec('DELETE FROM tables_tt');
    const insert = db.prepare("INSERT INTO tables_tt (name) VALUES (?)");
    ['Table 1', 'Table 2', 'Table 3', 'Table 4'].forEach(n => insert.run(n));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Reset failed' });
  }
  broadcast('players:updated', []);
  broadcast('queue:updated', []);
  broadcast('tables:updated', getTables());
  broadcast('match:completed', null);
  notify('Everything has been reset!', 'warning');
  res.json({ ok: true });
});

// ─── Socket.io ───────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  socket.emit('init', {
    players: db.prepare('SELECT * FROM players ORDER BY elo DESC').all(),
    queue: getQueue(),
    tables: getTables(),
    matches: getMatches('in_progress'),
  });
});

// ─── Fallback ────────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
