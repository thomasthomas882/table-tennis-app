const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function runTest() {
  console.log(`=== STARTING PINGTRACK CHAOS MONKEY LOAD TEST ===`);
  console.log(`Targeting: ${BASE_URL}`);
  console.log(`Simulating concurrent user spikes and high DB traffic...`);

  let successCount = 0;
  let failureCount = 0;
  let responseTimes = [];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Step 1: Create a pool of players first to prevent duplicate name errors
  console.log('\nInitializing mock player pool...');
  const playerIds = [];
  for (let i = 0; i < 20; i++) {
    try {
      const name = `ChaosPlayer_${i}_${Date.now()}`;
      const res = await fetch(`${BASE_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        playerIds.push(data.id);
      }
    } catch (err) {
      console.error('Player initialization failed:', err.message);
    }
  }
  console.log(`Pool initialized with ${playerIds.length} players.`);

  if (playerIds.length === 0) {
    console.error('Failed to initialize player pool. Aborting test.');
    process.exit(1);
  }

  // Step 2: High concurrency request storm
  const durationSec = 15;
  const requestsPerSec = 40;
  const totalIterations = durationSec * 2; // Tick every 500ms
  const burstSize = Math.floor(requestsPerSec / 2);

  console.log(`\nStorming server: ${requestsPerSec} requests/sec for ${durationSec} seconds (${durationSec * requestsPerSec} total planned requests)...`);

  const startTime = Date.now();

  // Array of endpoint calls to randomly choose from
  const tasks = [
    // GETs
    async () => {
      const res = await fetch(`${BASE_URL}/api/players`);
      return res.ok;
    },
    async () => {
      const res = await fetch(`${BASE_URL}/api/queue`);
      return res.ok;
    },
    async () => {
      const res = await fetch(`${BASE_URL}/api/tables`);
      return res.ok;
    },
    async () => {
      const res = await fetch(`${BASE_URL}/api/leaderboard`);
      return res.ok;
    },
    // POST Queue join
    async () => {
      const randomPlayer = playerIds[Math.floor(Math.random() * playerIds.length)];
      const res = await fetch(`${BASE_URL}/api/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: randomPlayer }),
      });
      // Accept either success (res.ok) or validation/conflict errors (400, 409 if already queued) as a robust API response
      return res.ok || res.status === 400 || res.status === 409;
    },
    // POST Create a new temporary player
    async () => {
      const name = `TempChaos_${Math.random().toString(36).slice(2, 9)}`;
      const res = await fetch(`${BASE_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return res.ok;
    }
  ];

  for (let t = 0; t < totalIterations; t++) {
    const promises = [];

    for (let r = 0; r < burstSize; r++) {
      const taskIndex = Math.floor(Math.random() * tasks.length);
      const chosenTask = tasks[taskIndex];

      const startReq = Date.now();
      const p = chosenTask()
        .then((ok) => {
          const latency = Date.now() - startReq;
          responseTimes.push(latency);
          if (ok) {
            successCount++;
          } else {
            failureCount++;
          }
        })
        .catch((err) => {
          failureCount++;
          console.error(`Request failed: ${err.message}`);
        });

      promises.push(p);
    }

    // Await the burst
    await Promise.all(promises);
    await sleep(500); // 500ms delay between bursts
  }

  const totalTime = (Date.now() - startTime) / 1000;
  const avgLatency = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const maxLatency = Math.max(...responseTimes);
  const throughput = (successCount + failureCount) / totalTime;

  console.log(`\n=== CHAOS MONKEY LOAD TEST COMPLETE ===`);
  console.log(`Duration:       ${totalTime.toFixed(2)} seconds`);
  console.log(`Successes:      ${successCount}`);
  console.log(`Failures:       ${failureCount}`);
  console.log(`Throughput:     ${throughput.toFixed(1)} req/sec`);
  console.log(`Avg Latency:    ${avgLatency.toFixed(1)} ms`);
  console.log(`Max Latency:    ${maxLatency} ms`);
  console.log(`Success Rate:   ${((successCount / (successCount + failureCount)) * 100).toFixed(1)}%`);

  if (failureCount === 0) {
    console.log(`\n🎉 SUCCESS! SQLite database held up under heavy concurrency with 0 errors!`);
  } else {
    console.warn(`\n⚠️ WARNING! Detected ${failureCount} failures during load test. Check server logs for SQLITE_BUSY or locking deadlocks.`);
  }
}

runTest();
