const { app, BrowserWindow, ipcMain, Menu, Tray, shell } = require('electron');
const path = require('path');
const url = require('url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const Store = require('electron-store');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Initialize store for settings
const store = new Store();

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;
let tray;
let isQuitting = false;

// Load environment variables
require('dotenv').config();

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false, // Don't show until ready-to-show
    backgroundColor: '#ffffff'
  });

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '../build/index.html'),
    protocol: 'file:',
    slashes: true
  });
  
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    checkForUpdates();
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window close event
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // Create application menu
  createMenu();

  // Create system tray
  createTray();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
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
        { role: 'paste' }
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
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://motivational-app.com');
          }
        },
        {
          label: 'Check for Updates',
          click: () => {
            checkForUpdates(true);
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            showAboutDialog();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open', 
      click: () => {
        mainWindow.show();
      } 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('Motivational Quotes');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function showAboutDialog() {
  const options = {
    type: 'info',
    buttons: ['OK'],
    title: 'About Motivational Quotes',
    message: 'Motivational Quotes',
    detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}\nV8: ${process.versions.v8}`
  };
  
  require('electron').dialog.showMessageBox(mainWindow, options);
}

function checkForUpdates(manual = false) {
  if (process.env.AUTO_UPDATE_ENABLED !== 'true') {
    return;
  }
  
  autoUpdater.checkForUpdatesAndNotify();
  
  if (manual) {
    log.info('Manual update check initiated');
  }
}

// Auto updater events
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info);
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available:', info);
});

autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
  logMessage = `${logMessage} - Downloaded ${progressObj.percent}%`;
  logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`;
  log.info(logMessage);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info);
  
  const options = {
    type: 'question',
    buttons: ['Install and Restart', 'Later'],
    defaultId: 0,
    title: 'Update Available',
    message: 'A new version has been downloaded. Install now and restart the application?'
  };
  
  require('electron').dialog.showMessageBox(mainWindow, options).then((result) => {
    if (result.response === 0) {
      isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-user-data', () => {
  return store.get('userData');
});

ipcMain.handle('set-user-data', (event, userData) => {
  store.set('userData', userData);
  return true;
});

ipcMain.handle('clear-user-data', () => {
  store.delete('userData');
  return true;
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});