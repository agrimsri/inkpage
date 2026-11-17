const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;

function getBackendBinaryPath() {
  const isDev = !app.isPackaged;
  const exeName = process.platform === 'win32' ? 'inkpage-server.exe' : 'inkpage-server';

  if (isDev) {
    const candidatePaths = [
      path.join(__dirname, '../../../target/release', exeName),
      path.join(__dirname, '../../../target/debug', exeName),
      path.join(__dirname, '../resources/bin', exeName),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
    return candidatePaths[0]; // fallback path for error message
  }

  // Packaged app: check process.resourcesPath bin directory, root, and macOS bundle directory
  const candidatePaths = [
    path.join(process.resourcesPath, 'bin', exeName),
    path.join(process.resourcesPath, exeName),
    path.join(process.resourcesPath, '..', 'MacOS', exeName),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return candidatePaths[0];
}

function startBackendServer() {
  if (serverProcess) return;

  const isDev = !app.isPackaged;
  const serverBinary = getBackendBinaryPath();
  const dataDir = path.join(app.getPath('userData'), 'notebooks');

  try {
    if (fs.existsSync(serverBinary)) {
      if (!isDev && process.platform !== 'win32') {
        try {
          fs.chmodSync(serverBinary, 0o755);
        } catch (_) {}
      }
      serverProcess = spawn(
        serverBinary,
        ['--port', '3888', '--data-dir', dataDir, '--watch-stdin'],
        {
          stdio: ['pipe', 'ignore', 'ignore'],
          windowsHide: true,
          detached: false,
        }
      );
      serverProcess.on('error', (err) => {
        console.log('Backend server spawn error (will use in-memory fallback):', err.message);
        serverProcess = null;
      });
      serverProcess.on('exit', (code, signal) => {
        console.log(`Backend server process exited (code=${code}, signal=${signal})`);
        serverProcess = null;
      });
      console.log('Backend server started successfully from:', serverBinary);
    } else {
      console.log('Backend server binary not found at', serverBinary, '(in-memory fallback active)');
    }
  } catch (err) {
    console.log('Could not start server process:', err.message);
  }
}

function stopBackendServer() {
  if (serverProcess) {
    const proc = serverProcess;
    serverProcess = null;
    try {
      if (proc.stdin) {
        try {
          proc.stdin.end();
        } catch (_) {}
      }
      if (process.platform === 'win32') {
        proc.kill();
      } else {
        proc.kill('SIGTERM');
      }
    } catch (e) {
      console.log('Error stopping backend server:', e.message);
    }
  }
}

function createWindow() {
  const iconCandidates = [
    path.join(__dirname, '../resources/icon.png'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(process.resourcesPath, 'resources', 'icon.png'),
  ];
  let windowIcon = null;
  for (const ic of iconCandidates) {
    if (fs.existsSync(ic)) {
      windowIcon = ic;
      break;
    }
  }

  const windowOpts = {
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
  };
  if (windowIcon) {
    windowOpts.icon = windowIcon;
  }

  mainWindow = new BrowserWindow(windowOpts);

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

// Single instance lock: prevent multiple concurrent instances and port collisions
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  console.log('Another instance of Inkpage is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    startBackendServer();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackendServer();
});

app.on('will-quit', () => {
  stopBackendServer();
});

process.on('exit', () => {
  stopBackendServer();
});

process.on('SIGINT', () => {
  stopBackendServer();
  app.quit();
});

process.on('SIGTERM', () => {
  stopBackendServer();
  app.quit();
});
