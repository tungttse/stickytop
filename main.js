// Load environment variables
require('dotenv').config();

const { app, BrowserWindow, Menu, ipcMain, dialog, Notification, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

// Load drag feature config
const ENABLE_DRAG = process.env.ENABLE_DRAG === 'true';

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

function createWindow() {
  // Load saved window state
  const savedState = loadWindowState();
  
  // Default window options
  const defaultOptions = {
    width: 800,
    height: process.env.ENV ==='dev' ? 800 : 600,
    minWidth: 200,
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
    opacity: 0.8
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
    if (savedState && savedState.isMaximized) {
      mainWindow.maximize();
    }
    
    // Open developer tools automatically for debugging
    // process.env.ENV ==='dev' && mainWindow.webContents.openDevTools();
    // mainWindow.webContents.openDevTools();
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
  createMenu(isDev);
}

function createMenu(isDev = false) {
  // Get current state
  const isAlwaysOnTop = mainWindow ? mainWindow.isAlwaysOnTop() : true; // Default to true
  const savedColor = loadSavedColor();
  const currentColor = savedColor || '#ffff99'; // Default to Yellow
  
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
          label: 'Toggle Always On Top',
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
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('open-settings');
          }
        },
        { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    // {
    //   label: 'Edit',
    //   submenu: [
    //     { role: 'undo' },
    //     { role: 'redo' },
    //     { type: 'separator' },
    //     { role: 'cut' },
    //     { role: 'copy' },
    //     { role: 'paste' },
    //     { role: 'selectall' },
    //     { type: 'separator' },
    //     {
    //       label: 'Insert Todo',
    //       accelerator: 'CmdOrCtrl+Shift+C',
    //       click: () => {
    //         mainWindow.webContents.executeJavaScript('insertTodo()');
    //       }
    //     }
    //   ]
    // },
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
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Color',
      submenu: [
        {
          label: 'Yellow',
          type: 'checkbox',
          checked: currentColor === '#ffff99',
          click: () => {
            mainWindow.webContents.send('change-color', '#ffff99');
            createMenu(isDev); // Update menu to show new checked state
          }
        },
        {
          label: 'Blue',
          type: 'checkbox',
          checked: currentColor === '#99ccff',
          click: () => {
            mainWindow.webContents.send('change-color', '#99ccff');
            createMenu(isDev); // Update menu to show new checked state
          }
        },
        {
          label: 'Green',
          type: 'checkbox',
          checked: currentColor === '#99ff99',
          click: () => {
            mainWindow.webContents.send('change-color', '#99ff99');
            createMenu(isDev); // Update menu to show new checked state
          }
        },
        {
          label: 'Pink',
          type: 'checkbox',
          checked: currentColor === '#ff99cc',
          click: () => {
            mainWindow.webContents.send('change-color', '#ff99cc');
            createMenu(isDev); // Update menu to show new checked state
          }
        },
        {
          label: 'Purple',
          type: 'checkbox',
          checked: currentColor === '#cc99ff',
          click: () => {
            mainWindow.webContents.send('change-color', '#cc99ff');
            createMenu(isDev); // Update menu to show new checked state
          }
        }
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

// Color management
ipcMain.handle('save-color', async (event, color) => {
  try {
    const userDataPath = app.getPath('userData');
    const colorPath = path.join(userDataPath, 'sticky-color.json');
    
    const colorData = {
      color: color,
      timestamp: Date.now()
    };
    
    await fs.promises.writeFile(colorPath, JSON.stringify(colorData, null, 2));
    
    // Update menu to reflect new color
    const isDev = process.env.ENV === 'dev' || process.argv.includes('--dev');
    createMenu(isDev);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving color:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-color', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const colorPath = path.join(userDataPath, 'sticky-color.json');
    
    const data = await fs.promises.readFile(colorPath, 'utf8');
    const colorData = JSON.parse(data);
    
    return { success: true, color: colorData.color };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, error: 'No saved color found' };
    }
    console.error('Error loading color:', error);
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

ipcMain.handle('sync-calendar-event', async (event, { text, date, time }) => {
  try {
    // Tạo Google Calendar client
    const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
    auth.setCredentials({ refresh_token: REFRESH_TOKEN })
    const calendar = google.calendar({ version: 'v3', auth })

    // Xác định thời gian (thứ 7, 9h)
    const now = new Date()
    const saturday = new Date(now)
    saturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7))
    saturday.setHours(9, 0, 0)

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: text,
        start: { dateTime: saturday.toISOString() },
        end: { dateTime: new Date(saturday.getTime() + 60 * 60 * 1000).toISOString() },
      },
    })
    return { success: true }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
})

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
