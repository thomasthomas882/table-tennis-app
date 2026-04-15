const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

const PORT = 3001;
let serverProcess = null;
let mainWindow = null;
let logFile = null;

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  console.log(line.trim());
  if (logFile) {
    try { fs.appendFileSync(logFile, line); } catch (_) {}
  }
}

// Poll until the Express server is accepting connections
function waitForServer(port, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    function attempt() {
      const sock = net.createConnection(port, '127.0.0.1');
      sock.once('connect', () => { sock.end(); resolve(); });
      sock.once('error', () => {
        if (Date.now() > deadline) return reject(new Error('Server did not start in time'));
        setTimeout(attempt, 300);
      });
    }
    attempt();
  });
}

function startServer() {
  const serverEntry = path.join(__dirname, '../server/index.js');
  const dbPath = path.join(app.getPath('userData'), 'tabletennis.db');

  log('Starting server...');
  log('serverEntry:', serverEntry);
  log('dbPath:', dbPath);
  log('process.execPath:', process.execPath);

  serverProcess = fork(serverEntry, [], {
    execArgv: [],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(PORT),
      DB_PATH: dbPath,
    },
    cwd: path.join(__dirname, '../server'),
    silent: true,
  });

  serverProcess.stdout.on('data', d => log('[server]', d.toString().trim()));
  serverProcess.stderr.on('data', d => log('[server stderr]', d.toString().trim()));
  serverProcess.on('error', err => log('[server error]', err.message));
  serverProcess.on('exit', (code, signal) => log('[server exit] code:', code, 'signal:', signal));

  log('Server process spawned, PID:', serverProcess.pid);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'PingTrack',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  log('Waiting for server on port', PORT);
  try {
    await waitForServer(PORT);
    log('Server is up - loading URL');
    await mainWindow.loadURL(`http://localhost:${PORT}`);
    log('URL loaded successfully');
  } catch (err) {
    log('FATAL:', err.message);
    const safeLog = logFile ? logFile.replace(/\\/g, '/') : 'unknown';
    mainWindow.loadURL(`data:text/html,
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center;
               justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; gap: 12px; }
        code { background: #1e293b; padding: 4px 10px; border-radius: 4px; font-size: 13px; }
      </style>
      <h2>Could not start PingTrack server.</h2>
      <p>Check the log file for details:</p>
      <code>${safeLog}</code>
      <p>Then restart the app.</p>
    `);
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  logFile = path.join(userDataPath, 'pingtrack-debug.log');
  try {
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(logFile, '');
  } catch (_) {}
  log('=== PingTrack starting ===');
  log('userData:', userDataPath);

  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});
