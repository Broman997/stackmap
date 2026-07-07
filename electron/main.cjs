'use strict';

const { app, BrowserWindow, utilityProcess, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

const HOST = '127.0.0.1';
const PORT = 47622;
let serverProcess = null;
let mainWindow = null;

function getServerScript() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'server.js');
  }
  return path.join(__dirname, '..', '.next', 'standalone', 'server.js');
}

function startServer(port) {
  const script = getServerScript();
  serverProcess = utilityProcess.fork(script, [], {
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: HOST,
    },
  });
}

function waitForReady(port, maxAttempts = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    let settled = false;

    const fail = (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };

    const ready = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    if (serverProcess) {
      serverProcess.once('exit', (code) => {
        fail(new Error(`StackMap server exited before startup completed${code === null ? '' : ` with code ${code}`}`));
      });
    }

    function check() {
      if (settled) return;

      const req = http.get(`http://${HOST}:${port}`, (res) => {
        res.resume();
        ready();
      });
      req.on('error', () => {
        attempts++;
        if (attempts >= maxAttempts) {
          fail(new Error(`StackMap server did not respond after ${maxAttempts} seconds`));
        } else {
          setTimeout(check, 1000);
        }
      });
      req.end();
    }
    setTimeout(check, 1500);
  });
}

async function createWindow() {
  const preloadPath = app.isPackaged
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'StackMap',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  try {
    startServer(PORT);
    await waitForReady(PORT);
    await mainWindow.webContents.session.clearCache();
    mainWindow.loadURL(`http://${HOST}:${PORT}`);
  } catch (err) {
    mainWindow.loadURL(
      `data:text/html,<h1 style="font-family:sans-serif;padding:2rem">StackMap failed to start</h1><p style="font-family:sans-serif;padding:0 2rem">${err.message}</p>`
    );
    mainWindow.show();
  }
}

ipcMain.handle('launch-command', (_event, command) => {
  if (!command || typeof command !== 'string') return;
  exec(command, { windowsHide: false });
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
