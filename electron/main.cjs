'use strict';

const { app, BrowserWindow, utilityProcess, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');

const HOST = '127.0.0.1';
const PORT = 47622;
let serverProcess = null;
let mainWindow = null;
const externalWindows = new Set();

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.turbo',
  '.vercel',
  'android',
  'build',
  'coverage',
  'dist',
  'ios',
  'node_modules',
  'out',
]);

const SENSITIVE_FILE_PATTERNS = [
  /^\.env/i,
  /\.key$/i,
  /\.pem$/i,
  /secret/i,
  /token/i,
  /credential/i,
];

const TOOL_DETECTIONS = [
  { name: 'Next.js', category: 'code', terms: ['next'] },
  { name: 'React', category: 'code', terms: ['react'] },
  { name: 'TypeScript', category: 'code', terms: ['typescript'] },
  { name: 'Tailwind CSS', category: 'design', terms: ['tailwindcss', '@tailwindcss/postcss'] },
  { name: 'Electron', category: 'code', terms: ['electron', 'electron-builder'] },
  { name: 'Expo', category: 'code', terms: ['expo'] },
  { name: 'Supabase', category: 'database', terms: ['supabase', '@supabase/supabase-js'] },
  { name: 'Airtable', category: 'database', terms: ['airtable'] },
  { name: 'OpenAI', category: 'AI', terms: ['openai', '@openai'] },
  { name: 'Anthropic', category: 'AI', terms: ['anthropic', 'claude'] },
  { name: 'Vercel', category: 'hosting', terms: ['vercel', '@vercel/analytics'] },
  { name: 'GitHub', category: 'code', terms: ['github', '.github'] },
  { name: 'Stripe', category: 'payment', terms: ['stripe'] },
  { name: 'Google Play Console', category: 'app store', terms: ['google play', 'play console'] },
  { name: 'Apple Developer', category: 'app store', terms: ['app store', 'apple developer'] },
];

function getServerScript() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'server.js');
  }
  return path.join(__dirname, '..', '.next', 'standalone', 'server.js');
}

function normalizeName(value) {
  return value
    .replace(/^@[^/]+\//, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

function isSensitiveFile(fileName) {
  return SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

function readTextFile(filePath, maxLength = 20000) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > 500000) return '';
    return fs.readFileSync(filePath, 'utf8').slice(0, maxLength);
  } catch {
    return '';
  }
}

function readJsonFile(filePath) {
  const text = readTextFile(filePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function safeListDirectory(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function collectProjectFiles(rootPath) {
  const files = [];
  const visit = (dirPath, depth) => {
    if (depth > 2) return;

    for (const entry of safeListDirectory(dirPath)) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(path.join(dirPath, entry.name), depth + 1);
        continue;
      }

      if (!entry.isFile() || isSensitiveFile(entry.name)) continue;
      const lowerName = entry.name.toLowerCase();
      const relativePath = path.relative(rootPath, path.join(dirPath, entry.name));
      if (
        [
          'package.json',
          'pyproject.toml',
          'requirements.txt',
          'dockerfile',
          'readme.md',
          'app.json',
          'electron-builder.yml',
        ].includes(lowerName) ||
        lowerName.endsWith('.cmd') ||
        lowerName.endsWith('.ps1')
      ) {
        files.push({ name: entry.name, relativePath, fullPath: path.join(dirPath, entry.name) });
      }
    }
  };

  visit(rootPath, 0);
  return files;
}

function inferProjectType(scanText, packageJson) {
  const text = scanText.toLowerCase();
  if (text.includes('expo') || text.includes('react-native')) return 'mobile app';
  if (text.includes('next') || text.includes('vite') || text.includes('website')) return 'website';
  if (text.includes('fastapi') || text.includes('express') || text.includes('api')) return 'backend';
  if (packageJson?.main && String(packageJson.main).includes('electron')) return 'other';
  return 'other';
}

function launcherCommandFor(file) {
  const escapedPath = file.fullPath.replaceAll("'", "''");
  if (file.name.toLowerCase().endsWith('.ps1')) {
    return `C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${file.fullPath}"`;
  }
  if (file.name.toLowerCase().endsWith('.cmd')) {
    return `C:\\Windows\\System32\\cmd.exe /c "${file.fullPath}"`;
  }
  return escapedPath;
}

function chooseLauncher(files) {
  const launchers = files.filter(
    (file) => file.name.toLowerCase().endsWith('.ps1') || file.name.toLowerCase().endsWith('.cmd'),
  );
  return (
    launchers.find((file) => /start|launch|run|dashboard/i.test(file.name)) ??
    launchers.find((file) => !/stop|build|install|test/i.test(file.name)) ??
    null
  );
}

function addUniqueTool(tools, tool) {
  if (tools.some((item) => item.name.toLowerCase() === tool.name.toLowerCase())) return;
  tools.push(tool);
}

function detectTools(scanText, packageJson) {
  const tools = [];
  const lowerText = scanText.toLowerCase();

  for (const detection of TOOL_DETECTIONS) {
    if (detection.terms.some((term) => lowerText.includes(term.toLowerCase()))) {
      addUniqueTool(tools, detection);
    }
  }

  const dependencyGroups = [
    packageJson?.dependencies,
    packageJson?.devDependencies,
    packageJson?.peerDependencies,
    packageJson?.optionalDependencies,
  ];

  for (const dependencies of dependencyGroups) {
    if (!dependencies || typeof dependencies !== 'object') continue;
    for (const packageName of Object.keys(dependencies)) {
      if (packageName.startsWith('@types/')) continue;
      const known = TOOL_DETECTIONS.find((detection) =>
        detection.terms.some((term) => packageName.toLowerCase().includes(term.toLowerCase())),
      );
      if (known) {
        addUniqueTool(tools, known);
      } else if (['next', 'react', 'typescript', 'electron'].includes(packageName)) {
        addUniqueTool(tools, {
          name: normalizeName(packageName),
          category: packageName === 'typescript' ? 'code' : 'code',
        });
      }
    }
  }

  return tools;
}

function scanProjectFolder(folderPath) {
  const folderName = path.basename(folderPath);
  const files = collectProjectFiles(folderPath);
  const packageFile = files.find((file) => file.relativePath.toLowerCase() === 'package.json');
  const readmeFile = files.find((file) => file.name.toLowerCase() === 'readme.md');
  const packageJson = packageFile ? readJsonFile(packageFile.fullPath) : null;
  const readmeText = readmeFile ? readTextFile(readmeFile.fullPath, 8000) : '';
  const fileHints = files.map((file) => file.relativePath).join('\n');
  const packageText = packageJson ? JSON.stringify(packageJson) : '';
  const scanText = [folderName, fileHints, readmeText, packageText].filter(Boolean).join('\n');
  const launcher = chooseLauncher(files);
  const projectName =
    typeof packageJson?.displayName === 'string'
      ? packageJson.displayName
      : typeof packageJson?.productName === 'string'
        ? packageJson.productName
        : typeof packageJson?.name === 'string'
          ? normalizeName(packageJson.name)
          : normalizeName(folderName);
  const now = new Date().toISOString();
  const suggestions = [];
  const projectNotes = [
    typeof packageJson?.description === 'string' ? packageJson.description : '',
    `Detected from selected local folder: ${folderName}.`,
    files.length ? `Metadata files found: ${files.map((file) => file.relativePath).slice(0, 12).join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  suggestions.push({
    source: 'local_folder_scan',
    entityType: 'project',
    status: 'pending',
    confidence: packageJson ? 0.86 : 0.65,
    detectedFields: {
      name: projectName,
      type: inferProjectType(scanText, packageJson),
      status: 'active',
      notes: projectNotes,
      launchCommand: launcher ? launcherCommandFor(launcher) : '',
      sourceName: folderName,
      sourceUrl: '',
      primaryLanguage: '',
      lastDetectedAt: now,
    },
    notes: projectNotes,
  });

  const tools = detectTools(scanText, packageJson);
  for (const tool of tools) {
    suggestions.push({
      source: 'local_folder_scan',
      entityType: 'tool',
      status: 'pending',
      confidence: 0.72,
      detectedFields: {
        name: tool.name,
        category: tool.category,
        paidStatus: 'unknown',
        status: 'unknown',
        notes: `Detected while scanning ${projectName}.`,
        sourceName: folderName,
        sourceUrl: '',
        primaryLanguage: '',
        lastDetectedAt: now,
      },
      notes: `Detected while scanning ${projectName}.`,
    });

    suggestions.push({
      source: 'local_folder_scan',
      entityType: 'relationship',
      status: 'pending',
      confidence: 0.68,
      detectedFields: {
        fromType: 'project',
        fromName: projectName,
        fromSourceUrl: '',
        toType: 'tool',
        toName: tool.name,
        toSourceUrl: '',
        relationshipType:
          tool.category === 'database'
            ? 'stores_data_in'
            : tool.category === 'hosting'
              ? 'deploys_to'
              : tool.category === 'AI'
                ? 'assists_with'
                : 'uses',
        notes: `Detected from local project folder scan.`,
        lastDetectedAt: now,
      },
      notes: `Detected from local project folder scan.`,
    });
  }

  return {
    folderName,
    fileCount: files.length,
    suggestions,
  };
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

function isStackMapUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === HOST && parsed.port === String(PORT);
  } catch {
    return false;
  }
}

function createExternalWindow(url) {
  const externalWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    title: 'StackMap Link',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  externalWindows.add(externalWindow);
  externalWindow.once('ready-to-show', () => {
    externalWindow.maximize();
    externalWindow.show();
  });
  externalWindow.on('closed', () => externalWindows.delete(externalWindow));
  configureWindowOpenHandler(externalWindow);
  externalWindow.loadURL(url);
}

function configureWindowOpenHandler(window) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isStackMapUrl(url)) {
      if (mainWindow) {
        mainWindow.loadURL(url);
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
      return { action: 'deny' };
    }

    createExternalWindow(url);
    return { action: 'deny' };
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
  configureWindowOpenHandler(mainWindow);
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

ipcMain.handle('scan-project-folder', async () => {
  if (!mainWindow) return { cancelled: true, suggestions: [] };

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a project folder to scan',
    properties: ['openDirectory'],
  });

  if (result.canceled || !result.filePaths[0]) {
    return { cancelled: true, suggestions: [] };
  }

  return {
    cancelled: false,
    ...scanProjectFolder(result.filePaths[0]),
  };
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
