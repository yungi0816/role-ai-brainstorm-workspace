const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopConfig', {
  apiBaseUrl: process.env.DESKTOP_API_BASE_URL || 'http://localhost:4000/api',
  runtime: 'electron'
});

contextBridge.exposeInMainWorld('desktopWindow', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close')
});
