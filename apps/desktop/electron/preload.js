const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('inkpageDesktop', {
  platform: process.platform,
  version: '0.1.0',
});
