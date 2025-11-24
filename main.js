// Load environment variables
require('dotenv').config();

const { app, BrowserWindow, Menu, ipcMain, dialog, Notification, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { google } = require('googleapis');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

// Load drag feature config
const ENABLE_DRAG = process.env.ENABLE_DRAG === 'true';

// OAuth port range
const PORT_START = parseInt(process.env.PORT_START || '3000', 10);
const PORT_END = parseInt(process.env.PORT_END || '3003', 10);

console.log('CLIENT_ID', CLIENT_ID);
console.log('CLIENT_SECRET', CLIENT_SECRET);
console.log('REDIRECT_URL', REDIRECT_URL);
console.log('REFRESH_TOKEN', REFRESH_TOKEN);

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

let mainWindow;
let autoMinimizeEnabled = false;
let preMinimizeBounds = null;

// Window state management
const WINDOW_STATE_FILE = 'window-state.json';

function getWindowStatePath() {
  return path.join(app.getPath('userData'), WINDOW_STATE_FILE);
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  try {
    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();
    const isMinimized = mainWindow.isMinimized();
    
    const windowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: isMaximized,
      isMinimized: isMinimized,
      timestamp: Date.now()
    };
    
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(windowState, null, 2));
  } catch (error) {
    console.error('Error saving window state:', error);
  }
}

function loadWindowState() {
  try {
    const statePath = getWindowStatePath();
    if (fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, 'utf8');
      console.log('data', data);
      const windowState = JSON.parse(data);
      console.log('windowState', windowState);
      // Check if state is not too old (e.g., within 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      if (windowState.timestamp && windowState.timestamp > thirtyDaysAgo) {
        return windowState;
      }
    }
  } catch (error) {
    console.error('Error loading window state:', error);
  }
  
  return null;
}

function loadSavedColor() {
  try {
    const userDataPath = app.getPath('userData');
    const colorPath = path.join(userDataPath, 'sticky-color.json');
    
    if (fs.existsSync(colorPath)) {
      const data = fs.readFileSync(colorPath, 'utf8');
      const colorData = JSON.parse(data);
      return colorData.color;
    }
  } catch (error) {
    console.error('Error loading saved color:', error);
  }
  
  return null;
}

function loadAutoMinimizeSetting() {
  autoMinimizeEnabled = false;
  return;
  try {
    const userDataPath = app.getPath('userData');
    const settingPath = path.join(userDataPath, 'auto-minimize-setting.json');
    
    if (fs.existsSync(settingPath)) {
      const data = fs.readFileSync(settingPath, 'utf8');
      const settingData = JSON.parse(data);
      autoMinimizeEnabled = settingData.autoMinimize || false; // Default to false
    } else {
      // If no setting file exists, default to false
      autoMinimizeEnabled = false;
    }
  } catch (error) {
    console.error('Error loading auto-minimize setting:', error);
    // Default to false on error
    autoMinimizeEnabled = false;
  }
}

function loadTransparencyState() {
  try {
    const userDataPath = app.getPath('userData');
    const transparencyPath = path.join(userDataPath, 'transparency-state.json');
    
    if (fs.existsSync(transparencyPath)) {
      const data = fs.readFileSync(transparencyPath, 'utf8');
      const transparencyData = JSON.parse(data);
      return transparencyData.enabled || false; // Default to false
    }
  } catch (error) {
    console.error('Error loading transparency state:', error);
  }
  
  return false; // Default to false
}

function saveTransparencyState(enabled) {
  try {
    const userDataPath = app.getPath('userData');
    const transparencyPath = path.join(userDataPath, 'transparency-state.json');
    const transparencyData = { enabled };
    fs.writeFileSync(transparencyPath, JSON.stringify(transparencyData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving transparency state:', error);
    return false;
  }
}

function createWindow() {
  // Load saved window state
  const savedState = loadWindowState();
  
  // Default window options
  const defaultOptions = {
    width: 800,
    height: process.env.ENV ==='dev' ? 800 : 600,
    minWidth: 300,
    minHeight: 20,
    vibrancy: 'light',  
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, "preload.js")
    },
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#ffff99',
    show: true,
    opacity: 1.0 // Default to fully opaque, will be adjusted based on transparency setting
  };

  // Apply saved state if available
  if (savedState) {
    defaultOptions.x = savedState.x;
    defaultOptions.y = savedState.y;
    defaultOptions.width = savedState.width;
    defaultOptions.height = savedState.height;
  }

  // Load saved color for window background
  const savedColor = loadSavedColor();
  if (savedColor) {
    defaultOptions.backgroundColor = savedColor;
  }

  // Load auto-minimize setting
  loadAutoMinimizeSetting();

  // Load transparency state and apply
  const isTransparent = loadTransparencyState();
  if (isTransparent) {
    defaultOptions.opacity = 0.9;
  } else {
    defaultOptions.opacity = 1.0; // Fully opaque if transparency is disabled
  }

  // Create the browser window
  mainWindow = new BrowserWindow(defaultOptions);

  // Load the index.html file - handle both dev and production
  const isDev = process.env.ENV === 'dev' || process.argv.includes('--dev');
  
  if (isDev) {
    // Development mode - load from dist folder
    mainWindow.loadFile('dist/index.html');
  } else {
    // Production mode - load from app.asar
    const indexPath = path.join(__dirname, 'dist','index.html');
    mainWindow.loadFile(indexPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Restore maximized state if it was maximized
    // if (savedState && savedState.isMaximized) {
    //   mainWindow.maximize();
    // }
    
    // Open developer tools automatically for debugging
    // process.env.ENV ==='dev' && mainWindow.webContents.openDevTools();
    if (process.env.ENV === 'dev') {
      mainWindow.webContents.openDevTools();
    }
  });

  // Save window state on resize/move
  mainWindow.on('resize', debounce(saveWindowState, 500));
  mainWindow.on('move', debounce(saveWindowState, 500));
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);
  mainWindow.on('minimize', saveWindowState);
  mainWindow.on('restore', saveWindowState);

  // Auto-minimize functionality
  mainWindow.on('blur', () => {
    if (autoMinimizeEnabled && mainWindow && !mainWindow.isDestroyed()) {
      // Save current bounds before minimizing
      preMinimizeBounds = mainWindow.getBounds();
      
      // Get screen size to calculate top-right position
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
      // Calculate minimized height (enough for first todo + padding)
      const minimizedHeight = 60; // Minimum height for first todo
      const currentWidth = preMinimizeBounds.width;
      
      // Move to top-right corner with margin
      const margin = 20;
      const x = screenWidth - currentWidth - margin;
      const y = margin;
      
      // Resize and move window
      mainWindow.setBounds({
        x: x,
        y: y,
        width: currentWidth,
        height: minimizedHeight
      });
      
      // Send message to renderer to show only first todo
      mainWindow.webContents.send('auto-minimize-activated');
    }
  });

  mainWindow.on('focus', () => {
    if (autoMinimizeEnabled && preMinimizeBounds && mainWindow && !mainWindow.isDestroyed()) {
      // Restore to original bounds
      mainWindow.setBounds(preMinimizeBounds);
      preMinimizeBounds = null;
      
      // Send message to renderer to show all content
      mainWindow.webContents.send('auto-minimize-deactivated');
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    saveWindowState(); // Save state before closing
    mainWindow = null;
  });

  // Create application menu
  // Menu disabled - completely hide application menu
  // Menu.setApplicationMenu(null);
  createMenu(isDev);
}

function createMenu(isDev = false) {
  // Get current state
  const isAlwaysOnTop = mainWindow ? mainWindow.isAlwaysOnTop() : true; // Default to true
  const savedColor = loadSavedColor();
  const currentColor = savedColor || '#ffff99'; // Default to Yellow
  const isTransparent = loadTransparencyState();
  
  const template = [
    {
      label: 'File',
      submenu: [
        // {
        //   label: 'New Note',
        //   accelerator: 'CmdOrCtrl+N',
        //   click: () => {
        //     mainWindow.webContents.send('new-note');
        //   }
        // },
        // {
        //   label: 'Save Note',
        //   accelerator: 'CmdOrCtrl+S',
        //   click: () => {
        //     mainWindow.webContents.send('save-note');
        //   }
        // },
        // {
        //   label: 'Load Note',
        //   accelerator: 'CmdOrCtrl+O',
        //   click: () => {
        //     mainWindow.webContents.send('load-note');
        //   }
        // },
        // { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' },
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Always On Top',
          accelerator: 'CmdOrCtrl+T',
          type: 'checkbox',
          checked: isAlwaysOnTop,
          click: () => {
            const newState = !mainWindow.isAlwaysOnTop();
            mainWindow.setAlwaysOnTop(newState);
            // Update menu to reflect new state
            createMenu(isDev);
          }
        },
        {
          label: 'Transparent',
          type: 'checkbox',
          checked: isTransparent,
          click: () => {
            const newState = !isTransparent;
            saveTransparencyState(newState);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setOpacity(newState ? 0.9 : 1.0);
            }
            // Update menu to reflect new state
            createMenu(isDev);
          }
        },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  // Only add Debug menu in development mode
  if (isDev) {
    template.push({
      label: 'Debug',
      submenu: [
        {
          label: 'Open Developer Tools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.openDevTools();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            if (mainWindow.webContents.isDevToolsOpened()) {
              mainWindow.webContents.closeDevTools();
            } else {
              mainWindow.webContents.openDevTools();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Reload App',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Hard Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

ipcMain.handle('auto-save-note', async (event, content) => {
  try {
    const userDataPath = app.getPath('userData');
    const autoSavePath = path.join(userDataPath, 'autosave.json');
    
    const autoSaveData = {
      content: content,
      timestamp: Date.now()
    };
    
    await fs.promises.writeFile(autoSavePath, JSON.stringify(autoSaveData, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error auto-saving note:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-auto-save-note', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const autoSavePath = path.join(userDataPath, 'autosave.json');
    
    const data = await fs.promises.readFile(autoSavePath, 'utf8');
    const autoSaveData = JSON.parse(data);
    
    return { success: true, content: autoSaveData.content };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, error: 'No auto-saved note found' };
    }
    console.error('Error loading auto-saved note:', error);
    return { success: false, error: error.message };
  }
});

// Theme management
ipcMain.handle('save-theme', async (event, theme) => {
  try {
    const userDataPath = app.getPath('userData');
    const themePath = path.join(userDataPath, 'sticky-theme.json');
    
    const themeData = {
      theme: theme,
      timestamp: Date.now()
    };
    
    await fs.promises.writeFile(themePath, JSON.stringify(themeData, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error saving theme:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-theme', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const themePath = path.join(userDataPath, 'sticky-theme.json');
    
    const data = await fs.promises.readFile(themePath, 'utf8');
    const themeData = JSON.parse(data);
    
    return { success: true, theme: themeData.theme };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, error: 'No saved theme found' };
    }
    console.error('Error loading theme:', error);
    return { success: false, error: error.message };
  }
});

// Auto-minimize setting management
ipcMain.handle('save-auto-minimize-setting', async (event, autoMinimize) => {
  try {
    const userDataPath = app.getPath('userData');
    const settingPath = path.join(userDataPath, 'auto-minimize-setting.json');
    
    const settingData = {
      autoMinimize: autoMinimize,
      timestamp: Date.now()
    };
    
    await fs.promises.writeFile(settingPath, JSON.stringify(settingData, null, 2));
    autoMinimizeEnabled = autoMinimize;
    return { success: true };
  } catch (error) {
    console.error('Error saving auto-minimize setting:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-auto-minimize-setting', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const settingPath = path.join(userDataPath, 'auto-minimize-setting.json');
    
    const data = await fs.promises.readFile(settingPath, 'utf8');
    const settingData = JSON.parse(data);
    
    autoMinimizeEnabled = settingData.autoMinimize;
    return { success: true, autoMinimize: settingData.autoMinimize };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, error: 'No auto-minimize setting found' };
    }
    console.error('Error loading auto-minimize setting:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-screen-size', async (event) => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    return { success: true, width, height };
  } catch (error) {
    console.error('Error getting screen size:', error);
    return { success: false, error: error.message };
  }
});

// Get app configuration
ipcMain.handle('get-app-config', async (event) => {
  try {
    return { 
      success: true, 
      config: {
        enableDrag: ENABLE_DRAG
      }
    };
  } catch (error) {
    console.error('Error getting app config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-always-on-top', async (event, alwaysOnTop) => {
  try {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(alwaysOnTop);
      return { success: true };
    }
    return { success: false, error: 'Main window not found' };
  } catch (error) {
    console.error('Error setting always on top:', error);
    return { success: false, error: error.message };
  }
});

// IPC handlers
ipcMain.handle('save-file', async (event, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'HTML Files', extensions: ['html'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled) {
    try {
      fs.writeFileSync(result.filePath, content);
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Save cancelled' };
});

// Export file handler with format support
ipcMain.handle('export-file', async (event, content, format, defaultFilename) => {
  const filters = [];
  
  if (format === 'html') {
    filters.push({ name: 'HTML Files', extensions: ['html'] });
  } else if (format === 'markdown') {
    filters.push({ name: 'Markdown Files', extensions: ['md'] });
  } else {
    filters.push({ name: 'All Files', extensions: ['*'] });
  }
  
  filters.push({ name: 'All Files', extensions: ['*'] });

  const result = await dialog.showSaveDialog(mainWindow, {
    filters: filters,
    defaultPath: defaultFilename
  });

  if (!result.canceled) {
    try {
      fs.writeFileSync(result.filePath, content, 'utf8');
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Save cancelled' };
});

// Export to PDF handler
ipcMain.handle('export-to-pdf', async (event, htmlContent, defaultFilename) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: defaultFilename
  });

  if (result.canceled) {
    return { success: false, error: 'Save cancelled' };
  }

  try {
    // Create a temporary HTML file
    const tempDir = app.getPath('temp');
    const tempHtmlPath = path.join(tempDir, `export-${Date.now()}.html`);
    
    // Wrap HTML content with proper structure for PDF generation
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    p {
      margin: 0.5em 0;
    }
    ul, ol {
      margin: 0.5em 0;
      padding-left: 2em;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #f4f4f4;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
    
    fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');
    
    // Load the HTML file in a hidden window and print to PDF
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    await pdfWindow.loadFile(tempHtmlPath);
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate PDF
    const pdfData = await pdfWindow.webContents.printToPDF({
      marginsType: 1,
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: false
    });
    
    // Write PDF file
    fs.writeFileSync(result.filePath, pdfData);
    
    // Clean up
    pdfWindow.close();
    fs.unlinkSync(tempHtmlPath);
    
    return { success: true, path: result.filePath };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'HTML Files', extensions: ['html'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const content = fs.readFileSync(result.filePaths[0], 'utf8');
      return { success: true, content, path: result.filePaths[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Load cancelled' };
});

// Handle transparency settings
ipcMain.handle('set-transparency', async (event, opacity) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Window not available' };
    }
    mainWindow.setOpacity(opacity);
    return { success: true };
  } catch (error) {
    console.error('Transparency error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-transparency', async (event) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Window not available' };
    }
    const opacity = mainWindow.getOpacity();
    return { success: true, opacity: opacity };
  } catch (error) {
    console.error('Get transparency error:', error);
    return { success: false, error: error.message };
  }
});

// Handle toggle minimize
ipcMain.handle("toggle-minimize", async (event) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Window not available' };
    }
    const bounds = mainWindow.getBounds();
    if (bounds.height > 50) {
      // Minimize to title bar only
      mainWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: 40
      });
    } else {
      // Restore to original size
      mainWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: 300
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Toggle minimize error:", error);
    return { success: false, error: error.message };
  }
});

// Handle countdown notification
ipcMain.handle("show-notification", async (event, { title, body, sound = true }) => {
  try {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: title || "StickyTop Timer",
        body: body || "Countdown completed!",
        icon: path.join(__dirname, "assets", "icon.png"),
        sound: sound,
        urgency: "critical"
      });
      
      notification.show();
      
      // Flash window to get attention
      if (mainWindow) {
        mainWindow.flashFrame(true);
        setTimeout(() => {
          mainWindow.flashFrame(false);
        }, 3000);
      }
      
      return { success: true };
    } else {
      return { success: false, error: "Notifications not supported" };
    }
  } catch (error) {
    console.error("Notification error:", error);
    return { success: false, error: error.message };
  }
});

// Handle system sound
ipcMain.handle("play-system-sound", async (event, soundName = "Glass") => {
  try {
    // Play system sound using macOS say command
    const { exec } = require('child_process');
    
    const soundCommands = {
      "Glass": "afplay /System/Library/Sounds/Glass.aiff",
      "Basso": "afplay /System/Library/Sounds/Basso.aiff", 
      "Blow": "afplay /System/Library/Sounds/Blow.aiff",
      "Bottle": "afplay /System/Library/Sounds/Bottle.aiff",
      "Frog": "afplay /System/Library/Sounds/Frog.aiff",
      "Funk": "afplay /System/Library/Sounds/Funk.aiff",
      "Hero": "afplay /System/Library/Sounds/Hero.aiff",
      "Morse": "afplay /System/Library/Sounds/Morse.aiff",
      "Ping": "afplay /System/Library/Sounds/Ping.aiff",
      "Pop": "afplay /System/Library/Sounds/Pop.aiff",
      "Purr": "afplay /System/Library/Sounds/Purr.aiff",
      "Sosumi": "afplay /System/Library/Sounds/Sosumi.aiff",
      "Submarine": "afplay /System/Library/Sounds/Submarine.aiff",
      "Tink": "afplay /System/Library/Sounds/Tink.aiff"
    };
    
    const command = soundCommands[soundName] || soundCommands["Glass"];
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Sound error:', error);
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('System sound error:', error);
    return { success: false, error: error.message };
  }
});

// Handle get system time
ipcMain.handle("get-system-time", async (event) => {
  try {
    const now = new Date();
    return {
      success: true,
      time: {
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        date: now.toDateString(),
        timeString: now.toLocaleTimeString(),
        dateTimeString: now.toLocaleString()
      }
    };
  } catch (error) {
    console.error('Get time error:', error);
    return { success: false, error: error.message };
  }
});

// Handle speak text
ipcMain.handle("speak-text", async (event, text) => {
  try {
    const { exec } = require('child_process');
    const command = `say "${text}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Speak error:', error);
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Speak text error:', error);
    return { success: false, error: error.message };
  }
});

// ===== GOOGLE OAUTH & CALENDAR =====

// Store user tokens
let userTokens = null;

// Load saved tokens
function loadUserTokens() {
  try {
    const userDataPath = app.getPath('userData');
    const tokensPath = path.join(userDataPath, 'google-tokens.json');
    if (fs.existsSync(tokensPath)) {
      const data = fs.readFileSync(tokensPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
  return null;
}

// Save user tokens
function saveUserTokens(tokens) {
  try {
    const userDataPath = app.getPath('userData');
    const tokensPath = path.join(userDataPath, 'google-tokens.json');
    if (tokens) {
      fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
      userTokens = tokens;
    } else {
      // Delete file if tokens is null
      if (fs.existsSync(tokensPath)) {
        fs.unlinkSync(tokensPath);
      }
      userTokens = null;
    }
  } catch (error) {
    console.error('Error saving tokens:', error);
  }
}

// Load tokens on startup
userTokens = loadUserTokens();

// Function to find available port
function findAvailablePort(startPort, endPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port > endPort) {
        reject(new Error(`No available port found between ${startPort} and ${endPort}`));
        return;
      }

      const testServer = http.createServer();
      testServer.listen(port, '127.0.0.1', () => {
        testServer.once('close', () => resolve(port));
        testServer.close();
      });

      testServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
    };

    tryPort(startPort);
  });
}

// OAuth Login Handler
ipcMain.handle('google-login', async (event) => {
  try {
    // Find available port from PORT_START to PORT_END
    const port = await findAvailablePort(PORT_START, PORT_END);
    const redirectUri = `http://127.0.0.1:${port}/callback`;

    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    authWindow.loadURL(authUrl);
    authWindow.show();

    return new Promise((resolve, reject) => {
      let server;
      let serverResolve;
      let serverReject;

      const cleanup = () => {
        if (server) {
          server.close();
          server = null;
        }
        if (authWindow && !authWindow.isDestroyed()) {
          authWindow.close();
        }
      };

      server = http.createServer((req, res) => {
        if (req.url && req.url.startsWith('/callback')) {
          const url = new URL(req.url, `http://127.0.0.1:${port}`);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Authorization failed</h1><p>You can close this window.</p></body></html>');
            cleanup();
            if (serverReject) {
              serverReject({ success: false, error: error });
            }
            return;
          }

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>');
            
            (async () => {
              try {
                const { tokens } = await oauth2Client.getToken(code);
                saveUserTokens(tokens);
                
                oauth2Client.setCredentials(tokens);
                const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
                const userInfo = await oauth2.userinfo.get();
                
                cleanup();
                
                if (serverResolve) {
                  serverResolve({
                    success: true,
                    user: {
                      email: userInfo.data.email,
                      name: userInfo.data.name,
                      picture: userInfo.data.picture
                    }
                  });
                }
              } catch (error) {
                cleanup();
                if (serverReject) {
                  serverReject({ success: false, error: error.message });
                }
              }
            })();
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>No authorization code</h1><p>You can close this window.</p></body></html>');
            cleanup();
            if (serverReject) {
              serverReject({ success: false, error: 'No authorization code received' });
            }
          }
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      server.listen(port, '127.0.0.1', () => {
        serverResolve = resolve;
        serverReject = reject;
      });

      server.on('error', (err) => {
        cleanup();
        if (serverReject) {
          serverReject({ success: false, error: err.message });
        }
      });

      authWindow.on('closed', () => {
        cleanup();
        if (serverReject) {
          serverReject({ success: false, error: 'Auth window closed' });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get current user
ipcMain.handle('get-current-user', async (event) => {
  if (!userTokens) {
    return { success: false, user: null };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URL
    );
    oauth2Client.setCredentials(userTokens);

    // Refresh token if needed
    if (userTokens.expiry_date && userTokens.expiry_date <= Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      saveUserTokens(credentials);
      oauth2Client.setCredentials(credentials);
    }

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    return {
      success: true,
      user: {
        email: userInfo.data.email,
        name: userInfo.data.name,
        picture: userInfo.data.picture
      }
    };
  } catch (error) {
    // Token invalid, clear it
    saveUserTokens(null);
    return { success: false, user: null, error: error.message };
  }
});

// Logout handler
ipcMain.handle('google-logout', async (event) => {
  try {
    saveUserTokens(null);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update sync-calendar-event handler
ipcMain.handle('sync-calendar-event', async (event, { text, date, time }) => {
  try {
    if (!userTokens) {
      return { success: false, error: 'Not logged in. Please login with Google first.' };
    }

    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URL
    );
    oauth2Client.setCredentials(userTokens);

    // Refresh token if needed
    if (userTokens.expiry_date && userTokens.expiry_date <= Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      saveUserTokens(credentials);
      oauth2Client.setCredentials(credentials);
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Parse date and time
    let startDateTime;
    if (date && time) {
      startDateTime = new Date(`${date}T${time}`);
    } else {
      // Default: next Saturday 9am
      const now = new Date();
      const saturday = new Date(now);
      saturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
      saturday.setHours(9, 0, 0);
      startDateTime = saturday;
    }

    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: text,
        start: { dateTime: startDateTime.toISOString() },
        end: { dateTime: endDateTime.toISOString() },
      },
    });

    return { 
      success: true, 
      eventId: response.data.id,
      eventDate: date || null,
      eventTime: time || null
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

// Get calendar events for a specific date
ipcMain.handle('get-calendar-events', async (event, dateString) => {
  try {
    if (!userTokens) {
      return { success: false, error: 'Not logged in. Please login with Google first.', events: [] };
    }

    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URL
    );
    oauth2Client.setCredentials(userTokens);

    // Refresh token if needed
    if (userTokens.expiry_date && userTokens.expiry_date <= Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      saveUserTokens(credentials);
      oauth2Client.setCredentials(credentials);
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Parse date string (format: YYYY-MM-DD) in local timezone
    const [year, month, day] = dateString.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Fetch events for the day
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data.items || [])
      .filter(event => {
        // Filter out birthday events
        // Check eventType
        if (event.eventType === 'birthday') {
          return false;
        }
        return true;
      })
      .map(event => ({
        id: event.id,
        summary: event.summary || '(No title)',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: !event.start?.dateTime, // If no dateTime, it's an all-day event
        location: event.location || '',
        htmlLink: event.htmlLink || '',
      }));

    return { success: true, events };
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    return { success: false, error: err.message, events: [] };
  }
});

// Delete calendar event
ipcMain.handle('delete-calendar-event', async (event, eventId) => {
  try {
    if (!userTokens) {
      return { success: false, error: 'Not logged in. Please login with Google first.' };
    }

    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URL
    );
    oauth2Client.setCredentials(userTokens);

    // Refresh token if needed
    if (userTokens.expiry_date && userTokens.expiry_date <= Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      saveUserTokens(credentials);
      oauth2Client.setCredentials(credentials);
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    return { success: true };
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    return { success: false, error: err.message };
  }
});

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Save window state before app quits
app.on('before-quit', () => {
  saveWindowState();
});
