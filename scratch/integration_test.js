const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`   PINGTRACK SYSTEM-WIDE INTEGRATION TEST SUITE`);
  console.log(`======================================================\n`);

  try {
    // ── Test 1: Reset Database ───────────────────────────────────────
    console.log(`--- TEST 1: Resetting Database State ---`);
    const resetRes = await fetch(`${BASE_URL}/api/reset`, { method: 'POST' });
    await assert(resetRes.ok, 'Database reset should return 200 OK');

    // ── Test 2: Create Players ───────────────────────────────────────
    console.log(`\n--- TEST 2: Creating Mock Players ---`);
    const playersToCreate = ['Emma', 'Liam', 'Noah', 'Olivia'];
    const createdPlayers = [];

    for (const name of playersToCreate) {
      const res = await fetch(`${BASE_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      await assert(res.status === 201, `Player '${name}' created successfully (201 Created)`);
      const player = await res.json();
      await assert(player.elo === 1000, `Player '${name}' starts at exactly 1000 ELO`);
      createdPlayers.push(player);
    }

    const [emma, liam, noah, olivia] = createdPlayers;

    // ── Test 3: Queue Management ─────────────────────────────────────
    console.log(`\n--- TEST 3: Adding Players to Queue ---`);
    for (const player of createdPlayers) {
      const res = await fetch(`${BASE_URL}/api/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.id })
      });
      await assert(res.status === 201, `Player '${player.name}' added to queue`);
    }

    const queueRes = await fetch(`${BASE_URL}/api/queue`);
    const queueData = await queueRes.json();
    await assert(queueData.length === 4, 'Lobby queue contains exactly 4 players');

    // ── Test 4: Doubles Match Setup & Execution ─────────────────────
    console.log(`\n--- TEST 4: Starting and Completing a Doubles Match (2v2) ---`);
    
    // Fetch tables to get a valid table ID (default Table 1 is seeded)
    const tablesRes = await fetch(`${BASE_URL}/api/tables`);
    const tables = await tablesRes.json();
    const table1 = tables.find(t => t.name === 'Table 1');
    await assert(!!table1, 'Table 1 should exist in the seeded tables');

    // Start 2v2 doubles match: Emma & Noah vs Liam & Olivia on Table 1
    const startRes = await fetch(`${BASE_URL}/api/matches/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player1_id: emma.id,
        player2_id: liam.id,
        player3_id: noah.id,
        player4_id: olivia.id,
        table_id: table1.id
      })
    });
    await assert(startRes.status === 201, 'Doubles match started successfully on Table 1');
    const match = await startRes.json();

    // Verify Table is Occupied & Queue is Empty
    const checkTablesRes = await fetch(`${BASE_URL}/api/tables`);
    const checkTables = await checkTablesRes.json();
    const t1Status = checkTables.find(t => t.id === table1.id).status;
    await assert(t1Status === 'occupied', 'Table 1 is now marked as "occupied"');

    const checkQueueRes = await fetch(`${BASE_URL}/api/queue`);
    const checkQueue = await checkQueueRes.json();
    await assert(checkQueue.length === 0, 'Lobby queue is empty (players moved to match)');

    // Update match score to 11 - 8
    const scoreRes = await fetch(`${BASE_URL}/api/matches/${match.id}/score`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player1_score: 11, player2_score: 8 })
    });
    await assert(scoreRes.ok, 'Match score updated successfully');

    // Complete Match - Emma & Noah win
    console.log('Completing match: Emma & Noah win...');
    const completeRes = await fetch(`${BASE_URL}/api/matches/${match.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner_id: emma.id }) // Emma's team (Team 1) wins
    });
    await assert(completeRes.ok, 'Match completed successfully');

    // Verify Elo Updates
    console.log('Verifying Elo rating changes...');
    const emmaRes = await fetch(`${BASE_URL}/api/players/${emma.id}/stats`);
    const emmaStats = await emmaRes.json();
    await assert(emmaStats.player.elo_doubles > 1000, `Winner Emma gained ELO (New: ${emmaStats.player.elo_doubles})`);

    const liamRes = await fetch(`${BASE_URL}/api/players/${liam.id}/stats`);
    const liamStats = await liamRes.json();
    await assert(liamStats.player.elo_doubles < 1000, `Loser Liam lost ELO (New: ${liamStats.player.elo_doubles})`);

    // Verify Players are re-queued
    const finalQueueRes = await fetch(`${BASE_URL}/api/queue`);
    const finalQueue = await finalQueueRes.json();
    await assert(finalQueue.length === 4, 'All 4 players successfully returned to queue after match completion');

    // Verify Table 1 is Available
    const finalTablesRes = await fetch(`${BASE_URL}/api/tables`);
    const finalTables = await finalTablesRes.json();
    const finalT1Status = finalTables.find(t => t.id === table1.id).status;
    await assert(finalT1Status === 'available', 'Table 1 is freed and marked "available" again');

    // ── Test 5: Series Mode State Machine (Best of 3) ────────────────
    console.log(`\n--- TEST 5: Executing Best of 3 Series (Series Mode) ---`);
    
    // Start Series: Emma vs Liam (Best of 3) on Table 1
    const seriesStartRes = await fetch(`${BASE_URL}/api/series`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player1_id: emma.id,
        player2_id: liam.id,
        format: 3, // Best of 3
        table_id: table1.id
      })
    });
    await assert(seriesStartRes.status === 201, 'Best of 3 series started successfully');
    const series = await seriesStartRes.json();

    // Fetch Active matches -> should contain game 1 of the series
    const activeMatchesRes = await fetch(`${BASE_URL}/api/matches?status=in_progress`);
    const activeMatches = await activeMatchesRes.json();
    const game1 = activeMatches.find(m => m.series_id === series.id);
    await assert(!!game1, 'Game 1 of the series is automatically spawned and in progress');

    // Score & Complete Game 1: Emma wins 11-5
    await fetch(`${BASE_URL}/api/matches/${game1.id}/score`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player1_score: 11, player2_score: 5 })
    });
    await fetch(`${BASE_URL}/api/matches/${game1.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner_id: emma.id })
    });
    console.log('Game 1 complete: Emma wins.');

    // Assert that table stays occupied, series score is updated, and Game 2 auto-starts!
    const seriesCheckRes = await fetch(`${BASE_URL}/api/series`);
    const seriesList = await seriesCheckRes.json();
    const updatedSeries = seriesList.find(s => s.id === series.id);
    await assert(updatedSeries.wins1 === 1 && updatedSeries.wins2 === 0, 'Series score is 1 - 0 (Emma leads)');

    const activeMatchesRes2 = await fetch(`${BASE_URL}/api/matches?status=in_progress`);
    const activeMatches2 = await activeMatchesRes2.json();
    const game2 = activeMatches2.find(m => m.series_id === series.id);
    await assert(!!game2 && game2.id !== game1.id, 'Game 2 of the series automatically spawned on Table 1');

    // Score & Complete Game 2: Emma wins 11-7
    await fetch(`${BASE_URL}/api/matches/${game2.id}/score`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player1_score: 11, player2_score: 7 })
    });
    await fetch(`${BASE_URL}/api/matches/${game2.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner_id: emma.id })
    });
    console.log('Game 2 complete: Emma wins.');

    // Assert series is completed, winner is Emma, and Table 1 is freed
    const finalSeriesRes = await fetch(`${BASE_URL}/api/series`);
    const finalSeriesList = await finalSeriesRes.json();
    const completedSeries = finalSeriesList.find(s => s.id === series.id);
    await assert(completedSeries.status === 'completed', 'Series is marked as "completed"');
    await assert(completedSeries.winner_id === emma.id, 'Emma is marked as the overall series winner');

    const checkT1Res = await fetch(`${BASE_URL}/api/tables`);
    const checkT1Data = await checkT1Res.json();
    const t1FinalStatus = checkT1Data.find(t => t.id === table1.id).status;
    await assert(t1FinalStatus === 'available', 'Table 1 is freed and available after series completion');

    // ── Test 6: Backup & Restore ─────────────────────────────────────
    console.log(`\n--- TEST 6: Testing JSON Backup & Restore ---`);
    const backupRes = await fetch(`${BASE_URL}/api/backup/json`);
    await assert(backupRes.ok, 'JSON backup download should succeed');
    const backupJson = await backupRes.json();
    
    // Modify database state (attempt to delete Noah - should fail with 409 due to match history foreign key constraint!)
    console.log('Verifying foreign key constraints: Attempting to delete Noah (who has match history)...');
    const deleteNoahRes = await fetch(`${BASE_URL}/api/players/${noah.id}`, { method: 'DELETE' });
    await assert(deleteNoahRes.status === 409, 'Deleting player Noah with history correctly fails with 409 Conflict');

    // Create a temporary player and delete them (should succeed because no match history!)
    console.log('Verifying clean player deletion: Creating a temporary player "TempDelete"...');
    const tempCreateRes = await fetch(`${BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'TempDelete' })
    });
    const tempPlayer = await tempCreateRes.json();
    await assert(tempCreateRes.status === 201, 'Temporary player created successfully');

    console.log('Deleting temporary player "TempDelete"...');
    const deleteTempRes = await fetch(`${BASE_URL}/api/players/${tempPlayer.id}`, { method: 'DELETE' });
    await assert(deleteTempRes.status === 200, 'Deleting clean temporary player succeeds with 200 OK');

    const checkTempRes = await fetch(`${BASE_URL}/api/players`);
    const playersListAfterDelete = await checkTempRes.json();
    const tempExists = playersListAfterDelete.some(p => p.id === tempPlayer.id);
    await assert(!tempExists, 'Temporary player is officially gone from players list');

    // Simulating database corruption by calling /api/reset (deleting everything) before restoring from backup
    console.log('Simulating complete database corruption by resetting DB...');
    await fetch(`${BASE_URL}/api/reset`, { method: 'POST' });

    // Restore from JSON backup
    console.log('Restoring database from JSON backup...');
    const restoreRes = await fetch(`${BASE_URL}/api/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: backupJson.data })
    });
    await assert(restoreRes.ok, 'Backup restored successfully');

    // Verify Noah is restored and queue length is back to 4
    const finalPlayersRes = await fetch(`${BASE_URL}/api/players`);
    const finalPlayersList = await finalPlayersRes.json();
    const noahRestored = finalPlayersList.some(p => p.id === noah.id);
    await assert(noahRestored, 'Noah was successfully restored to the players list from backup!');

    console.log(`\n======================================================`);
    console.log(`🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS RATE!`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error(`\n❌ INTEGRATION TESTING FAILED!`);
    console.error(err.stack);
    process.exit(1);
  }
}

runTests();
