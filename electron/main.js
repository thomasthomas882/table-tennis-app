const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const net = require('net');

const PORT = 3001;
let serverProcess = null;
let mainWindow = null;

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
  // Store the database in the user's AppData folder so it survives app updates
  // and doesn't require admin rights to write.
  const dbPath = path.join(app.getPath('userData'), 'tabletennis.db');

  serverProcess = fork(serverEntry, [], {
    execArgv: ['--experimental-sqlite'],
    env: { ...process.env, PORT: String(PORT), DB_PATH: dbPath },
    cwd: path.join(__dirname, '../server'),
  });

  serverProcess.on('error', (err) => console.error('[server]', err));
  serverProcess.on('exit', (code) => console.log('[server] exited with code', code));
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

  // Hide the native menu bar (the app has its own navbar)
  mainWindow.setMenuBarVisibility(false);

  try {
    await waitForServer(PORT);
    await mainWindow.loadURL(`http://localhost:${PORT}`);
  } catch (err) {
    // Show a friendly error page if the server never came up
    mainWindow.loadURL(`data:text/html,
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#e2e8f0}</style>
      <h2>Could not start PingTrack server. Please restart the app.</h2>
    `);
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
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
