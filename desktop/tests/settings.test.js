const { app } = require('electron');
const path = require('path');
const Store = require('electron-store');
const settings = require('../src/settings');

// Mock electron-store
jest.mock('electron-store');

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data'),
    getName: jest.fn().mockReturnValue('motivational-app'),
    getVersion: jest.fn().mockReturnValue('1.0.0')
  }
}));

describe('Settings Module', () => {
  let mockStore;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a mock implementation of Store
    mockStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      onDidChange: jest.fn(),
      store: {}
    };
    
    // Make the Store constructor return our mock
    Store.mockImplementation(() => mockStore);
  });
  
  test('initializes with correct default options', () => {
    // Initialize settings
    settings.init();
    
    // Check that Store was constructed with correct options
    expect(Store).toHaveBeenCalledWith({
      name: 'config',
      fileExtension: 'json',
      cwd: path.join('/mock/user/data', 'motivational-app')
    });
  });
  
  test('getSettings returns all settings', () => {
    // Setup mock data
    const mockSettings = {
      theme: 'dark',
      notifications: true,
      startAtLogin: false
    };
    
    // Make store.store return our mock data
    mockStore.store = mockSettings;
    
    // Initialize settings
    settings.init();
    
    // Get all settings
    const result = settings.getSettings();
    
    // Verify result
    expect(result).toEqual(mockSettings);
  });
  
  test('getSetting returns specific setting value', () => {
    // Setup mock implementation
    mockStore.get.mockImplementation((key, defaultValue) => {
      const values = {
        theme: 'dark',
        notifications: true
      };
      return values[key] !== undefined ? values[key] : defaultValue;
    });
    
    // Initialize settings
    settings.init();
    
    // Test getting existing settings
    expect(settings.getSetting('theme')).toBe('dark');
    expect(settings.getSetting('notifications')).toBe(true);
    
    // Test getting non-existent setting with default
    expect(settings.getSetting('nonexistent', 'default')).toBe('default');
    
    // Verify get was called with correct parameters
    expect(mockStore.get).toHaveBeenCalledWith('theme', undefined);
    expect(mockStore.get).toHaveBeenCalledWith('notifications', undefined);
    expect(mockStore.get).toHaveBeenCalledWith('nonexistent', 'default');
  });
  
  test('setSetting updates a specific setting', () => {
    // Initialize settings
    settings.init();
    
    // Set a setting
    settings.setSetting('theme', 'light');
    
    // Verify set was called with correct parameters
    expect(mockStore.set).toHaveBeenCalledWith('theme', 'light');
  });
  
  test('setSettings updates multiple settings at once', () => {
    // Initialize settings
    settings.init();
    
    // Set multiple settings
    const newSettings = {
      theme: 'light',
      notifications: false,
      startAtLogin: true
    };
    
    settings.setSettings(newSettings);
    
    // Verify set was called for each setting
    expect(mockStore.set).toHaveBeenCalledWith('theme', 'light');
    expect(mockStore.set).toHaveBeenCalledWith('notifications', false);
    expect(mockStore.set).toHaveBeenCalledWith('startAtLogin', true);
  });
  
  test('deleteSetting removes a specific setting', () => {
    // Initialize settings
    settings.init();
    
    // Delete a setting
    settings.deleteSetting('theme');
    
    // Verify delete was called with correct parameter
    expect(mockStore.delete).toHaveBeenCalledWith('theme');
  });
  
  test('clearSettings removes all settings', () => {
    // Initialize settings
    settings.init();
    
    // Clear all settings
    settings.clearSettings();
    
    // Verify clear was called
    expect(mockStore.clear).toHaveBeenCalled();
  });
  
  test('hasSetting checks if a setting exists', () => {
    // Setup mock implementation
    mockStore.has.mockImplementation(key => {
      const existingKeys = ['theme', 'notifications'];
      return existingKeys.includes(key);
    });
    
    // Initialize settings
    settings.init();
    
    // Test existing and non-existing settings
    expect(settings.hasSetting('theme')).toBe(true);
    expect(settings.hasSetting('nonexistent')).toBe(false);
    
    // Verify has was called with correct parameters
    expect(mockStore.has).toHaveBeenCalledWith('theme');
    expect(mockStore.has).toHaveBeenCalledWith('nonexistent');
  });
  
  test('onSettingChanged registers a change listener', () => {
    // Initialize settings
    settings.init();
    
    // Create a mock callback
    const mockCallback = jest.fn();
    
    // Register the callback
    settings.onSettingChanged('theme', mockCallback);
    
    // Verify onDidChange was called with correct parameters
    expect(mockStore.onDidChange).toHaveBeenCalledWith('theme', mockCallback);
  });
  
  test('getDefaultSettings returns expected defaults', () => {
    // Initialize settings
    settings.init();
    
    // Get default settings
    const defaults = settings.getDefaultSettings();
    
    // Verify defaults contain expected keys and values
    expect(defaults).toHaveProperty('theme');
    expect(defaults).toHaveProperty('notifications');
    expect(defaults).toHaveProperty('startAtLogin');
    expect(defaults).toHaveProperty('autoUpdate');
    
    // Check specific default values
    expect(defaults.theme).toBe('system');
    expect(defaults.notifications).toBe(true);
    expect(defaults.startAtLogin).toBe(false);
    expect(defaults.autoUpdate).toBe(true);
  });
  
  test('resetToDefaults resets all settings to defaults', () => {
    // Setup mock data
    const mockDefaults = {
      theme: 'system',
      notifications: true,
      startAtLogin: false,
      autoUpdate: true
    };
    
    // Initialize settings
    settings.init();
    
    // Mock the getDefaultSettings method
    const originalGetDefaultSettings = settings.getDefaultSettings;
    settings.getDefaultSettings = jest.fn().mockReturnValue(mockDefaults);
    
    // Reset to defaults
    settings.resetToDefaults();
    
    // Verify settings were reset to defaults
    expect(mockStore.set).toHaveBeenCalledWith('theme', 'system');
    expect(mockStore.set).toHaveBeenCalledWith('notifications', true);
    expect(mockStore.set).toHaveBeenCalledWith('startAtLogin', false);
    expect(mockStore.set).toHaveBeenCalledWith('autoUpdate', true);
    
    // Restore original method
    settings.getDefaultSettings = originalGetDefaultSettings;
  });
  
  test('migrateSettings handles version upgrades correctly', () => {
    // Setup mock data for old settings format
    const oldSettings = {
      theme: 'dark',
      enableNotifications: true, // Old format
      autoStart: true // Old format
    };
    
    mockStore.store = oldSettings;
    
    // Initialize settings
    settings.init();
    
    // Run migration
    settings.migrateSettings();
    
    // Verify settings were migrated correctly
    expect(mockStore.set).toHaveBeenCalledWith('notifications', true);
    expect(mockStore.set).toHaveBeenCalledWith('startAtLogin', true);
    expect(mockStore.delete).toHaveBeenCalledWith('enableNotifications');
    expect(mockStore.delete).toHaveBeenCalledWith('autoStart');
  });
  
  test('exportSettings returns settings in expected format', () => {
    // Setup mock data
    const mockSettings = {
      theme: 'dark',
      notifications: true,
      startAtLogin: false,
      autoUpdate: true,
      _internal: 'should not be exported' // Internal setting that should be excluded
    };
    
    mockStore.store = mockSettings;
    
    // Initialize settings
    settings.init();
    
    // Export settings
    const exported = settings.exportSettings();
    
    // Verify exported settings
    expect(exported).toHaveProperty('theme', 'dark');
    expect(exported).toHaveProperty('notifications', true);
    expect(exported).toHaveProperty('startAtLogin', false);
    expect(exported).toHaveProperty('autoUpdate', true);
    expect(exported).not.toHaveProperty('_internal');
    
    // Verify export includes metadata
    expect(exported).toHaveProperty('_meta');
    expect(exported._meta).toHaveProperty('version', '1.0.0');
    expect(exported._meta).toHaveProperty('exportDate');
  });
  
  test('importSettings correctly imports valid settings', () => {
    // Setup mock data for import
    const importData = {
      theme: 'light',
      notifications: false,
      startAtLogin: true,
      autoUpdate: false,
      _meta: {
        version: '1.0.0',
        exportDate: new Date().toISOString()
      }
    };
    
    // Initialize settings
    settings.init();
    
    // Import settings
    const result = settings.importSettings(importData);
    
    // Verify import was successful
    expect(result).toBe(true);
    
    // Verify settings were imported correctly
    expect(mockStore.set).toHaveBeenCalledWith('theme', 'light');
    expect(mockStore.set).toHaveBeenCalledWith('notifications', false);
    expect(mockStore.set).toHaveBeenCalledWith('startAtLogin', true);
    expect(mockStore.set).toHaveBeenCalledWith('autoUpdate', false);
  });
  
  test('importSettings rejects invalid settings format', () => {
    // Setup invalid import data
    const invalidData = {
      theme: 'light'
      // Missing _meta and other required fields
    };
    
    // Initialize settings
    settings.init();
    
    // Attempt to import invalid settings
    const result = settings.importSettings(invalidData);
    
    // Verify import failed
    expect(result).toBe(false);
    
    // Verify no settings were changed
    expect(mockStore.set).not.toHaveBeenCalled();
  });
});