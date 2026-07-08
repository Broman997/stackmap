'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  launchCommand: (command) => ipcRenderer.invoke('launch-command', command),
  scanProjectFolder: () => ipcRenderer.invoke('scan-project-folder'),
});
