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
    if (totalWins === 1) award(id, 'first_win');

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
      if (loserScore === 0) award(id, 'bagel');
      if (scoreDiff === 2)  award(id, 'squeaky');
      if (scoreDiff >= 7)   award(id, 'obliterate');

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

      // Time-based
      if (utcHour >= 21)             award(id, 'night_owl');
      if (utcHour >= 0 && utcHour <= 7) award(id, 'dedicated');
    }

    if (isDoubles) {
      if ((p.doubles_wins ?? 0) === 1)  award(id, 'dynamic_duo');
      if ((p.doubles_wins ?? 0) >= 10)  award(id, 'doubles_devotee');
    }
  }

  // ══════════════════════════════════ LOSERS ═════════════════════════════════
  for (const id of loserIds) {
    const p = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    const totalLosses = p.losses + (p.doubles_losses ?? 0);

    // First ever loss
    if (totalLosses === 1) award(id, 'first_loss');

    if (!isDoubles) {
      // Losing streaks
      if (p.current_losing_streak >= 3) award(id, 'rough_patch');
      if (p.current_losing_streak >= 5) award(id, 'rock_bottom');

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

module.exports = { checkAndAward, ACHIEVEMENTS };
