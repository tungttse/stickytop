const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleMinimize: () => ipcRenderer.invoke('toggle-minimize'),
  showNotification: ( objs ) => ipcRenderer.invoke('show-notification', objs ),
  playSystemSound: (soundName) => ipcRenderer.invoke('play-system-sound', soundName),
  getSystemTime: () => ipcRenderer.invoke('get-system-time'),
  speakText: (text) => ipcRenderer.invoke('speak-text', text),
  autoSaveNote: (content) => ipcRenderer.invoke('auto-save-note', content),
  loadAutoSaveNote: () => ipcRenderer.invoke('load-auto-save-note'),
  getTransparency: () => ipcRenderer.invoke('get-transparency'),
  setTransparency: (opacity) => ipcRenderer.invoke('set-transparency', opacity),
  setAlwaysOnTop: (alwaysOnTop) => ipcRenderer.invoke('set-always-on-top', alwaysOnTop),
  syncCalendarEvent: (data) => ipcRenderer.invoke('sync-calendar-event', data),
  saveAutoMinimizeSetting: (autoMinimize) => ipcRenderer.invoke('save-auto-minimize-setting', autoMinimize),
  loadAutoMinimizeSetting: () => ipcRenderer.invoke('load-auto-minimize-setting'),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  onAutoMinimizeActivated: (callback) => ipcRenderer.on('auto-minimize-activated', callback),
  onAutoMinimizeDeactivated: (callback) => ipcRenderer.on('auto-minimize-deactivated', callback),
  removeAutoMinimizeListeners: () => {
    ipcRenderer.removeAllListeners('auto-minimize-activated');
    ipcRenderer.removeAllListeners('auto-minimize-deactivated');
  },
  getAppConfig: () => ipcRenderer.invoke('get-app-config'),
  saveTheme: (theme) => ipcRenderer.invoke('save-theme', theme),
  loadTheme: () => ipcRenderer.invoke('load-theme'),
  googleLogin: () => ipcRenderer.invoke('google-login'),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  googleLogout: () => ipcRenderer.invoke('google-logout')
});

