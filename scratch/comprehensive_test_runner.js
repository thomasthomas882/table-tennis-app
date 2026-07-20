const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3060;
const BASE_URL = `http://localhost:${PORT}`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const dbPath = path.join(__dirname, 'comprehensive_test.db');
  console.log(`=== STARTING COMPREHENSIVE SYSTEM AND STRESS TESTS ===`);
  console.log(`Using database file: ${dbPath}`);

  // Clean up any old test databases
  const filesToDelete = [dbPath, `${dbPath}-shm`, `${dbPath}-wal`];
  filesToDelete.forEach(f => {
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  });

  // Spawn the server process
  const serverProc = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env,
      PORT: PORT,
      DB_PATH: dbPath
    }
  });

  serverProc.stdout.on('data', (data) => {
    // Keep server stdout hidden unless there's an issue, or format it cleanly
  });

  serverProc.stderr.on('data', (data) => {
    console.error(`[server-error] ${data}`.trim());
  });

  // Poll server until it is active
  console.log('Waiting for test server to start...');
  let retries = 30;
  let serverReady = false;
  while (retries > 0) {
    try {
      const res = await fetch(`${BASE_URL}/api/tables`);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch (_) {}
    await sleep(500);
    retries--;
  }

  if (!serverReady) {
    throw new Error('Test server failed to start within timeout');
  }
  console.log('Test server is responsive. Beginning test runs...\n');

  try {
    // Run integration_test.js as a child process
    console.log('----------------------------------------------------');
    console.log('RUNNING COMPREHENSIVE INTEGRATION TEST SUITE...');
    console.log('----------------------------------------------------');
    await runChildScript(path.join(__dirname, 'integration_test.js'));

    // Run load_test.js as a child process
    console.log('\n----------------------------------------------------');
    console.log('RUNNING CHAOS MONKEY STRESS / LOAD TEST SUITE...');
    console.log('----------------------------------------------------');
    await runChildScript(path.join(__dirname, 'load_test.js'));

    console.log('\n🎉 ALL COMPREHENSIVE AND STRESS TESTS COMPLETED SUCCESSFULLY! 🎉');

  } catch (err) {
    console.error(`\n❌ TESTS FAILED:`, err.message);
    process.exitCode = 1;
  } finally {
    console.log('\nStopping test server...');
    serverProc.kill();
    await sleep(1000);

    console.log('Cleaning up database files...');
    filesToDelete.forEach(f => {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch (_) {}
      }
    });
    console.log('Cleanup complete.');
  }
}

function runChildScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        PORT: PORT
      }
    });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}

main();
