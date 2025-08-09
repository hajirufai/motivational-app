const { app, BrowserWindow, Menu, Tray, dialog, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const Store = require('electron-store');

// Mock electron modules
jest.mock('electron', () => {
  const mockIpcMain = {
    on: jest.fn(),
    handle: jest.fn()
  };

  const mockApp = {
    on: jest.fn(),
    whenReady: jest.fn().mockResolvedValue(),
    getPath: jest.fn().mockReturnValue('/mock/path'),
    quit: jest.fn(),
    exit: jest.fn(),
    isPackaged: false
  };

  const mockBrowserWindow = jest.fn().mockImplementation(() => ({
    loadURL: jest.fn().mockResolvedValue(),
    loadFile: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    once: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    isVisible: jest.fn().mockReturnValue(true),
    webContents: {
      on: jest.fn(),
      openDevTools: jest.fn(),
      send: jest.fn()
    },
    setMenu: jest.fn(),
    destroy: jest.fn()
  }));

  const mockMenu = {
    buildFromTemplate: jest.fn().mockReturnValue({
      popup: jest.fn(),
      closePopup: jest.fn()
    }),
    setApplicationMenu: jest.fn()
  };

  const mockTray = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    setToolTip: jest.fn(),
    setContextMenu: jest.fn(),
    destroy: jest.fn()
  }));

  const mockDialog = {
    showMessageBox: jest.fn().mockResolvedValue({ response: 0 })
  };

  return {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    Menu: mockMenu,
    Tray: mockTray,
    dialog: mockDialog,
    ipcMain: mockIpcMain
  };
});

// Mock electron-updater
jest.mock('electron-updater', () => ({
  autoUpdater: {
    on: jest.fn(),
    logger: null,
    checkForUpdatesAndNotify: jest.fn().mockResolvedValue(),
    downloadUpdate: jest.fn().mockResolvedValue(),
    quitAndInstall: jest.fn()
  }
}));

// Mock electron-log
jest.mock('electron-log', () => ({
  transports: {
    file: {
      level: 'info'
    }
  },
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  }));
});

// Import the main process file after mocking dependencies
const originalEnv = process.env;

describe('Main Process', () => {
  let main;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    
    // Import main.js for each test to ensure clean state
    jest.isolateModules(() => {
      main = require('../main');
    });
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });

  describe('App Initialization', () => {
    test('sets up app event listeners', () => {
      expect(app.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(app.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
      expect(app.on).toHaveBeenCalledWith('activate', expect.any(Function));
      expect(app.on).toHaveBeenCalledWith('before-quit', expect.any(Function));
    });

    test('configures autoUpdater', () => {
      expect(autoUpdater.logger).toBe(log);
      expect(autoUpdater.on).toHaveBeenCalledWith('checking-for-update', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-not-available', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('download-progress', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
    });
  });

  describe('Window Management', () => {
    test('creates main window on app ready', async () => {
      // Get the ready callback
      const readyCallback = app.on.mock.calls.find(call => call[0] === 'ready')[1];
      
      // Call the ready callback
      await readyCallback();
      
      expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
        webPreferences: expect.objectContaining({
          nodeIntegration: true,
          contextIsolation: false
        })
      }));
    });

    test('loads correct URL in development mode', async () => {
      process.env.ELECTRON_START_URL = 'http://localhost:3000';
      
      // Get the ready callback
      const readyCallback = app.on.mock.calls.find(call => call[0] === 'ready')[1];
      
      // Call the ready callback
      await readyCallback();
      
      const mockWindow = BrowserWindow.mock.results[0].value;
      expect(mockWindow.loadURL).toHaveBeenCalledWith('http://localhost:3000');
    });

    test('loads local file in production mode', async () => {
      // Clear ELECTRON_START_URL
      delete process.env.ELECTRON_START_URL;
      
      // Get the ready callback
      const readyCallback = app.on.mock.calls.find(call => call[0] === 'ready')[1];
      
      // Call the ready callback
      await readyCallback();
      
      const mockWindow = BrowserWindow.mock.results[0].value;
      expect(mockWindow.loadFile).toHaveBeenCalledWith(expect.stringContaining('index.html'));
    });
  });

  describe('IPC Handlers', () => {
    test('sets up IPC handlers for user data', async () => {
      // Get the ready callback
      const readyCallback = app.on.mock.calls.find(call => call[0] === 'ready')[1];
      
      // Call the ready callback
      await readyCallback();
      
      expect(ipcMain.handle).toHaveBeenCalledWith('get-user-data', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('set-user-data', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('clear-user-data', expect.any(Function));
    });

    test('get-user-data handler returns data from store', async () => {
      // Setup mock store behavior
      const mockStore = Store.mock.results[0].value;
      mockStore.get.mockReturnValue({ id: 'user123', name: 'Test User' });
      
      // Get the ready callback and call it
      const readyCallback = app.on.mock.calls.find(call => call[0] === 'ready')[1];
      await readyCallback();
      
      // Get the handler function
      const getUserDataHandler = ipcMain.handle.mock.calls.find(
        call => call[0] === 'get-user-data'
      )[1];
      
      // Call the handler
      const result = await getUserDataHandler({}, 'user');
      
      expect(mockStore.get).toHaveBeenCalledWith('user');
      expect(result).toEqual({ id: 'user123', name: 'Test User' });
    });

    test('set-user-data handler stores data in store', async () => {
      // Setup mock store
      const mockStore = Store.mock.results[0].value;
      
      // Get the ready callback and call it
      const readyCallback = app.on.mock.calls.find(call => call[0] === 'ready')[1];
      await readyCallback();
      
      // Get the handler function
      const setUserDataHandler = ipcMain.handle.mock.calls.find(
        call => call[0] === 'set-user-data'
      )[1];
      
      // Call the handler
      const userData = { id: 'user123', name: 'Test User' };
      await setUserDataHandler({}, 'user', userData);
      
      expect(mockStore.set).toHaveBeenCalledWith('user', userData);
    });

    test('clear-user-data handler clears data from store', async () => {
      // Setup mock store
      const mockStore = Store.mock.results[0].value;
      
      // Get the ready callback and call it
      const readyCallback = app.on.mock.calls.find(call => call[0] === 'ready')[1];
      await readyCallback();
      
      // Get the handler function
      const clearUserDataHandler = ipcMain.handle.mock.calls.find(
        call => call[0] === 'clear-user-data'
      )[1];
      
      // Call the handler
      await clearUserDataHandler({}, 'user');
      
      expect(mockStore.delete).toHaveBeenCalledWith('user');
    });
  });

  describe('Menu and Tray', () => {
    test('creates application menu', async () => {
      // Get the ready callback
      const readyCallback = app.on.mock.calls.find(call => call[0] === 'ready')[1];
      
      // Call the ready callback
      await readyCallback();
      
      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();
    });

    test('creates system tray', async () => {
      // Get the ready callback
      const readyCallback = app.on.mock.calls.find(call => call[0] === 'ready')[1];
      
      // Call the ready callback
      await readyCallback();
      
      expect(Tray).toHaveBeenCalled();
      const mockTrayInstance = Tray.mock.results[0].value;
      expect(mockTrayInstance.setToolTip).toHaveBeenCalled();
      expect(mockTrayInstance.setContextMenu).toHaveBeenCalled();
    });
  });

  describe('Auto Updater', () => {
    test('checkForUpdates calls autoUpdater', async () => {
      // Get the ready callback
      const readyCallback = app.on.mock.calls.find(call => call[0] === 'ready')[1];
      
      // Call the ready callback
      await readyCallback();
      
      // Find the checkForUpdates function
      const checkForUpdates = main.checkForUpdates || global.checkForUpdates;
      
      // Call the function if it exists
      if (checkForUpdates) {
        checkForUpdates();
        expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
      }
    });

    test('handles update-downloaded event', async () => {
      // Get the update-downloaded callback
      const updateDownloadedCallback = autoUpdater.on.mock.calls.find(
        call => call[0] === 'update-downloaded'
      )[1];
      
      // Mock dialog response (user clicks "Install")
      dialog.showMessageBox.mockResolvedValueOnce({ response: 0 });
      
      // Call the callback
      await updateDownloadedCallback({ version: '1.0.1' });
      
      expect(dialog.showMessageBox).toHaveBeenCalled();
      expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
    });
  });

  describe('App Lifecycle', () => {
    test('quits app on window-all-closed for non-macOS', () => {
      // Mock platform as Windows
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });
      
      // Get the window-all-closed callback
      const windowAllClosedCallback = app.on.mock.calls.find(
        call => call[0] === 'window-all-closed'
      )[1];
      
      // Call the callback
      windowAllClosedCallback();
      
      expect(app.quit).toHaveBeenCalled();
    });

    test('does not quit app on window-all-closed for macOS', () => {
      // Mock platform as macOS
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      
      // Get the window-all-closed callback
      const windowAllClosedCallback = app.on.mock.calls.find(
        call => call[0] === 'window-all-closed'
      )[1];
      
      // Call the callback
      windowAllClosedCallback();
      
      expect(app.quit).not.toHaveBeenCalled();
    });

    test('creates new window on activate if none exists', async () => {
      // Get the activate callback
      const activateCallback = app.on.mock.calls.find(
        call => call[0] === 'activate'
      )[1];
      
      // Reset BrowserWindow constructor count
      BrowserWindow.mockClear();
      
      // Call the callback
      await activateCallback();
      
      expect(BrowserWindow).toHaveBeenCalled();
    });
  });
});