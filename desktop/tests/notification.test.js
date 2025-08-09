const { Notification } = require('electron');
const path = require('path');
const notificationManager = require('../src/notification');
const settings = require('../src/settings');

// Mock electron's Notification
jest.mock('electron', () => ({
  Notification: jest.fn().mockImplementation(() => ({
    show: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    close: jest.fn()
  }))
}));

// Mock settings module
jest.mock('../src/settings', () => ({
  init: jest.fn(),
  getSetting: jest.fn(),
  setSetting: jest.fn()
}));

describe('Notification Manager', () => {
  let mockNotification;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup default settings mock
    settings.getSetting.mockImplementation((key, defaultValue) => {
      if (key === 'notifications') return true;
      return defaultValue;
    });
    
    // Create a reference to the mocked notification instance
    mockNotification = {
      show: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn()
    };
    
    // Make the Notification constructor return our mock
    Notification.mockImplementation(() => mockNotification);
    
    // Initialize notification manager
    notificationManager.init();
  });
  
  test('init sets up notification manager correctly', () => {
    expect(notificationManager.isInitialized()).toBe(true);
  });
  
  test('showNotification creates and shows a notification with correct properties', () => {
    const title = 'Test Title';
    const body = 'Test Body';
    const onClick = jest.fn();
    
    notificationManager.showNotification({
      title,
      body,
      onClick
    });
    
    // Check that Notification was constructed with correct options
    expect(Notification).toHaveBeenCalledWith({
      title,
      body,
      icon: expect.any(String), // Should be a path to an icon
      silent: false
    });
    
    // Check that show was called
    expect(mockNotification.show).toHaveBeenCalled();
    
    // Check that click handler was set up
    expect(mockNotification.on).toHaveBeenCalledWith('click', expect.any(Function));
    
    // Simulate click and check that onClick callback was called
    const clickHandler = mockNotification.on.mock.calls.find(call => call[0] === 'click')[1];
    clickHandler();
    expect(onClick).toHaveBeenCalled();
  });
  
  test('showNotification respects notification settings', () => {
    // Mock notifications setting to be disabled
    settings.getSetting.mockImplementation((key) => {
      if (key === 'notifications') return false;
      return true;
    });
    
    notificationManager.showNotification({
      title: 'Test Title',
      body: 'Test Body'
    });
    
    // Notification should not be created when disabled
    expect(Notification).not.toHaveBeenCalled();
    
    // Re-enable notifications
    settings.getSetting.mockImplementation((key) => {
      if (key === 'notifications') return true;
      return true;
    });
    
    notificationManager.showNotification({
      title: 'Test Title',
      body: 'Test Body'
    });
    
    // Now notification should be created
    expect(Notification).toHaveBeenCalled();
  });
  
  test('showNotification handles missing optional parameters', () => {
    // Call with only required parameters
    notificationManager.showNotification({
      title: 'Test Title',
      body: 'Test Body'
    });
    
    // Should still create notification
    expect(Notification).toHaveBeenCalled();
    expect(mockNotification.show).toHaveBeenCalled();
    
    // Click handler should be set up but do nothing
    expect(mockNotification.on).toHaveBeenCalledWith('click', expect.any(Function));
    
    // Simulate click - should not error
    const clickHandler = mockNotification.on.mock.calls.find(call => call[0] === 'click')[1];
    expect(() => clickHandler()).not.toThrow();
  });
  
  test('showNotification sets up close handler', () => {
    const onClose = jest.fn();
    
    notificationManager.showNotification({
      title: 'Test Title',
      body: 'Test Body',
      onClose
    });
    
    // Check that close handler was set up
    expect(mockNotification.on).toHaveBeenCalledWith('close', expect.any(Function));
    
    // Simulate close and check that onClose callback was called
    const closeHandler = mockNotification.on.mock.calls.find(call => call[0] === 'close')[1];
    closeHandler();
    expect(onClose).toHaveBeenCalled();
  });
  
  test('showNotification handles silent option', () => {
    // Test with silent: true
    notificationManager.showNotification({
      title: 'Silent Notification',
      body: 'This should be silent',
      silent: true
    });
    
    expect(Notification).toHaveBeenCalledWith(expect.objectContaining({
      silent: true
    }));
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Test with silent: false
    notificationManager.showNotification({
      title: 'Non-silent Notification',
      body: 'This should make sound',
      silent: false
    });
    
    expect(Notification).toHaveBeenCalledWith(expect.objectContaining({
      silent: false
    }));
  });
  
  test('showNotification handles custom icon', () => {
    const customIcon = path.join(__dirname, 'custom-icon.png');
    
    notificationManager.showNotification({
      title: 'Custom Icon Notification',
      body: 'This has a custom icon',
      icon: customIcon
    });
    
    expect(Notification).toHaveBeenCalledWith(expect.objectContaining({
      icon: customIcon
    }));
  });
  
  test('closeNotification closes the notification', () => {
    // Show a notification first
    const notification = notificationManager.showNotification({
      title: 'Test Title',
      body: 'Test Body'
    });
    
    // Close it
    notificationManager.closeNotification(notification);
    
    // Check that close was called
    expect(mockNotification.close).toHaveBeenCalled();
    expect(mockNotification.removeAllListeners).toHaveBeenCalled();
  });
  
  test('closeAllNotifications closes all active notifications', () => {
    // Show multiple notifications
    const notification1 = notificationManager.showNotification({
      title: 'Notification 1',
      body: 'Body 1'
    });
    
    const notification2 = notificationManager.showNotification({
      title: 'Notification 2',
      body: 'Body 2'
    });
    
    // Reset mock to track new calls
    mockNotification.close.mockClear();
    mockNotification.removeAllListeners.mockClear();
    
    // Close all notifications
    notificationManager.closeAllNotifications();
    
    // Should have called close twice (once for each notification)
    expect(mockNotification.close).toHaveBeenCalledTimes(2);
    expect(mockNotification.removeAllListeners).toHaveBeenCalledTimes(2);
  });
  
  test('showQuoteNotification creates a notification with quote content', () => {
    const quote = {
      text: 'This is a test quote',
      author: 'Test Author'
    };
    
    notificationManager.showQuoteNotification(quote);
    
    // Check that Notification was constructed with quote content
    expect(Notification).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Daily Inspiration',
      body: `"${quote.text}" - ${quote.author}`
    }));
  });
  
  test('showUpdateNotification creates a notification about updates', () => {
    const updateInfo = {
      version: '1.2.0',
      releaseNotes: 'Bug fixes and improvements'
    };
    
    notificationManager.showUpdateNotification(updateInfo);
    
    // Check that Notification was constructed with update info
    expect(Notification).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Update Available',
      body: expect.stringContaining('1.2.0')
    }));
  });
  
  test('setNotificationsEnabled updates notification settings', () => {
    // Enable notifications
    notificationManager.setNotificationsEnabled(true);
    expect(settings.setSetting).toHaveBeenCalledWith('notifications', true);
    
    // Disable notifications
    notificationManager.setNotificationsEnabled(false);
    expect(settings.setSetting).toHaveBeenCalledWith('notifications', false);
  });
  
  test('areNotificationsEnabled returns current notification setting', () => {
    // Mock notifications setting to be enabled
    settings.getSetting.mockImplementation((key) => {
      if (key === 'notifications') return true;
      return false;
    });
    
    expect(notificationManager.areNotificationsEnabled()).toBe(true);
    
    // Mock notifications setting to be disabled
    settings.getSetting.mockImplementation((key) => {
      if (key === 'notifications') return false;
      return true;
    });
    
    expect(notificationManager.areNotificationsEnabled()).toBe(false);
  });
  
  test('showReminderNotification creates a notification with reminder message', () => {
    notificationManager.showReminderNotification('Time to take a break!');
    
    // Check that Notification was constructed with reminder message
    expect(Notification).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Reminder',
      body: 'Time to take a break!'
    }));
  });
  
  test('showErrorNotification creates a notification with error message', () => {
    const error = new Error('Something went wrong');
    
    notificationManager.showErrorNotification('Operation Failed', error);
    
    // Check that Notification was constructed with error message
    expect(Notification).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Operation Failed',
      body: 'Something went wrong'
    }));
  });
  
  test('scheduleNotification sets up a timeout for delayed notification', () => {
    // Mock setTimeout
    jest.useFakeTimers();
    
    const notificationOptions = {
      title: 'Scheduled Notification',
      body: 'This should appear after delay'
    };
    
    notificationManager.scheduleNotification(notificationOptions, 5000);
    
    // Notification should not be shown immediately
    expect(Notification).not.toHaveBeenCalled();
    
    // Fast-forward time
    jest.advanceTimersByTime(5000);
    
    // Now notification should be shown
    expect(Notification).toHaveBeenCalledWith(expect.objectContaining(notificationOptions));
    
    // Restore real timers
    jest.useRealTimers();
  });
  
  test('cancelScheduledNotification cancels a scheduled notification', () => {
    // Mock setTimeout and clearTimeout
    jest.useFakeTimers();
    
    const notificationOptions = {
      title: 'Scheduled Notification',
      body: 'This should be cancelled'
    };
    
    // Schedule a notification
    const scheduledId = notificationManager.scheduleNotification(notificationOptions, 5000);
    
    // Cancel it
    notificationManager.cancelScheduledNotification(scheduledId);
    
    // Fast-forward time
    jest.advanceTimersByTime(5000);
    
    // Notification should not be shown
    expect(Notification).not.toHaveBeenCalled();
    
    // Restore real timers
    jest.useRealTimers();
  });
});