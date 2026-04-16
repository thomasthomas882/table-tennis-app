const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { calculateNewRatings } = require('./elo');
const { checkAndAward, awardStatBasedAchievements, ACHIEVEMENTS } = require('./achievementChecker');

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
  const where = status ? 'WHERE m.status = ?' : '';
  const params = status ? [status] : [];
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
  `).all(...params);
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
    "SELECT elo, elo_delta, match_id, created_at, rating_type FROM elo_history WHERE player_id = ? AND rating_type = 'singles' ORDER BY created_at ASC"
  ).all(pid);

  const eloHistoryDoubles = db.prepare(
    "SELECT elo, elo_delta, match_id, created_at, rating_type FROM elo_history WHERE player_id = ? AND rating_type = 'doubles' ORDER BY created_at ASC"
  ).all(pid);

  res.json({ player, recentMatches, headToHead, eloHistory, eloHistoryDoubles });
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

  const isDoubles = !!(match.player3_id || match.player4_id);

  const winnerPlayers = winnerIds.map(id => db.prepare('SELECT * FROM players WHERE id = ?').get(id));
  const loserPlayers  = loserIds.map(id  => db.prepare('SELECT * FROM players WHERE id = ?').get(id));

  const eloField = isDoubles ? 'elo_doubles' : 'elo';
  const matchField = isDoubles ? 'doubles_wins + doubles_losses' : 'wins + losses';
  const avgWinnerElo     = Math.round(winnerPlayers.reduce((s, p) => s + p[eloField], 0) / winnerPlayers.length);
  const avgLoserElo      = Math.round(loserPlayers.reduce((s, p)  => s + p[eloField], 0)  / loserPlayers.length);
  const avgWinnerMatches = Math.round(winnerPlayers.reduce((s, p) => s + p.wins + p.losses, 0) / winnerPlayers.length);
  const avgLoserMatches  = Math.round(loserPlayers.reduce((s, p)  => s + p.wins + p.losses, 0)  / loserPlayers.length);
  const { winnerDelta, loserDelta } = calculateNewRatings(avgWinnerElo, avgLoserElo, avgWinnerMatches, avgLoserMatches);

  const allPlayerIds = [match.player1_id, match.player2_id, match.player3_id, match.player4_id].filter(Boolean);
  const ratingType = isDoubles ? 'doubles' : 'singles';

  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE matches SET status = 'completed', winner_id = ?, completed_at = datetime('now') WHERE id = ?`)
      .run(winner_id, match.id);

    if (isDoubles) {
      // Doubles: update elo_doubles, doubles_wins/losses only (no streak tracking)
      winnerIds.forEach(id => {
        const p = db.prepare('SELECT elo_doubles FROM players WHERE id = ?').get(id);
        const newElo = Math.max(100, p.elo_doubles + winnerDelta);
        const actualDelta = newElo - p.elo_doubles;
        db.prepare('UPDATE players SET doubles_wins = doubles_wins + 1, elo_doubles = ? WHERE id = ?')
          .run(newElo, id);
        db.prepare('INSERT INTO elo_history (player_id, elo, elo_delta, match_id, rating_type) VALUES (?, ?, ?, ?, ?)')
          .run(id, newElo, actualDelta, match.id, 'doubles');
      });
      loserIds.forEach(id => {
        const p = db.prepare('SELECT elo_doubles FROM players WHERE id = ?').get(id);
        const newElo = Math.max(100, p.elo_doubles + loserDelta);
        const actualDelta = newElo - p.elo_doubles;
        db.prepare('UPDATE players SET doubles_losses = doubles_losses + 1, elo_doubles = ? WHERE id = ?')
          .run(newElo, id);
        db.prepare('INSERT INTO elo_history (player_id, elo, elo_delta, match_id, rating_type) VALUES (?, ?, ?, ?, ?)')
          .run(id, newElo, actualDelta, match.id, 'doubles');
      });
    } else {
      // Singles: update elo, wins/losses, and streaks
      winnerIds.forEach(id => {
        const p = db.prepare('SELECT elo, current_streak, best_streak FROM players WHERE id = ?').get(id);
        const newElo = p.elo + winnerDelta;
        const newStreak = (p.current_streak >= 0 ? p.current_streak : 0) + 1;
        const newBest = Math.max(p.best_streak, newStreak);
        db.prepare('UPDATE players SET wins = wins + 1, elo = ?, current_streak = ?, best_streak = ?, current_losing_streak = 0 WHERE id = ?')
          .run(newElo, newStreak, newBest, id);
        db.prepare('INSERT INTO elo_history (player_id, elo, elo_delta, match_id, rating_type) VALUES (?, ?, ?, ?, ?)')
          .run(id, newElo, winnerDelta, match.id, 'singles');
      });
      loserIds.forEach(id => {
        const p = db.prepare('SELECT elo, current_streak, best_streak, current_losing_streak FROM players WHERE id = ?').get(id);
        const newElo = p.elo + loserDelta;
        const newLoseStreak = (p.current_losing_streak ?? 0) + 1;
        db.prepare('UPDATE players SET losses = losses + 1, elo = ?, current_streak = 0, current_losing_streak = ? WHERE id = ?')
          .run(newElo, newLoseStreak, id);
        db.prepare('INSERT INTO elo_history (player_id, elo, elo_delta, match_id, rating_type) VALUES (?, ?, ?, ?, ?)')
          .run(id, newElo, loserDelta, match.id, 'singles');
      });
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

  const winnerName = winnerPlayers.map(p => p.name).join(' & ');
  const loserName  = loserPlayers.map(p => p.name).join(' & ');
  notify(`${winnerName} beat ${loserName}! ELO: ${winnerDelta > 0 ? '+' : ''}${winnerDelta}`, 'success');

  // Check and award achievements
  try {
    const newlyEarned = checkAndAward(db, {
      match, isDoubles, winnerIds, loserIds,
      winnerPlayersBeforeMatch: winnerPlayers,
      loserPlayersBeforeMatch: loserPlayers,
      winnerDelta, loserDelta,
    });
    for (const { playerId, achievementId } of newlyEarned) {
      const playerName = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId)?.name ?? 'Someone';
      const ach = ACHIEVEMENTS.find(a => a.id === achievementId);
      if (ach) notify(`${playerName} earned "${ach.name}" ${ach.icon}`, 'success');
    }
  } catch (e) {
    console.error('Achievement check error:', e.message);
  }

  res.json(completedMatch);
});

// Delete completed match from history + replay all ELO
app.delete('/api/matches/:id/history', (req, res) => {
  const match = db.prepare("SELECT * FROM matches WHERE id = ? AND status = 'completed'").get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Completed match not found' });

  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM elo_history');
    db.prepare('DELETE FROM matches WHERE id = ?').run(match.id);
    db.exec('UPDATE players SET elo=1000, elo_doubles=1000, wins=0, losses=0, doubles_wins=0, doubles_losses=0, current_streak=0, best_streak=0, current_losing_streak=0');

    const remaining = db.prepare("SELECT * FROM matches WHERE status='completed' ORDER BY completed_at ASC").all();

    for (const m of remaining) {
      const isDoubles = !!(m.player3_id || m.player4_id);
      const eloField = isDoubles ? 'elo_doubles' : 'elo';
      const winnerIds = m.winner_id === m.player1_id
        ? [m.player1_id, m.player3_id].filter(Boolean)
        : [m.player2_id, m.player4_id].filter(Boolean);
      const loserIds = m.winner_id === m.player1_id
        ? [m.player2_id, m.player4_id].filter(Boolean)
        : [m.player1_id, m.player3_id].filter(Boolean);

      const fetchPlayer = (id) => db.prepare('SELECT * FROM players WHERE id=?').get(id);

      const avgWElo = Math.round(winnerIds.reduce((s, id) => s + fetchPlayer(id)[eloField], 0) / winnerIds.length);
      const avgLElo = Math.round(loserIds.reduce((s, id) => s + fetchPlayer(id)[eloField], 0) / loserIds.length);
      const avgWMatches = Math.round(winnerIds.reduce((s, id) => { const p = fetchPlayer(id); return s + p.wins + p.losses; }, 0) / winnerIds.length);
      const avgLMatches = Math.round(loserIds.reduce((s, id) => { const p = fetchPlayer(id); return s + p.wins + p.losses; }, 0) / loserIds.length);

      const { winnerDelta, loserDelta } = calculateNewRatings(avgWElo, avgLElo, avgWMatches, avgLMatches);

      if (isDoubles) {
        winnerIds.forEach(id => {
          const newElo = Math.max(100, fetchPlayer(id)[eloField] + winnerDelta);
          db.prepare('UPDATE players SET elo_doubles=?, doubles_wins=doubles_wins+1 WHERE id=?').run(newElo, id);
          db.prepare('INSERT INTO elo_history (player_id, elo, elo_delta, match_id, rating_type) VALUES (?,?,?,?,?)').run(id, newElo, winnerDelta, m.id, 'doubles');
        });
        loserIds.forEach(id => {
          const newElo = Math.max(100, fetchPlayer(id)[eloField] + loserDelta);
          db.prepare('UPDATE players SET elo_doubles=?, doubles_losses=doubles_losses+1 WHERE id=?').run(newElo, id);
          db.prepare('INSERT INTO elo_history (player_id, elo, elo_delta, match_id, rating_type) VALUES (?,?,?,?,?)').run(id, newElo, loserDelta, m.id, 'doubles');
        });
      } else {
        winnerIds.forEach(id => {
          const p = fetchPlayer(id);
          const newElo = Math.max(100, p[eloField] + winnerDelta);
          const newStreak = p.current_streak + 1;
          db.prepare('UPDATE players SET elo=?, wins=wins+1, current_streak=?, best_streak=MAX(best_streak,?), current_losing_streak=0 WHERE id=?').run(newElo, newStreak, newStreak, id);
          db.prepare('INSERT INTO elo_history (player_id, elo, elo_delta, match_id, rating_type) VALUES (?,?,?,?,?)').run(id, newElo, winnerDelta, m.id, 'singles');
        });
        loserIds.forEach(id => {
          const p = fetchPlayer(id);
          const newElo = Math.max(100, p[eloField] + loserDelta);
          const newLoseStreak = (p.current_losing_streak ?? 0) + 1;
          db.prepare('UPDATE players SET elo=?, losses=losses+1, current_streak=0, current_losing_streak=? WHERE id=?').run(newElo, newLoseStreak, id);
          db.prepare('INSERT INTO elo_history (player_id, elo, elo_delta, match_id, rating_type) VALUES (?,?,?,?,?)').run(id, newElo, loserDelta, m.id, 'singles');
        });
      }
    }

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to delete match: ' + e.message });
  }

  const players = db.prepare('SELECT * FROM players ORDER BY elo DESC').all();
  broadcast('players:updated', players);
  broadcast('leaderboard:updated', players);
  notify('Match deleted — ratings recalculated', 'warning');
  res.json({ ok: true });
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

  // Re-queue all players from the voided match
  const allPlayerIds = [match.player1_id, match.player2_id, match.player3_id, match.player4_id].filter(Boolean);
  const maxPos = db.prepare('SELECT MAX(position) as mp FROM queue').get().mp ?? -1;
  allPlayerIds.forEach((pid, i) => {
    try {
      db.prepare('INSERT INTO queue (player_id, position) VALUES (?, ?)').run(pid, maxPos + 1 + i);
    } catch (_) { /* already in queue */ }
  });

  broadcast('tables:updated', getTables());
  broadcast('queue:updated', getQueue());
  broadcast('match:completed', null);
  notify('Match voided — players returned to queue', 'warning');
  res.json({ ok: true });
});

// ─── Leaderboard ─────────────────────────────────────────────────────────────

app.get('/api/leaderboard', (req, res) => {
  const type = req.query.type === 'doubles' ? 'doubles' : 'singles';
  if (type === 'doubles') {
    res.json(db.prepare(`
      SELECT *, elo_doubles as elo,
        (doubles_wins + doubles_losses) as total_games,
        CASE WHEN (doubles_wins + doubles_losses) > 0 THEN ROUND(doubles_wins * 100.0 / (doubles_wins + doubles_losses), 1) ELSE 0 END as win_rate
      FROM players
      WHERE (doubles_wins + doubles_losses) > 0
      ORDER BY elo_doubles DESC
    `).all());
  } else {
    res.json(db.prepare(`
      SELECT *, (wins + losses) as total_games,
      CASE WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1) ELSE 0 END as win_rate
      FROM players
      WHERE (wins + losses) > 0
      ORDER BY elo DESC
    `).all());
  }
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

// ─── Achievements ────────────────────────────────────────────────────────────

app.get('/api/players/:id/achievements', (req, res) => {
  const pid = Number(req.params.id);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(pid);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // Retroactively award any stat-based achievements the player already qualifies for
  awardStatBasedAchievements(db, player);

  // Earned (permanent)
  const earned = db.prepare(
    "SELECT achievement_id, earned_at FROM achievements WHERE player_id = ? ORDER BY earned_at ASC"
  ).all(pid);
  const earnedMap = {};
  for (const e of earned) earnedMap[e.achievement_id] = e.earned_at;

  // Compute ephemeral: ghost / hermit
  const lastMatchRow = db.prepare(`
    SELECT completed_at FROM matches
    WHERE status = 'completed' AND (player1_id = ? OR player2_id = ? OR player3_id = ? OR player4_id = ?)
    ORDER BY completed_at DESC LIMIT 1
  `).get(pid, pid, pid, pid);

  const ephemeralEarned = {};
  if (lastMatchRow?.completed_at) {
    const lastDate = new Date(lastMatchRow.completed_at.includes('T')
      ? lastMatchRow.completed_at + 'Z'
      : lastMatchRow.completed_at.replace(' ', 'T') + 'Z');
    const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 30) ephemeralEarned['hermit'] = true;
    else if (daysSince >= 7) ephemeralEarned['ghost'] = true;
  } else if (player.created_at) {
    // Never played at all
    const created = new Date(player.created_at.includes('T')
      ? player.created_at + 'Z'
      : player.created_at.replace(' ', 'T') + 'Z');
    const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 30) ephemeralEarned['hermit'] = true;
    else if (daysSince >= 7) ephemeralEarned['ghost'] = true;
  }

  const all = ACHIEVEMENTS.map(a => ({
    ...a,
    earnedAt: a.ephemeral
      ? (ephemeralEarned[a.id] ? 'active' : null)
      : (earnedMap[a.id] ?? null),
  }));

  res.json(all);
});

// ─── Per-player ELO reset ────────────────────────────────────────────────────

app.post('/api/players/:id/reset-elo', (req, res) => {
  const pid = Number(req.params.id);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(pid);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  db.prepare(`UPDATE players SET elo = 1000, elo_doubles = 1000,
    wins = 0, losses = 0, doubles_wins = 0, doubles_losses = 0,
    current_streak = 0, best_streak = 0, current_losing_streak = 0 WHERE id = ?`).run(pid);
  db.prepare('DELETE FROM elo_history WHERE player_id = ?').run(pid);

  const players = db.prepare('SELECT * FROM players ORDER BY elo DESC').all();
  broadcast('players:updated', players);
  broadcast('leaderboard:updated', players);
  notify(`${player.name}'s ELO has been reset to 1000`, 'warning');
  res.json({ ok: true });
});

// ─── Reset ELO only ──────────────────────────────────────────────────────────

app.post('/api/reset-elo', (req, res) => {
  db.exec('UPDATE players SET elo = 1000, elo_doubles = 1000, wins = 0, losses = 0, doubles_wins = 0, doubles_losses = 0, current_streak = 0, best_streak = 0, current_losing_streak = 0');
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
  });
});

// ─── Fallback ────────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
