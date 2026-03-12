const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..');
const runtimeRoot = app.isPackaged ? process.resourcesPath : repoRoot;
const backendRoot = process.env.DESKTOP_BACKEND_ROOT || path.join(runtimeRoot, 'backend');
const backendServerPath = path.join(backendRoot, 'src', 'server.js');
const frontendIndexPath = process.env.DESKTOP_RENDERER_INDEX
  || path.join(runtimeRoot, 'frontend', 'dist', 'index.html');

const BACKEND_PORT = Number(process.env.DESKTOP_BACKEND_PORT || 4000);
const API_BASE_URL = `http://localhost:${BACKEND_PORT}/api`;

let backendServer = null;
let backendOwnedByDesktop = false;

function requestHealth() {
  return new Promise((resolve) => {
    const request = http.get(`${API_BASE_URL}/health`, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });

    request.setTimeout(1200, () => {
      request.destroy();
      resolve(false);
    });

    request.on('error', () => resolve(false));
  });
}

async function waitForBackend() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30000) {
    if (await requestHealth()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return false;
}

async function ensureBackend() {
  if (await requestHealth()) {
    backendOwnedByDesktop = false;
    return;
  }

  const dbFile = process.env.DB_FILE || path.join(app.getPath('userData'), 'app.db');

  process.env.NODE_ENV = 'desktop';
  process.env.PORT = String(BACKEND_PORT);
  process.env.DB_FILE = dbFile;
  process.env.CORS_ORIGIN = '*';

  const backendModule = await import(pathToFileURL(backendServerPath).href);
  const backendApp = backendModule.createApp();

  backendServer = await new Promise((resolve, reject) => {
    const server = backendApp.listen(BACKEND_PORT, () => {
      console.log(`Desktop backend listening on ${API_BASE_URL}`);
      resolve(server);
    });

    server.on('error', reject);
  });
  backendOwnedByDesktop = true;

  if (!(await waitForBackend())) {
    throw new Error(`Backend did not become ready on ${API_BASE_URL}.`);
  }
}

function createWindow() {
  process.env.DESKTOP_API_BASE_URL = API_BASE_URL;
  Menu.setApplicationMenu(null);

  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: 'Role AI Brainstorm Workspace',
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#07111f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!fs.existsSync(frontendIndexPath)) {
    window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(
      '<h1>Renderer build missing</h1><p>Run npm --prefix frontend run build first.</p>'
    )}`);
    return window;
  }

  window.loadFile(frontendIndexPath);
  return window;
}

function stopBackend() {
  return new Promise((resolve) => {
    if (!backendOwnedByDesktop || !backendServer) {
      resolve();
      return;
    }

    backendServer.close(() => {
      backendServer = null;
      backendOwnedByDesktop = false;
      resolve();
    });
  });
}

ipcMain.handle('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

app.whenReady()
  .then(async () => {
    await ensureBackend();

    if (process.env.DESKTOP_SMOKE_TEST === '1') {
      console.log(`Desktop smoke ready: ${API_BASE_URL}`);
      await stopBackend();
      app.exit(0);
      return;
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error) => {
    console.error(error);
    dialog.showErrorBox('Desktop startup failed', error.message);
    app.quit();
  });

app.on('before-quit', () => {
  stopBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
