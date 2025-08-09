const { ipcMain } = require('electron');
const Store = require('electron-store');
const { setupIpcHandlers } = require('../main/ipc');

// Mock electron modules
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  }
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

describe('IPC Handlers', () => {
  let store;
  let mockMainWindow;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a new store instance for each test
    store = new Store();
    
    // Mock main window
    mockMainWindow = {
      webContents: {
        send: jest.fn()
      }
    };
  });

  test('setupIpcHandlers registers all required handlers', () => {
    // Call the function to set up IPC handlers
    setupIpcHandlers(mockMainWindow, store);
    
    // Check that all expected handlers are registered
    expect(ipcMain.handle).toHaveBeenCalledWith('get-user-data', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('set-user-data', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('clear-user-data', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('get-app-version', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('check-for-updates', expect.any(Function));
    
    // Check that event listeners are registered
    expect(ipcMain.on).toHaveBeenCalledWith('app-quit', expect.any(Function));
    expect(ipcMain.on).toHaveBeenCalledWith('open-external-link', expect.any(Function));
  });

  test('get-user-data handler returns data from store', async () => {
    // Set up mock implementation for store.get
    const mockUserData = { name: 'Test User', preferences: { theme: 'dark' } };
    store.get.mockReturnValue(mockUserData);
    
    // Set up the handlers
    setupIpcHandlers(mockMainWindow, store);
    
    // Get the handler function that was registered
    const getUserDataHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'get-user-data'
    )[1];
    
    // Call the handler with a mock event and key
    const result = await getUserDataHandler({}, 'userData');
    
    // Check that store.get was called with the correct key
    expect(store.get).toHaveBeenCalledWith('userData');
    
    // Check that the handler returned the expected data
    expect(result).toEqual(mockUserData);
  });

  test('set-user-data handler stores data in store', async () => {
    // Set up the handlers
    setupIpcHandlers(mockMainWindow, store);
    
    // Get the handler function that was registered
    const setUserDataHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'set-user-data'
    )[1];
    
    // Mock data to store
    const mockUserData = { name: 'Test User', preferences: { theme: 'dark' } };
    
    // Call the handler with a mock event, key, and value
    await setUserDataHandler({}, 'userData', mockUserData);
    
    // Check that store.set was called with the correct key and value
    expect(store.set).toHaveBeenCalledWith('userData', mockUserData);
  });

  test('clear-user-data handler clears data from store', async () => {
    // Set up the handlers
    setupIpcHandlers(mockMainWindow, store);
    
    // Get the handler function that was registered
    const clearUserDataHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'clear-user-data'
    )[1];
    
    // Call the handler with a mock event and key
    await clearUserDataHandler({}, 'userData');
    
    // Check that store.delete was called with the correct key
    expect(store.delete).toHaveBeenCalledWith('userData');
  });

  test('get-app-version handler returns app version', async () => {
    // Mock app version
    const mockVersion = '1.0.0';
    process.env.npm_package_version = mockVersion;
    
    // Set up the handlers
    setupIpcHandlers(mockMainWindow, store);
    
    // Get the handler function that was registered
    const getAppVersionHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'get-app-version'
    )[1];
    
    // Call the handler with a mock event
    const result = await getAppVersionHandler({});
    
    // Check that the handler returned the expected version
    expect(result).toEqual(mockVersion);
  });

  test('check-for-updates handler triggers update check', async () => {
    // Mock autoUpdater
    const mockAutoUpdater = {
      checkForUpdates: jest.fn().mockResolvedValue()
    };
    
    // Set up the handlers with the mock autoUpdater
    setupIpcHandlers(mockMainWindow, store, mockAutoUpdater);
    
    // Get the handler function that was registered
    const checkForUpdatesHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'check-for-updates'
    )[1];
    
    // Call the handler with a mock event
    await checkForUpdatesHandler({});
    
    // Check that autoUpdater.checkForUpdates was called
    expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled();
  });

  test('app-quit event handler quits the app', () => {
    // Mock app
    const mockApp = {
      quit: jest.fn()
    };
    
    // Set up the handlers with the mock app
    setupIpcHandlers(mockMainWindow, store, null, mockApp);
    
    // Get the event handler that was registered
    const appQuitHandler = ipcMain.on.mock.calls.find(
      call => call[0] === 'app-quit'
    )[1];
    
    // Call the handler with a mock event
    appQuitHandler({});
    
    // Check that app.quit was called
    expect(mockApp.quit).toHaveBeenCalled();
  });

  test('open-external-link event handler opens external link', () => {
    // Mock shell
    const mockShell = {
      openExternal: jest.fn().mockResolvedValue()
    };
    
    // Set up the handlers with the mock shell
    setupIpcHandlers(mockMainWindow, store, null, null, mockShell);
    
    // Get the event handler that was registered
    const openExternalLinkHandler = ipcMain.on.mock.calls.find(
      call => call[0] === 'open-external-link'
    )[1];
    
    // Mock URL to open
    const mockUrl = 'https://example.com';
    
    // Call the handler with a mock event and URL
    openExternalLinkHandler({}, mockUrl);
    
    // Check that shell.openExternal was called with the correct URL
    expect(mockShell.openExternal).toHaveBeenCalledWith(mockUrl);
  });

  test('notifies renderer process when user data changes', async () => {
    // Set up the handlers
    setupIpcHandlers(mockMainWindow, store);
    
    // Get the handler function that was registered
    const setUserDataHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'set-user-data'
    )[1];
    
    // Mock data to store
    const mockUserData = { name: 'Test User', preferences: { theme: 'dark' } };
    
    // Call the handler with a mock event, key, and value
    await setUserDataHandler({}, 'userData', mockUserData);
    
    // Check that mainWindow.webContents.send was called with the correct event and data
    expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
      'user-data-changed',
      'userData',
      mockUserData
    );
  });

  test('handles errors in get-user-data gracefully', async () => {
    // Set up mock implementation for store.get to throw an error
    const mockError = new Error('Failed to get user data');
    store.get.mockImplementation(() => {
      throw mockError;
    });
    
    // Set up the handlers
    setupIpcHandlers(mockMainWindow, store);
    
    // Get the handler function that was registered
    const getUserDataHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'get-user-data'
    )[1];
    
    // Call the handler with a mock event and key
    const result = await getUserDataHandler({}, 'userData');
    
    // Check that the handler returned null (or appropriate error handling)
    expect(result).toBeNull();
    
    // Check that an error notification was sent to the renderer
    expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
      'error',
      'Failed to get user data'
    );
  });

  test('handles errors in set-user-data gracefully', async () => {
    // Set up mock implementation for store.set to throw an error
    const mockError = new Error('Failed to set user data');
    store.set.mockImplementation(() => {
      throw mockError;
    });
    
    // Set up the handlers
    setupIpcHandlers(mockMainWindow, store);
    
    // Get the handler function that was registered
    const setUserDataHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'set-user-data'
    )[1];
    
    // Mock data to store
    const mockUserData = { name: 'Test User', preferences: { theme: 'dark' } };
    
    // Call the handler with a mock event, key, and value
    const result = await setUserDataHandler({}, 'userData', mockUserData);
    
    // Check that the handler returned false (or appropriate error handling)
    expect(result).toBe(false);
    
    // Check that an error notification was sent to the renderer
    expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
      'error',
      'Failed to set user data'
    );
  });
});