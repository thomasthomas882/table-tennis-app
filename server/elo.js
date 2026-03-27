const K = 32;

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculateNewRatings(winnerElo, loserElo) {
  const expectedWinner = expectedScore(winnerElo, loserElo);
  const expectedLoser = expectedScore(loserElo, winnerElo);

  const newWinnerElo = Math.round(winnerElo + K * (1 - expectedWinner));
  const newLoserElo = Math.round(loserElo + K * (0 - expectedLoser));

  return {
    newWinnerElo,
    newLoserElo,
    winnerDelta: newWinnerElo - winnerElo,
    loserDelta: newLoserElo - loserElo,
  };
}

module.exports = { calculateNewRatings };
