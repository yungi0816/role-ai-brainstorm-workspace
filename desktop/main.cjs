const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const backendRoot = path.join(repoRoot, 'backend');
const backendServerPath = path.join(backendRoot, 'src', 'server.js');
const frontendIndexPath = path.join(repoRoot, 'frontend', 'dist', 'index.html');

const BACKEND_PORT = Number(process.env.DESKTOP_BACKEND_PORT || 4000);
const API_BASE_URL = `http://localhost:${BACKEND_PORT}/api`;

let backendProcess = null;
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
  const nodeCommand = process.env.DESKTOP_NODE_COMMAND || 'node';

  backendProcess = spawn(nodeCommand, [backendServerPath], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: 'desktop',
      PORT: String(BACKEND_PORT),
      DB_FILE: dbFile,
      CORS_ORIGIN: '*'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  backendOwnedByDesktop = true;

  backendProcess.stdout.on('data', (chunk) => {
    console.log(`[backend] ${chunk.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (chunk) => {
    console.error(`[backend] ${chunk.toString().trim()}`);
  });

  backendProcess.on('exit', (code) => {
    if (backendOwnedByDesktop && code !== 0 && code !== null) {
      console.error(`Backend exited with code ${code}`);
    }
  });

  if (!(await waitForBackend())) {
    throw new Error(`Backend did not become ready on ${API_BASE_URL}.`);
  }
}

function createWindow() {
  process.env.DESKTOP_API_BASE_URL = API_BASE_URL;

  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: 'Role AI Brainstorm Workspace',
    backgroundColor: '#f4f6f8',
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
  if (backendOwnedByDesktop && backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
}

app.whenReady()
  .then(async () => {
    await ensureBackend();

    if (process.env.DESKTOP_SMOKE_TEST === '1') {
      console.log(`Desktop smoke ready: ${API_BASE_URL}`);
      app.quit();
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

app.on('before-quit', stopBackend);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
