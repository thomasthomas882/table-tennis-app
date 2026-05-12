const { ACHIEVEMENTS } = require('./achievements');

/**
 * Check and award achievements after a match completes.
 * Must be called AFTER the transaction commits so fresh DB data is available.
 *
 * context = {
 *   match,                    // match row (with scores) at time of completion
 *   isDoubles,
 *   winnerIds, loserIds,      // player ID arrays
 *   winnerPlayersBeforeMatch, // player rows fetched BEFORE the ELO update
 *   loserPlayersBeforeMatch,
 *   winnerDelta, loserDelta,
 * }
 *
 * Returns array of { playerId, achievementId } for newly earned achievements.
 */
function checkAndAward(db, {
  match, isDoubles,
  winnerIds, loserIds,
  winnerPlayersBeforeMatch, loserPlayersBeforeMatch,
  winnerDelta, loserDelta,
}) {
  const newlyEarned = [];

  function award(playerId, achievementId) {
    try {
      db.prepare('INSERT INTO achievements (player_id, achievement_id) VALUES (?, ?)').run(playerId, achievementId);
      newlyEarned.push({ playerId, achievementId });
    } catch (_) { /* UNIQUE constraint = already earned, ignore */ }
  }

  // ── Completion time (UTC hour) ───────────────────────────────────────────
  const row = db.prepare('SELECT completed_at FROM matches WHERE id = ?').get(match.id);
  const utcHour = row?.completed_at
    ? new Date(row.completed_at.includes('T') ? row.completed_at + 'Z' : row.completed_at.replace(' ', 'T') + 'Z').getUTCHours()
    : -1;

  // ── Score diff ────────────────────────────────────────────────────────────
  const winnerOnTeam1 = winnerIds.includes(match.player1_id);
  const winnerScore   = winnerOnTeam1 ? match.player1_score : match.player2_score;
  const loserScore    = winnerOnTeam1 ? match.player2_score : match.player1_score;
  const scoreDiff     = winnerScore - loserScore;

  // ── Kingslayer: was loser ranked #1 before the match? ────────────────────
  const loserEloBefore   = loserPlayersBeforeMatch[0]?.elo ?? 0;
  const maxOtherElo      = db.prepare('SELECT MAX(elo) as m FROM players WHERE id != ?').get(loserIds[0])?.m ?? 0;
  const loserWasNo1      = !isDoubles && loserEloBefore > maxOtherElo && loserEloBefore > 1000;

  // ══════════════════════════════════ WINNERS ════════════════════════════════
  for (const id of winnerIds) {
    const p = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    const totalWins   = p.wins + (p.doubles_wins ?? 0);
    const totalGames  = p.wins + p.losses + (p.doubles_wins ?? 0) + (p.doubles_losses ?? 0);

    // First ever win (singles or doubles)
    if (totalWins >= 1) award(id, 'first_win');

    // Volume milestones
    if (totalGames >= 10)  award(id, 'getting_started');
    if (totalGames >= 50)  award(id, 'veteran');
    if (totalGames >= 100) award(id, 'centurion');
    if (p.wins >= 25) award(id, 'quarter_century');
    if (p.wins >= 50) award(id, 'ace');

    if (!isDoubles) {
      // Win streaks
      if (p.current_streak >= 3)  award(id, 'hat_trick');
      if (p.current_streak >= 5)  award(id, 'on_fire');
      if (p.current_streak >= 10) award(id, 'unstoppable');

      // Score-based
      if (loserScore === 0 && winnerScore > 0) award(id, 'bagel');
      if (scoreDiff === 2)  award(id, 'squeaky');
      if (scoreDiff >= 7)   award(id, 'obliterate');
      if (winnerScore >= 12) award(id, 'deuce_master');

      // ELO milestones
      if (p.elo >= 1100) award(id, 'rising_star');
      if (p.elo >= 1200) award(id, 'sharp_paddle');
      if (p.elo >= 1500) award(id, 'elite');

      // Underdog: my pre-match ELO was 100+ below opponent's
      const myEloBefore = winnerPlayersBeforeMatch.find(wp => wp.id === id)?.elo ?? p.elo - winnerDelta;
      if (myEloBefore < loserEloBefore - 100) award(id, 'underdog');

      // Kingslayer
      if (loserWasNo1) award(id, 'kingslayer');

      // Comeback king: new personal ELO high after being 50+ below previous peak
      const prevBestRow = db.prepare(
        "SELECT MAX(elo) as m FROM elo_history WHERE player_id = ? AND rating_type = 'singles' AND match_id != ?"
      ).get(id, match.id);
      const prevBestElo = prevBestRow?.m ?? 1000;
      if (p.elo > prevBestElo && prevBestElo - myEloBefore >= 50) award(id, 'comeback_king');

      // Social: unique opponents beaten
      const { cnt } = db.prepare(`
        SELECT COUNT(DISTINCT CASE WHEN player1_id = ? THEN player2_id ELSE player1_id END) as cnt
        FROM matches
        WHERE status = 'completed' AND winner_id = ?
          AND player3_id IS NULL AND (player1_id = ? OR player2_id = ?)
      `).get(id, id, id, id);
      if (cnt >= 5)  award(id, 'social_butterfly');
      if (cnt >= 10) award(id, 'rivals');

      // Giant Slayer
      const giantSlayerRow = db.prepare(`
        SELECT COUNT(DISTINCT loser_id) as cnt
        FROM (
          SELECT 
            CASE WHEN m.player1_id = ? THEN m.player2_id ELSE m.player1_id END as loser_id,
            eh_win.elo - eh_win.elo_delta as winner_elo_before,
            eh_lose.elo - eh_lose.elo_delta as loser_elo_before
          FROM matches m
          JOIN elo_history eh_win ON eh_win.match_id = m.id AND eh_win.player_id = ?
          JOIN elo_history eh_lose ON eh_lose.match_id = m.id AND eh_lose.player_id = (CASE WHEN m.player1_id = ? THEN m.player2_id ELSE m.player1_id END)
          WHERE m.status = 'completed' AND m.winner_id = ? AND m.player3_id IS NULL
        )
        WHERE loser_elo_before > winner_elo_before
      `).get(id, id, id, id);
      if (giantSlayerRow?.cnt >= 3) award(id, 'giant_slayer');

      // Sweep
      if (match.series_id) {
        const series = db.prepare('SELECT * FROM series WHERE id = ?').get(match.series_id);
        if (series && series.status === 'completed' && series.winner_id === id) {
          const theirWins = series.player1_id === id ? series.wins2 : series.wins1;
          if (theirWins === 0) {
            award(id, 'sweep');
          }
        }
      }

      // Time-based
      if (utcHour >= 21)             award(id, 'night_owl');
      if (utcHour >= 0 && utcHour <= 7) award(id, 'dedicated');
    }

    if (isDoubles) {
      if ((p.doubles_wins ?? 0) >= 1)  award(id, 'dynamic_duo');
      if ((p.doubles_wins ?? 0) >= 10) award(id, 'doubles_devotee');
    }

    // Iron Man & Flawless Day
    const todayDate = match.completed_at ? match.completed_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const todayMatches = db.prepare(`
      SELECT id, winner_id, player1_id, player2_id, player3_id, player4_id
      FROM matches
      WHERE status = 'completed' 
        AND (player1_id = ? OR player2_id = ? OR player3_id = ? OR player4_id = ?)
        AND DATE(completed_at) = ?
    `).all(id, id, id, id, todayDate);
    
    if (todayMatches.length >= 10) award(id, 'iron_man');
    
    if (todayMatches.length >= 3) {
      const wonAll = todayMatches.every(m => {
        const isTeam1 = m.player1_id === id || m.player3_id === id;
        const winnerOnTeam1 = m.winner_id === m.player1_id || m.winner_id === m.player3_id;
        return isTeam1 ? winnerOnTeam1 : !winnerOnTeam1;
      });
      if (wonAll) award(id, 'flawless_day');
    }
  }

  // ══════════════════════════════════ LOSERS ═════════════════════════════════
  for (const id of loserIds) {
    const p = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    const totalLosses = p.losses + (p.doubles_losses ?? 0);
    const totalGames  = p.wins + p.losses + (p.doubles_wins ?? 0) + (p.doubles_losses ?? 0);

    // First ever loss
    if (totalLosses >= 1) award(id, 'first_loss');

    // Volume milestones (losers reach these too)
    if (totalGames >= 10)  award(id, 'getting_started');
    if (totalGames >= 50)  award(id, 'veteran');
    if (totalGames >= 100) award(id, 'centurion');

    if (!isDoubles) {
      // Losing streaks
      if (p.current_losing_streak >= 3) award(id, 'rough_patch');
      if (p.current_losing_streak >= 5) award(id, 'rock_bottom');

      if (loserScore * 2 < winnerScore) award(id, 'warming_up');

      // Freefall: current ELO is 100+ below historical best
      const bestRow = db.prepare(
        "SELECT MAX(elo) as m FROM elo_history WHERE player_id = ? AND rating_type = 'singles'"
      ).get(id);
      const bestElo = bestRow?.m ?? 1000;
      if (bestElo - p.elo >= 100) award(id, 'freefall');
    }
  }

  return newlyEarned;
}

/**
 * Retroactively award any stat-based achievements a player already qualifies for.
 * Safe to call repeatedly — INSERT OR IGNORE prevents duplicates.
 * Called when a player's achievement page is loaded so missing achievements are
 * caught without needing a new match.
 */
function awardStatBasedAchievements(db, player) {
  function award(achId) {
    try {
      db.prepare('INSERT INTO achievements (player_id, achievement_id) VALUES (?, ?)').run(player.id, achId);
    } catch (_) {}
  }

  const totalWins   = player.wins + (player.doubles_wins ?? 0);
  const totalLosses = player.losses + (player.doubles_losses ?? 0);
  const totalGames  = totalWins + totalLosses;

  if (totalWins   >= 1) award('first_win');
  if (totalLosses >= 1) award('first_loss');

  if (player.current_streak >= 3)  award('hat_trick');
  if (player.current_streak >= 5)  award('on_fire');
  if (player.current_streak >= 10) award('unstoppable');

  if ((player.current_losing_streak ?? 0) >= 3) award('rough_patch');
  if ((player.current_losing_streak ?? 0) >= 5) award('rock_bottom');

  if (player.elo >= 1100) award('rising_star');
  if (player.elo >= 1200) award('sharp_paddle');
  if (player.elo >= 1500) award('elite');

  if (totalGames >= 10)  award('getting_started');
  if (totalGames >= 50)  award('veteran');
  if (totalGames >= 100) award('centurion');
  if (player.wins >= 25) award('quarter_century');
  if (player.wins >= 50) award('ace');

  if ((player.doubles_wins ?? 0) >= 1)  award('dynamic_duo');
  if ((player.doubles_wins ?? 0) >= 10) award('doubles_devotee');

  // Social: unique opponents beaten in singles
  const row = db.prepare(`
    SELECT COUNT(DISTINCT CASE WHEN player1_id = ? THEN player2_id ELSE player1_id END) as cnt
    FROM matches
    WHERE status = 'completed' AND winner_id = ?
      AND player3_id IS NULL AND (player1_id = ? OR player2_id = ?)
  `).get(player.id, player.id, player.id, player.id);
  if (row?.cnt >= 5)  award('social_butterfly');
  if (row?.cnt >= 10) award('rivals');

  // Retroactive checks for new achievements
  const giantSlayerRow = db.prepare(`
    SELECT COUNT(DISTINCT loser_id) as cnt
    FROM (
      SELECT 
        CASE WHEN m.player1_id = ? THEN m.player2_id ELSE m.player1_id END as loser_id,
        eh_win.elo - eh_win.elo_delta as winner_elo_before,
        eh_lose.elo - eh_lose.elo_delta as loser_elo_before
      FROM matches m
      JOIN elo_history eh_win ON eh_win.match_id = m.id AND eh_win.player_id = ?
      JOIN elo_history eh_lose ON eh_lose.match_id = m.id AND eh_lose.player_id = (CASE WHEN m.player1_id = ? THEN m.player2_id ELSE m.player1_id END)
      WHERE m.status = 'completed' AND m.winner_id = ? AND m.player3_id IS NULL
    )
    WHERE loser_elo_before > winner_elo_before
  `).get(player.id, player.id, player.id, player.id);
  if (giantSlayerRow?.cnt >= 3) award('giant_slayer');

  const sweepRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM series
    WHERE status = 'completed' AND winner_id = ?
    AND ((player1_id = ? AND wins2 = 0) OR (player2_id = ? AND wins1 = 0))
  `).get(player.id, player.id, player.id);
  if (sweepRow?.cnt >= 1) award('sweep');

  const deuceRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM matches
    WHERE status = 'completed' AND winner_id = ? AND player3_id IS NULL
    AND ((player1_id = ? AND player1_score >= 12) OR (player2_id = ? AND player2_score >= 12))
  `).get(player.id, player.id, player.id);
  if (deuceRow?.cnt >= 1) award('deuce_master');

  const warmingRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM matches
    WHERE status = 'completed' AND winner_id != ? AND winner_id IS NOT NULL AND (player1_id = ? OR player2_id = ?) AND player3_id IS NULL
    AND ((player1_id = ? AND player1_score * 2 < player2_score) OR (player2_id = ? AND player2_score * 2 < player1_score))
  `).get(player.id, player.id, player.id, player.id, player.id);
  if (warmingRow?.cnt >= 1) award('warming_up');

  const allMatches = db.prepare(`
    SELECT id, winner_id, player1_id, player2_id, player3_id, player4_id, DATE(completed_at) as day
    FROM matches
    WHERE status = 'completed' AND (player1_id = ? OR player2_id = ? OR player3_id = ? OR player4_id = ?)
  `).all(player.id, player.id, player.id, player.id);
  
  const matchesByDay = {};
  for (const m of allMatches) {
    if (!matchesByDay[m.day]) matchesByDay[m.day] = [];
    matchesByDay[m.day].push(m);
  }
  
  for (const day in matchesByDay) {
    const dayMatches = matchesByDay[day];
    if (dayMatches.length >= 10) award('iron_man');
    if (dayMatches.length >= 3) {
      const wonAll = dayMatches.every(m => {
        const isTeam1 = m.player1_id === player.id || m.player3_id === player.id;
        const winnerOnTeam1 = m.winner_id === m.player1_id || m.winner_id === m.player3_id;
        return isTeam1 ? winnerOnTeam1 : !winnerOnTeam1;
      });
      if (wonAll) award('flawless_day');
    }
  }

  // Freefall: historical best is 100+ above current ELO
  const bestRow = db.prepare(
    "SELECT MAX(elo) as m FROM elo_history WHERE player_id = ? AND rating_type = 'singles'"
  ).get(player.id);
  const bestElo = bestRow?.m ?? player.elo;
  if (bestElo - player.elo >= 100) award('freefall');
}

module.exports = { checkAndAward, awardStatBasedAchievements, ACHIEVEMENTS };
