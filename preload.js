const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleMinimize: () => ipcRenderer.invoke('toggle-minimize'),
  showNotification: ( objs ) => ipcRenderer.invoke('show-notification', objs ),
  playSystemSound: (soundName) => ipcRenderer.invoke('play-system-sound', soundName),
  getSystemTime: () => ipcRenderer.invoke('get-system-time'),
  speakText: (text) => ipcRenderer.invoke('speak-text', text),
  autoSaveNote: (content) => ipcRenderer.invoke('auto-save-note', content),
  loadAutoSaveNote: () => ipcRenderer.invoke('load-auto-save-note'),
  saveColor: (color) => ipcRenderer.invoke('save-color', color),
  loadColor: () => ipcRenderer.invoke('load-color'),
  onColorChange: (callback) => ipcRenderer.on('change-color', callback),
  removeColorChangeListener: () => ipcRenderer.removeAllListeners('change-color'),
  syncCalendarEvent: (data) => ipcRenderer.invoke('sync-calendar-event', data)
});

