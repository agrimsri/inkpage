const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;

function startBackendServer() {
  const isDev = !app.isPackaged;
  const serverBinary = isDev
    ? path.join(__dirname, '../../../target/debug/inkpage-server')
    : path.join(process.resourcesPath, 'inkpage-server');

  const dataDir = path.join(app.getPath('userData'), 'notebooks');

  try {
    serverProcess = spawn(serverBinary, ['--port', '3888', '--data-dir', dataDir], {
      stdio: 'ignore',
      detached: false,
    });
    serverProcess.on('error', (err) => {
      console.log('Backend server spawn error (will use in-memory fallback):', err.message);
    });
  } catch (err) {
    console.log('Could not start server process:', err.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'Inkpage',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableWebSQL: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
});
