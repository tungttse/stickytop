const { app, BrowserWindow, Menu, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: process.env.ENV ==='dev' ? 1200 : 300,
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
    show: false,
    opacity: 0.8
  });

  // Load the index.html file
  mainWindow.loadFile('dist/index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Open developer tools automatically for debugging
    process.env.ENV ==='dev' && mainWindow.webContents.openDevTools();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-note');
          }
        },
        {
          label: 'Save Note',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('save-note');
          }
        },
        {
          label: 'Load Note',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('load-note');
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Always On Top',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
            mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
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
        { type: 'separator' },
        {
          label: 'Insert Todo',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow.webContents.executeJavaScript('insertTodo()');
          }
        }
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
        { role: 'togglefullscreen' }
      ]
    },
    {
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
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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
    mainWindow.setOpacity(opacity);
    return { success: true };
  } catch (error) {
    console.error('Transparency error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-transparency', async (event) => {
  try {
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
ipcMain.handle("show-notification", async (event, objs) => {
  try {
    console.log('Showing notification...');
    if (Notification.isSupported()) {
      const { title, body, sound } = objs;
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
