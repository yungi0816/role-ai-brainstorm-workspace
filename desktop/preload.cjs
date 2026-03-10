const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopConfig', {
  apiBaseUrl: process.env.DESKTOP_API_BASE_URL || 'http://localhost:4000/api',
  runtime: 'electron'
});
