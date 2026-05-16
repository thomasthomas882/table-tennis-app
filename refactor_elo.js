const fs = require('fs');

const files = [
  'client/src/pages/QueuePage.tsx',
  'client/src/pages/PlayersPage.tsx',
  'client/src/pages/PlayerProfilePage.tsx',
  'client/src/pages/MatchHistoryPage.tsx',
  'client/src/pages/MatchesPage.tsx',
  'client/src/pages/LeaderboardPage.tsx',
  'client/src/pages/Dashboard.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/!hideElo/g, 'showElo');
  content = content.replace(/hideElo \?/g, '!showElo ?');
  content = content.replace(/hideElo:/g, 'showElo:');
  content = content.replace(/hideElo,/g, 'showElo,');
  content = content.replace(/hideElo }/g, 'showElo }');
  content = content.replace(/hideElo=/g, 'showElo=');
  fs.writeFileSync(f, content);
});

console.log('Done with standard pages');
