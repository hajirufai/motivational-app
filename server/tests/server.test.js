// Mock dependencies
jest.mock('../app', () => ({
  listen: jest.fn((port, callback) => {
    callback();
    return {
      address: jest.fn(() => ({ port })),
      close: jest.fn(cb => cb && cb())
    };
  })
}));

jest.mock('../config/database', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(true)
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock process
const originalProcess = { ...process };
const mockExit = jest.fn();
const mockOn = jest.fn();

describe('Server', () => {
  let server;
  let database;
  let logger;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock process.exit and process.on
    process.exit = mockExit;
    process.on = mockOn;
    
    // Get dependencies
    database = require('../config/database');
    logger = require('../utils/logger');
    
    // Load server module
    jest.isolateModules(() => {
      server = require('../server');
    });
  });
  
  afterAll(() => {
    // Restore process
    process.exit = originalProcess.exit;
    process.on = originalProcess.on;
  });
  
  test('connects to the database on startup', () => {
    expect(database.connect).toHaveBeenCalled();
  });
  
  test('starts the HTTP server on the configured port', () => {
    expect(require('../app').listen).toHaveBeenCalled();
    expect(require('../app').listen.mock.calls[0][0]).toBeDefined();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Server running'));
  });
  
  test('registers process event handlers for graceful shutdown', () => {
    // Check that process.on was called for termination signals
    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });
  
  test('handles uncaught exceptions', () => {
    expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    
    // Get the uncaughtException handler
    const uncaughtExceptionHandler = process.on.mock.calls.find(
      call => call[0] === 'uncaughtException'
    )[1];
    
    // Simulate uncaught exception
    const error = new Error('Test uncaught exception');
    uncaughtExceptionHandler(error);
    
    // Should log the error and exit
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Uncaught Exception'), error);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  
  test('handles unhandled rejections', () => {
    expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    
    // Get the unhandledRejection handler
    const unhandledRejectionHandler = process.on.mock.calls.find(
      call => call[0] === 'unhandledRejection'
    )[1];
    
    // Simulate unhandled rejection
    const reason = new Error('Test unhandled rejection');
    const promise = Promise.reject(reason);
    unhandledRejectionHandler(reason, promise);
    
    // Should log the error
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Unhandled Rejection'), reason);
  });
  
  test('performs graceful shutdown on SIGTERM', async () => {
    // Get the SIGTERM handler
    const sigtermHandler = process.on.mock.calls.find(
      call => call[0] === 'SIGTERM'
    )[1];
    
    // Mock server.close
    const mockServer = require('../app').listen();
    
    // Simulate SIGTERM
    await sigtermHandler();
    
    // Should log shutdown, close server, and disconnect from database
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('SIGTERM received'));
    expect(mockServer.close).toHaveBeenCalled();
    expect(database.disconnect).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });
  
  test('performs graceful shutdown on SIGINT', async () => {
    // Get the SIGINT handler
    const sigintHandler = process.on.mock.calls.find(
      call => call[0] === 'SIGINT'
    )[1];
    
    // Mock server.close
    const mockServer = require('../app').listen();
    
    // Simulate SIGINT
    await sigintHandler();
    
    // Should log shutdown, close server, and disconnect from database
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('SIGINT received'));
    expect(mockServer.close).toHaveBeenCalled();
    expect(database.disconnect).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });
  
  test('handles errors during graceful shutdown', async () => {
    // Get the SIGTERM handler
    const sigtermHandler = process.on.mock.calls.find(
      call => call[0] === 'SIGTERM'
    )[1];
    
    // Mock server.close to throw error
    const mockServer = require('../app').listen();
    mockServer.close.mockImplementationOnce(cb => cb(new Error('Close error')));
    
    // Mock database.disconnect to throw error
    database.disconnect.mockRejectedValueOnce(new Error('Disconnect error'));
    
    // Simulate SIGTERM
    await sigtermHandler();
    
    // Should log errors and still exit
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error closing HTTP server'), expect.any(Error));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error disconnecting from database'), expect.any(Error));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  
  test('exports the server instance', () => {
    // Check that the server exports the HTTP server instance
    expect(server).toBeDefined();
    expect(server.close).toBeDefined();
  });
});

describe('Server Integration', () => {
  let originalExit;
  let originalEnv;
  
  beforeAll(() => {
    // Save original process.exit and environment
    originalExit = process.exit;
    originalEnv = process.env;
    
    // Mock process.exit to prevent tests from exiting
    process.exit = jest.fn();
    
    // Set test environment
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      PORT: '4000'
    };
  });
  
  afterAll(() => {
    // Restore process.exit and environment
    process.exit = originalExit;
    process.env = originalEnv;
  });
  
  test('server can be imported without starting', () => {
    // Unmock dependencies for integration test
    jest.unmock('../app');
    jest.unmock('../config/database');
    jest.unmock('../utils/logger');
    
    // This should not throw
    expect(() => {
      const server = require('../server');
      expect(server).toBeDefined();
    }).not.toThrow();
  });
});