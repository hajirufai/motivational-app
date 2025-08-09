const { contextBridge, ipcRenderer } = require('electron');

// Mock electron modules
jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    send: jest.fn()
  }
}));

describe('Preload Script', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset modules to ensure a fresh preload script for each test
    jest.resetModules();
  });

  test('exposes the correct API to the renderer process', () => {
    // Import the preload script
    require('../preload');
    
    // Check that contextBridge.exposeInMainWorld was called with the correct API name
    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'electronAPI',
      expect.any(Object)
    );
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Check that all expected methods are exposed
    expect(exposedAPI).toHaveProperty('getUserData');
    expect(exposedAPI).toHaveProperty('setUserData');
    expect(exposedAPI).toHaveProperty('clearUserData');
    expect(exposedAPI).toHaveProperty('getAppVersion');
    expect(exposedAPI).toHaveProperty('checkForUpdates');
    expect(exposedAPI).toHaveProperty('quitApp');
    expect(exposedAPI).toHaveProperty('openExternalLink');
    expect(exposedAPI).toHaveProperty('onUpdateAvailable');
    expect(exposedAPI).toHaveProperty('onUpdateDownloaded');
    expect(exposedAPI).toHaveProperty('onUserDataChanged');
  });

  test('getUserData method invokes the correct IPC channel', async () => {
    // Mock the ipcRenderer.invoke to return a test value
    ipcRenderer.invoke.mockResolvedValue({ name: 'Test User' });
    
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Call the getUserData method
    const key = 'userData';
    const result = await exposedAPI.getUserData(key);
    
    // Check that ipcRenderer.invoke was called with the correct channel and arguments
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('get-user-data', key);
    
    // Check that the method returns the value from ipcRenderer.invoke
    expect(result).toEqual({ name: 'Test User' });
  });

  test('setUserData method invokes the correct IPC channel', async () => {
    // Mock the ipcRenderer.invoke to return a success value
    ipcRenderer.invoke.mockResolvedValue(true);
    
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Call the setUserData method
    const key = 'userData';
    const value = { name: 'Test User', preferences: { theme: 'dark' } };
    const result = await exposedAPI.setUserData(key, value);
    
    // Check that ipcRenderer.invoke was called with the correct channel and arguments
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('set-user-data', key, value);
    
    // Check that the method returns the value from ipcRenderer.invoke
    expect(result).toBe(true);
  });

  test('clearUserData method invokes the correct IPC channel', async () => {
    // Mock the ipcRenderer.invoke to return a success value
    ipcRenderer.invoke.mockResolvedValue(true);
    
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Call the clearUserData method
    const key = 'userData';
    const result = await exposedAPI.clearUserData(key);
    
    // Check that ipcRenderer.invoke was called with the correct channel and arguments
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('clear-user-data', key);
    
    // Check that the method returns the value from ipcRenderer.invoke
    expect(result).toBe(true);
  });

  test('getAppVersion method invokes the correct IPC channel', async () => {
    // Mock the ipcRenderer.invoke to return a version string
    ipcRenderer.invoke.mockResolvedValue('1.0.0');
    
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Call the getAppVersion method
    const result = await exposedAPI.getAppVersion();
    
    // Check that ipcRenderer.invoke was called with the correct channel
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('get-app-version');
    
    // Check that the method returns the value from ipcRenderer.invoke
    expect(result).toBe('1.0.0');
  });

  test('checkForUpdates method invokes the correct IPC channel', async () => {
    // Mock the ipcRenderer.invoke to return a success value
    ipcRenderer.invoke.mockResolvedValue(true);
    
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Call the checkForUpdates method
    const result = await exposedAPI.checkForUpdates();
    
    // Check that ipcRenderer.invoke was called with the correct channel
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('check-for-updates');
    
    // Check that the method returns the value from ipcRenderer.invoke
    expect(result).toBe(true);
  });

  test('quitApp method sends the correct IPC message', () => {
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Call the quitApp method
    exposedAPI.quitApp();
    
    // Check that ipcRenderer.send was called with the correct channel
    expect(ipcRenderer.send).toHaveBeenCalledWith('app-quit');
  });

  test('openExternalLink method sends the correct IPC message', () => {
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Call the openExternalLink method
    const url = 'https://example.com';
    exposedAPI.openExternalLink(url);
    
    // Check that ipcRenderer.send was called with the correct channel and arguments
    expect(ipcRenderer.send).toHaveBeenCalledWith('open-external-link', url);
  });

  test('onUpdateAvailable sets up and removes event listeners correctly', () => {
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Create a mock callback function
    const callback = jest.fn();
    
    // Call the onUpdateAvailable method to add the listener
    exposedAPI.onUpdateAvailable(callback);
    
    // Check that ipcRenderer.on was called with the correct channel and a function
    expect(ipcRenderer.on).toHaveBeenCalledWith(
      'update-available',
      expect.any(Function)
    );
    
    // Get the listener function that was registered
    const listener = ipcRenderer.on.mock.calls[0][1];
    
    // Simulate an update-available event
    const updateInfo = { version: '1.1.0' };
    listener({}, updateInfo);
    
    // Check that the callback was called with the update info
    expect(callback).toHaveBeenCalledWith(updateInfo);
    
    // Call the returned function to remove the listener
    const removeListener = exposedAPI.onUpdateAvailable(callback);
    removeListener();
    
    // Check that ipcRenderer.removeListener was called with the correct channel and listener
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'update-available',
      listener
    );
  });

  test('onUpdateDownloaded sets up and removes event listeners correctly', () => {
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Create a mock callback function
    const callback = jest.fn();
    
    // Call the onUpdateDownloaded method to add the listener
    exposedAPI.onUpdateDownloaded(callback);
    
    // Check that ipcRenderer.on was called with the correct channel and a function
    expect(ipcRenderer.on).toHaveBeenCalledWith(
      'update-downloaded',
      expect.any(Function)
    );
    
    // Get the listener function that was registered
    const listener = ipcRenderer.on.mock.calls[0][1];
    
    // Simulate an update-downloaded event
    const updateInfo = { version: '1.1.0', releaseNotes: 'Bug fixes' };
    listener({}, updateInfo);
    
    // Check that the callback was called with the update info
    expect(callback).toHaveBeenCalledWith(updateInfo);
    
    // Call the returned function to remove the listener
    const removeListener = exposedAPI.onUpdateDownloaded(callback);
    removeListener();
    
    // Check that ipcRenderer.removeListener was called with the correct channel and listener
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'update-downloaded',
      listener
    );
  });

  test('onUserDataChanged sets up and removes event listeners correctly', () => {
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Create a mock callback function
    const callback = jest.fn();
    
    // Call the onUserDataChanged method to add the listener
    exposedAPI.onUserDataChanged(callback);
    
    // Check that ipcRenderer.on was called with the correct channel and a function
    expect(ipcRenderer.on).toHaveBeenCalledWith(
      'user-data-changed',
      expect.any(Function)
    );
    
    // Get the listener function that was registered
    const listener = ipcRenderer.on.mock.calls[0][1];
    
    // Simulate a user-data-changed event
    const key = 'userData';
    const newData = { name: 'Updated User', preferences: { theme: 'light' } };
    listener({}, key, newData);
    
    // Check that the callback was called with the key and new data
    expect(callback).toHaveBeenCalledWith(key, newData);
    
    // Call the returned function to remove the listener
    const removeListener = exposedAPI.onUserDataChanged(callback);
    removeListener();
    
    // Check that ipcRenderer.removeListener was called with the correct channel and listener
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'user-data-changed',
      listener
    );
  });

  test('handles errors in API methods gracefully', async () => {
    // Mock the ipcRenderer.invoke to throw an error
    const error = new Error('Test error');
    ipcRenderer.invoke.mockRejectedValue(error);
    
    // Import the preload script
    require('../preload');
    
    // Get the API object that was exposed
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    
    // Call the getUserData method and expect it to handle the error
    await expect(exposedAPI.getUserData('userData')).rejects.toThrow('Test error');
    
    // Check that console.error was called
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    try {
      await exposedAPI.getUserData('userData');
    } catch (e) {
      // Expected error
    }
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});