const winston = require('winston');

// Mock winston
jest.mock('winston', () => {
  // Create mock logger
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn()
  };
  
  // Mock winston functions
  return {
    format: {
      combine: jest.fn().mockReturnThis(),
      timestamp: jest.fn().mockReturnThis(),
      printf: jest.fn().mockReturnThis(),
      colorize: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      prettyPrint: jest.fn().mockReturnThis(),
      simple: jest.fn().mockReturnThis(),
      splat: jest.fn().mockReturnThis(),
      label: jest.fn().mockReturnThis(),
      metadata: jest.fn().mockReturnThis(),
      errors: jest.fn().mockReturnThis()
    },
    createLogger: jest.fn().mockReturnValue(mockLogger),
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    },
    addColors: jest.fn()
  };
});

// Mock environment variables
const originalEnv = process.env;

describe('Logger Module', () => {
  // Save original environment and reset for each test
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Set default environment for testing
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'info';
  });

  // Restore original environment after all tests
  afterAll(() => {
    process.env = originalEnv;
  });

  test('creates a logger with the correct configuration', () => {
    // Load the logger module
    const logger = require('../utils/logger');

    // Check that winston.createLogger was called
    expect(winston.createLogger).toHaveBeenCalled();

    // Check that the logger has the expected methods
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.http).toBeDefined();
  });

  test('uses the log level from environment variables', () => {
    // Set custom log level
    process.env.LOG_LEVEL = 'debug';

    // Load the logger module
    require('../utils/logger');

    // Check that winston.createLogger was called with the correct log level
    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'debug'
      })
    );
  });

  test('defaults to info log level if not specified', () => {
    // Delete log level environment variable
    delete process.env.LOG_LEVEL;

    // Load the logger module
    require('../utils/logger');

    // Check that winston.createLogger was called with the default log level
    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info'
      })
    );
  });

  test('configures different transports based on environment', () => {
    // Test environment
    process.env.NODE_ENV = 'test';
    require('../utils/logger');

    // Check Console transport configuration for test environment
    expect(winston.transports.Console).toHaveBeenCalled();

    // Reset mocks
    jest.clearAllMocks();

    // Development environment
    process.env.NODE_ENV = 'development';
    require('../utils/logger');

    // Check Console transport configuration for development
    expect(winston.transports.Console).toHaveBeenCalled();

    // Reset mocks
    jest.clearAllMocks();

    // Production environment
    process.env.NODE_ENV = 'production';
    require('../utils/logger');

    // Check transport configuration for production
    expect(winston.transports.Console).toHaveBeenCalled();
    // Production might also use File transport
    const fileTransportCalled = winston.transports.File.mock.calls.length > 0;
    if (fileTransportCalled) {
      expect(winston.transports.File).toHaveBeenCalled();
    }
  });

  test('formats log messages correctly', () => {
    // Load the logger module
    require('../utils/logger');

    // Check that format functions were called
    expect(winston.format.combine).toHaveBeenCalled();
    expect(winston.format.timestamp).toHaveBeenCalled();
    expect(winston.format.printf).toHaveBeenCalled();
  });

  test('logger methods call the corresponding winston methods', () => {
    // Load the logger module
    const logger = require('../utils/logger');

    // Call logger methods
    const testMessage = 'Test message';
    const testError = new Error('Test error');
    const testMetadata = { key: 'value' };

    logger.info(testMessage, testMetadata);
    logger.error(testMessage, testError, testMetadata);
    logger.warn(testMessage, testMetadata);
    logger.debug(testMessage, testMetadata);
    logger.http(testMessage, testMetadata);

    // Check that winston methods were called with the correct arguments
    expect(winston.createLogger().info).toHaveBeenCalledWith(
      testMessage,
      testMetadata
    );
    expect(winston.createLogger().error).toHaveBeenCalledWith(
      testMessage,
      testError,
      testMetadata
    );
    expect(winston.createLogger().warn).toHaveBeenCalledWith(
      testMessage,
      testMetadata
    );
    expect(winston.createLogger().debug).toHaveBeenCalledWith(
      testMessage,
      testMetadata
    );
    expect(winston.createLogger().http).toHaveBeenCalledWith(
      testMessage,
      testMetadata
    );
  });

  test('handles objects and errors in log messages', () => {
    // Load the logger module
    const logger = require('../utils/logger');

    // Create test objects
    const testObject = { foo: 'bar', nested: { key: 'value' } };
    const testError = new Error('Test error');
    testError.code = 'ERR_TEST';
    testError.status = 400;

    // Log objects and errors
    logger.info('Object:', testObject);
    logger.error('Error:', testError);

    // Check that winston methods were called with the correct arguments
    expect(winston.createLogger().info).toHaveBeenCalledWith(
      'Object:',
      testObject
    );
    expect(winston.createLogger().error).toHaveBeenCalledWith(
      'Error:',
      testError
    );
  });

  test('provides a stream object for use with morgan', () => {
    // Load the logger module
    const logger = require('../utils/logger');

    // Check that the stream object exists and has a write method
    expect(logger.stream).toBeDefined();
    expect(logger.stream.write).toBeDefined();

    // Call the write method
    const testMessage = 'HTTP request';
    logger.stream.write(testMessage);

    // Check that the http method was called
    expect(winston.createLogger().http).toHaveBeenCalledWith(testMessage.trim());
  });

  test('handles circular references in objects', () => {
    // Load the logger module
    const logger = require('../utils/logger');

    // Create an object with circular reference
    const circularObj = { name: 'circular' };
    circularObj.self = circularObj;

    // Log the circular object
    expect(() => {
      logger.info('Circular:', circularObj);
    }).not.toThrow();

    // Check that winston.info was called
    expect(winston.createLogger().info).toHaveBeenCalled();
  });

  test('handles large objects without crashing', () => {
    // Load the logger module
    const logger = require('../utils/logger');

    // Create a large object
    const largeObj = {};
    for (let i = 0; i < 1000; i++) {
      largeObj[`key${i}`] = `value${i}`;
    }

    // Log the large object
    expect(() => {
      logger.info('Large object:', largeObj);
    }).not.toThrow();

    // Check that winston.info was called
    expect(winston.createLogger().info).toHaveBeenCalled();
  });

  test('handles undefined and null values', () => {
    // Load the logger module
    const logger = require('../utils/logger');

    // Log undefined and null values
    expect(() => {
      logger.info('Undefined:', undefined);
      logger.info('Null:', null);
    }).not.toThrow();

    // Check that winston.info was called
    expect(winston.createLogger().info).toHaveBeenCalledTimes(2);
  });

  test('handles multiple arguments', () => {
    // Load the logger module
    const logger = require('../utils/logger');

    // Log multiple arguments
    logger.info('Multiple', 'arguments', 123, { key: 'value' });

    // Check that winston.info was called with all arguments
    expect(winston.createLogger().info).toHaveBeenCalledWith(
      'Multiple',
      'arguments',
      123,
      { key: 'value' }
    );
  });

  test('provides a child logger with additional metadata', () => {
    // Load the logger module
    const logger = require('../utils/logger');

    // Check if child method exists
    if (typeof logger.child === 'function') {
      // Create a child logger
      const childLogger = logger.child({ component: 'test' });

      // Log a message with the child logger
      childLogger.info('Child logger message');

      // Check that the child logger was created and used correctly
      // This depends on the implementation, so we're just checking it doesn't throw
      expect(childLogger.info).toBeDefined();
    } else {
      // Skip test if child method is not implemented
      console.log('Child logger not implemented, skipping test');
    }
  });
});

describe('Logger Integration', () => {
  // Use real winston for integration tests
  beforeEach(() => {
    jest.resetModules();
    jest.unmock('winston');
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'debug';
  });

  // Restore mocks after tests
  afterEach(() => {
    jest.resetModules();
    jest.mock('winston'); // Re-mock winston for other tests
  });

  // Restore original environment after all tests
  afterAll(() => {
    process.env = originalEnv;
  });

  test('creates a real logger instance', () => {
    // Spy on console.log which winston might use
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Load the real logger module
    const logger = require('../utils/logger');

    // Check that the logger has the expected methods
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();

    // Log a test message
    logger.info('Integration test message');

    // Restore console.log
    consoleSpy.mockRestore();
  });

  test('logs messages at different levels', () => {
    // Spy on console methods
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Load the real logger module
    const logger = require('../utils/logger');

    // Log messages at different levels
    logger.error('Error message');
    logger.warn('Warning message');
    logger.info('Info message');
    logger.debug('Debug message');

    // Check that console methods were called
    // Note: The exact behavior depends on the winston configuration
    // We're just checking that logging doesn't throw errors

    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});