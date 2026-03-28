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

// Serve built client in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// ─── Helper ─────────────────────────────────────────────────────────────────

function broadcast(event, data) {
  io.emit(event, data);
}

function notify(message, type = 'info') {
  broadcast('notification', { message, type, id: Date.now() });
}

// ─── Players ────────────────────────────────────────────────────────────────

app.get('/api/players', (req, res) => {
  const players = db.prepare('SELECT * FROM players ORDER BY elo DESC').all();
  res.json(players);
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
    SELECT q.id, q.joined_at, p.id as player_id, p.name, p.elo
    FROM queue q JOIN players p ON q.player_id = p.id
    ORDER BY q.joined_at ASC
  `).all();
}

app.get('/api/queue', (req, res) => {
  res.json(getQueue());
});

app.post('/api/queue', (req, res) => {
  const { player_id } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(player_id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // Check not already in an active match
  const activeMatch = db.prepare(`
    SELECT id FROM matches WHERE status = 'in_progress'
    AND (player1_id = ? OR player2_id = ?)
  `).get(player_id, player_id);
  if (activeMatch) return res.status(409).json({ error: 'Player already in a match' });

  try {
    db.prepare('INSERT INTO queue (player_id) VALUES (?)').run(player_id);
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

// ─── Tables ──────────────────────────────────────────────────────────────────

function getTables() {
  return db.prepare('SELECT * FROM tables_tt ORDER BY id').all();
}

app.get('/api/tables', (req, res) => {
  res.json(getTables());
});

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

// ─── Matches ─────────────────────────────────────────────────────────────────

function getMatches(status) {
  const where = status ? `WHERE m.status = '${status}'` : '';
  return db.prepare(`
    SELECT m.*,
      p1.name as player1_name, p1.elo as player1_elo,
      p2.name as player2_name, p2.elo as player2_elo,
      w.name as winner_name,
      t.name as table_name
    FROM matches m
    JOIN players p1 ON m.player1_id = p1.id
    JOIN players p2 ON m.player2_id = p2.id
    LEFT JOIN players w ON m.winner_id = w.id
    LEFT JOIN tables_tt t ON m.table_id = t.id
    ${where}
    ORDER BY m.created_at DESC
    LIMIT 100
  `).all();
}

app.get('/api/matches', (req, res) => {
  const { status } = req.query;
  res.json(getMatches(status));
});

// Start a match (dequeue two players, assign a table)
app.post('/api/matches/start', (req, res) => {
  const { player1_id, player2_id, table_id } = req.body;
  if (!player1_id || !player2_id) return res.status(400).json({ error: 'Two players required' });
  if (player1_id === player2_id) return res.status(400).json({ error: 'Players must be different' });

  const p1 = db.prepare('SELECT * FROM players WHERE id = ?').get(player1_id);
  const p2 = db.prepare('SELECT * FROM players WHERE id = ?').get(player2_id);
  if (!p1 || !p2) return res.status(404).json({ error: 'Player not found' });

  let matchId;
  db.exec('BEGIN');
  try {
    const result = db.prepare(
      'INSERT INTO matches (player1_id, player2_id, table_id) VALUES (?, ?, ?)'
    ).run(player1_id, player2_id, table_id || null);

    db.prepare('DELETE FROM queue WHERE player_id IN (?, ?)').run(player1_id, player2_id);

    if (table_id) {
      db.prepare("UPDATE tables_tt SET status = 'occupied' WHERE id = ?").run(table_id);
    }

    matchId = result.lastInsertRowid;
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  const match = getMatches()[0]; // latest
  broadcast('match:started', match);
  broadcast('queue:updated', getQueue());
  broadcast('tables:updated', getTables());
  notify(`Match started: ${p1.name} vs ${p2.name}`, 'match');
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
  if (winner_id !== match.player1_id && winner_id !== match.player2_id)
    return res.status(400).json({ error: 'Winner must be a match participant' });

  const loserId = winner_id === match.player1_id ? match.player2_id : match.player1_id;
  const winner = db.prepare('SELECT * FROM players WHERE id = ?').get(winner_id);
  const loser = db.prepare('SELECT * FROM players WHERE id = ?').get(loserId);
  const { newWinnerElo, newLoserElo, winnerDelta, loserDelta } = calculateNewRatings(winner.elo, loser.elo);

  db.exec('BEGIN');
  try {
    db.prepare(`
      UPDATE matches SET status = 'completed', winner_id = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(winner_id, match.id);

    db.prepare('UPDATE players SET wins = wins + 1, elo = ? WHERE id = ?').run(newWinnerElo, winner_id);
    db.prepare('UPDATE players SET losses = losses + 1, elo = ? WHERE id = ?').run(newLoserElo, loserId);

    if (match.table_id) {
      db.prepare("UPDATE tables_tt SET status = 'available' WHERE id = ?").run(match.table_id);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const completedMatch = getMatches().find(m => m.id === match.id);
  broadcast('match:completed', completedMatch);
  broadcast('tables:updated', getTables());
  broadcast('leaderboard:updated', db.prepare('SELECT * FROM players ORDER BY elo DESC').all());
  notify(
    `${winner.name} beat ${loser.name}! ELO: ${winner.name} ${winnerDelta > 0 ? '+' : ''}${winnerDelta}, ${loser.name} ${loserDelta}`,
    'success'
  );
  res.json(completedMatch);
});

// ─── Leaderboard ─────────────────────────────────────────────────────────────

app.get('/api/leaderboard', (req, res) => {
  const players = db.prepare(`
    SELECT *, (wins + losses) as total_games,
    CASE WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1) ELSE 0 END as win_rate
    FROM players
    WHERE (wins + losses) > 0
    ORDER BY elo DESC
  `).all();
  res.json(players);
});

// ─── Stats ────────────────────────────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  const totalPlayers = db.prepare('SELECT COUNT(*) as c FROM players').get().c;
  const totalMatches = db.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'completed'").get().c;
  const activeMatches = db.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'in_progress'").get().c;
  const queueLength = db.prepare('SELECT COUNT(*) as c FROM queue').get().c;
  res.json({ totalPlayers, totalMatches, activeMatches, queueLength });
});

// ─── Socket.io ───────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  // Send current state on connect
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
