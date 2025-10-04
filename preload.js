const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleMinimize: () => ipcRenderer.invoke('toggle-minimize'),
  showNotification: ( objs ) => ipcRenderer.invoke('show-notification', objs ),
  playSystemSound: (soundName) => ipcRenderer.invoke('play-system-sound', soundName),
  getSystemTime: () => ipcRenderer.invoke('get-system-time'),
  speakText: (text) => ipcRenderer.invoke('speak-text', text),
  autoSaveNote: (content) => ipcRenderer.invoke('auto-save-note', content),
  loadAutoSaveNote: () => ipcRenderer.invoke('load-auto-save-note')
});
