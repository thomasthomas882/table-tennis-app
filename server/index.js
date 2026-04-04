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

// Match history with pagination
app.get('/api/matches/history', (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const total = db.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'completed'").get().c;
  const pages = Math.ceil(total / limit);

  const matches = db.prepare(`
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
    WHERE m.status = 'completed'
    ORDER BY m.completed_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({ matches, total, page, pages });
});

// Player stats
app.get('/api/players/:id/stats', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const pid = player.id;

  const recentMatches = db.prepare(`
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
    WHERE m.status = 'completed'
      AND (m.player1_id = ? OR m.player2_id = ? OR m.player3_id = ? OR m.player4_id = ?)
    ORDER BY m.completed_at DESC
    LIMIT 10
  `).all(pid, pid, pid, pid);

  // Head-to-head: for each completed match involving this player, determine the opponent(s) and outcome
  const allMatches = db.prepare(`
    SELECT m.id, m.player1_id, m.player2_id, m.player3_id, m.player4_id, m.winner_id,
      p1.name as player1_name, p2.name as player2_name,
      p3.name as player3_name, p4.name as player4_name
    FROM matches m
    JOIN players p1 ON m.player1_id = p1.id
    JOIN players p2 ON m.player2_id = p2.id
    LEFT JOIN players p3 ON m.player3_id = p3.id
    LEFT JOIN players p4 ON m.player4_id = p4.id
    WHERE m.status = 'completed'
      AND (m.player1_id = ? OR m.player2_id = ? OR m.player3_id = ? OR m.player4_id = ?)
  `).all(pid, pid, pid, pid);

  const h2hMap = {};
  for (const m of allMatches) {
    // determine which team the player is on
    const onTeam1 = m.player1_id === pid || m.player3_id === pid;
    const team1Won = m.winner_id === m.player1_id;
    const playerWon = (onTeam1 && team1Won) || (!onTeam1 && !team1Won);

    // opponents are the other team
    const opponentIds = onTeam1
      ? [m.player2_id, m.player4_id].filter(Boolean)
      : [m.player1_id, m.player3_id].filter(Boolean);
    const opponentNames = onTeam1
      ? [m.player2_name, m.player4_name].filter(Boolean)
      : [m.player1_name, m.player3_name].filter(Boolean);

    for (let i = 0; i < opponentIds.length; i++) {
      const oid = opponentIds[i];
      const oname = opponentNames[i];
      if (!h2hMap[oid]) h2hMap[oid] = { opponent_id: oid, opponent_name: oname, wins: 0, losses: 0 };
      if (playerWon) h2hMap[oid].wins++;
      else h2hMap[oid].losses++;
    }
  }
  const headToHead = Object.values(h2hMap).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));

  const eloHistory = db.prepare(
    'SELECT elo, elo_delta, match_id, created_at FROM elo_history WHERE player_id = ? ORDER BY created_at ASC'
  ).all(pid);

  res.json({ player, recentMatches, headToHead, eloHistory });
});

// Player ELO history
app.get('/api/players/:id/elo-history', (req, res) => {
  const player = db.prepare('SELECT id FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const history = db.prepare(
    'SELECT elo, elo_delta, match_id, created_at FROM elo_history WHERE player_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  res.json(history);
});

// ─── Series ───────────────────────────────────────────────────────────────────

function getSeries(status) {
  const where = status ? `WHERE s.status = '${status}'` : '';
  return db.prepare(`
    SELECT s.*,
      p1.name as player1_name,
      p2.name as player2_name,
      w.name as winner_name
    FROM series s
    JOIN players p1 ON s.player1_id = p1.id
    JOIN players p2 ON s.player2_id = p2.id
    LEFT JOIN players w ON s.winner_id = w.id
    ${where}
    ORDER BY s.created_at DESC
  `).all();
}

app.get('/api/series', (req, res) => {
  res.json(getSeries(req.query.status));
});

app.get('/api/series/:id', (req, res) => {
  const rows = db.prepare(`
    SELECT s.*,
      p1.name as player1_name,
      p2.name as player2_name,
      w.name as winner_name
    FROM series s
    JOIN players p1 ON s.player1_id = p1.id
    JOIN players p2 ON s.player2_id = p2.id
    LEFT JOIN players w ON s.winner_id = w.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!rows) return res.status(404).json({ error: 'Series not found' });
  res.json(rows);
});

app.post('/api/series', (req, res) => {
  const { player1_id, player2_id, format } = req.body;
  if (!player1_id || !player2_id) return res.status(400).json({ error: 'player1_id and player2_id required' });
  if (player1_id === player2_id) return res.status(400).json({ error: 'Players must be distinct' });

  const fmt = parseInt(format) || 3;
  if (![3, 5, 7].includes(fmt)) return res.status(400).json({ error: 'Format must be 3, 5, or 7' });

  const p1 = db.prepare('SELECT * FROM players WHERE id = ?').get(player1_id);
  const p2 = db.prepare('SELECT * FROM players WHERE id = ?').get(player2_id);
  if (!p1 || !p2) return res.status(404).json({ error: 'Player not found' });

  const result = db.prepare(
    'INSERT INTO series (player1_id, player2_id, format) VALUES (?, ?, ?)'
  ).run(player1_id, player2_id, fmt);

  const series = db.prepare(`
    SELECT s.*, p1.name as player1_name, p2.name as player2_name, w.name as winner_name
    FROM series s
    JOIN players p1 ON s.player1_id = p1.id
    JOIN players p2 ON s.player2_id = p2.id
    LEFT JOIN players w ON s.winner_id = w.id
    WHERE s.id = ?
  `).get(result.lastInsertRowid);

  broadcast('series:updated', getSeries('active'));
  res.status(201).json(series);
});

app.delete('/api/series/:id', (req, res) => {
  const series = db.prepare("SELECT id FROM series WHERE id = ? AND status = 'active'").get(req.params.id);
  if (!series) return res.status(404).json({ error: 'Active series not found' });
  db.prepare('DELETE FROM series WHERE id = ?').run(req.params.id);
  broadcast('series:updated', getSeries('active'));
  res.json({ ok: true });
});

// Start a match
app.post('/api/matches/start', (req, res) => {
  const { player1_id, player2_id, player3_id, player4_id, table_id, series_id } = req.body;
  if (!player1_id || !player2_id) return res.status(400).json({ error: 'At least two players required' });

  const ids = [player1_id, player2_id, player3_id, player4_id].filter(Boolean);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) return res.status(400).json({ error: 'Players must be distinct' });

  const players = ids.map(id => db.prepare('SELECT * FROM players WHERE id = ?').get(id));
  if (players.some(p => !p)) return res.status(404).json({ error: 'Player not found' });

  db.exec('BEGIN');
  try {
    const result = db.prepare(
      'INSERT INTO matches (player1_id, player2_id, player3_id, player4_id, table_id, series_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(player1_id, player2_id, player3_id || null, player4_id || null, table_id || null, series_id || null);

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

    // Update ELO, wins/losses, streaks, and record ELO history for each player
    winnerIds.forEach(id => {
      const p = db.prepare('SELECT elo, current_streak, best_streak FROM players WHERE id = ?').get(id);
      const newElo = p.elo + winnerDelta;
      const newStreak = (p.current_streak >= 0 ? p.current_streak : 0) + 1;
      const newBest = Math.max(p.best_streak, newStreak);
      db.prepare('UPDATE players SET wins = wins + 1, elo = ?, current_streak = ?, best_streak = ? WHERE id = ?')
        .run(newElo, newStreak, newBest, id);
      db.prepare('INSERT INTO elo_history (player_id, elo, elo_delta, match_id) VALUES (?, ?, ?, ?)')
        .run(id, newElo, winnerDelta, match.id);
    });
    loserIds.forEach(id => {
      const p = db.prepare('SELECT elo, current_streak, best_streak FROM players WHERE id = ?').get(id);
      const newElo = p.elo + loserDelta;
      db.prepare('UPDATE players SET losses = losses + 1, elo = ?, current_streak = 0 WHERE id = ?')
        .run(newElo, id);
      db.prepare('INSERT INTO elo_history (player_id, elo, elo_delta, match_id) VALUES (?, ?, ?, ?)')
        .run(id, newElo, loserDelta, match.id);
    });

    // Update series if this match is part of one
    if (match.series_id) {
      const series = db.prepare('SELECT * FROM series WHERE id = ? AND status = ?').get(match.series_id, 'active');
      if (series) {
        const p1Won = winnerIds.includes(series.player1_id);
        const newWins1 = series.wins1 + (p1Won ? 1 : 0);
        const newWins2 = series.wins2 + (p1Won ? 0 : 1);
        const target = Math.ceil(series.format / 2);
        if (newWins1 >= target || newWins2 >= target) {
          const seriesWinnerId = newWins1 >= target ? series.player1_id : series.player2_id;
          db.prepare(`UPDATE series SET wins1=?, wins2=?, status='completed', winner_id=?, completed_at=datetime('now') WHERE id=?`)
            .run(newWins1, newWins2, seriesWinnerId, series.id);
        } else {
          db.prepare('UPDATE series SET wins1=?, wins2=? WHERE id=?').run(newWins1, newWins2, series.id);
        }
      }
    }

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
  broadcast('series:updated', getSeries('active'));

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
  db.exec('UPDATE players SET elo = 1000, current_streak = 0, best_streak = 0');
  db.exec('DELETE FROM elo_history');
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
    db.exec('DELETE FROM elo_history');
    db.exec('DELETE FROM series');
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
    series: getSeries('active'),
  });
});

// ─── Fallback ────────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
