'use strict';

const { app, BrowserWindow, utilityProcess } = require('electron');
const path = require('path');
const http = require('http');

const PORT = 3000;
let serverProcess = null;
let mainWindow = null;

function getServerScript() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'server.js');
  }
  return path.join(__dirname, '..', '.next', 'standalone', 'server.js');
}

function startServer() {
  const script = getServerScript();
  serverProcess = utilityProcess.fork(script, [], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
    },
  });
}

function waitForReady(maxAttempts = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    function check() {
      const req = http.get(`http://127.0.0.1:${PORT}`, () => {
        resolve();
      });
      req.on('error', () => {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error(`StackMap server did not respond after ${maxAttempts} seconds`));
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
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  startServer();

  try {
    await waitForReady();
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  } catch (err) {
    mainWindow.loadURL(
      `data:text/html,<h1 style="font-family:sans-serif;padding:2rem">StackMap failed to start</h1><p style="font-family:sans-serif;padding:0 2rem">${err.message}</p>`
    );
    mainWindow.show();
  }
}

app.whenReady().then(createWindow);

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
