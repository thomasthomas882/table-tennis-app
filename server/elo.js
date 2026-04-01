// TTR-style rating formula (German Table Tennis Rating system)
// Key differences from standard chess Elo:
//   - Divisor 150 instead of 400: rating differences have more impact
//   - Variable K-factor: new players calibrate faster; strong players change slower

function getK(elo, matchesPlayed) {
  if (matchesPlayed < 15) return 40; // provisional — fast calibration for new players
  if (elo < 1500) return 32;
  if (elo < 1800) return 26;
  return 20;
}

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 150));
}

function calculateNewRatings(winnerElo, loserElo, winnerMatches = 30, loserMatches = 30) {
  const kWinner = getK(winnerElo, winnerMatches);
  const kLoser  = getK(loserElo,  loserMatches);

  const expectedWinner = expectedScore(winnerElo, loserElo);
  const expectedLoser  = expectedScore(loserElo,  winnerElo);

  // Floor at 100 so ratings never go negative
  const newWinnerElo = Math.max(100, Math.round(winnerElo + kWinner * (1 - expectedWinner)));
  const newLoserElo  = Math.max(100, Math.round(loserElo  + kLoser  * (0 - expectedLoser)));

  return {
    newWinnerElo,
    newLoserElo,
    winnerDelta: newWinnerElo - winnerElo,
    loserDelta:  newLoserElo  - loserElo,
  };
}

module.exports = { calculateNewRatings };
