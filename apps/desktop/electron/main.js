const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;

function startBackendServer() {
  const isDev = !app.isPackaged;
  const serverBinary = isDev
    ? path.join(__dirname, '../../../target/debug/inkpage-server')
    : path.join(process.resourcesPath, 'inkpage-server');

  const dataDir = path.join(app.getPath('userData'), 'notebooks');

  try {
    if (fs.existsSync(serverBinary)) {
      serverProcess = spawn(serverBinary, ['--port', '3888', '--data-dir', dataDir], {
        stdio: 'ignore',
        detached: false,
      });
      serverProcess.on('error', (err) => {
        console.log('Backend server spawn error (will use in-memory fallback):', err.message);
      });
    } else {
      console.log('Backend server binary not found at', serverBinary, '(in-memory fallback active)');
    }
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

  const indexPath = path.join(__dirname, '../dist/index.html');
  const devUrl = 'http://127.0.0.1:3000';

  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devUrl).catch(() => {
      console.log('Dev server not reachable at ' + devUrl + ', loading dist/index.html...');
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      }
    });
  } else {
    // Default: Load production dist/index.html if available, fallback to dev server
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL(devUrl).catch((err) => {
        console.error('Failed to load dev server and dist/index.html not found:', err);
      });
    }
  }

  // Fallback if dev server is unreachable or fails to load
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Page load failed:', errorCode, errorDescription);
    if (fs.existsSync(indexPath)) {
      console.log('Falling back to local dist/index.html...');
      mainWindow.loadFile(indexPath);
    }
  });

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
