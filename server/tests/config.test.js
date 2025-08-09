const path = require('path');
const fs = require('fs');

// Mock environment variables
const originalEnv = process.env;

describe('Configuration Module', () => {
  // Save original environment and reset for each test
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Set some default environment variables for testing
    process.env.NODE_ENV = 'test';
  });

  // Restore original environment after all tests
  afterAll(() => {
    process.env = originalEnv;
  });

  test('loads default configuration values', () => {
    // Load the config module
    const config = require('../config');

    // Check default values
    expect(config.env).toBe('test');
    expect(config.port).toBeDefined();
    expect(config.logLevel).toBeDefined();
    expect(config.mongodb).toBeDefined();
    expect(config.jwt).toBeDefined();
    expect(config.cors).toBeDefined();
  });

  test('loads environment-specific configuration', () => {
    // Set environment to development
    process.env.NODE_ENV = 'development';

    // Load the config module
    const config = require('../config');

    // Check development-specific values
    expect(config.env).toBe('development');
    expect(config.logLevel).toBe('debug'); // Assuming debug level for development

    // Reset modules
    jest.resetModules();

    // Set environment to production
    process.env.NODE_ENV = 'production';

    // Load the config module again
    const prodConfig = require('../config');

    // Check production-specific values
    expect(prodConfig.env).toBe('production');
    expect(prodConfig.logLevel).toBe('info'); // Assuming info level for production
  });

  test('environment variables override default configuration', () => {
    // Set custom environment variables
    process.env.PORT = '5000';
    process.env.LOG_LEVEL = 'warn';
    process.env.MONGODB_URI = 'mongodb://custom:27017/test';
    process.env.JWT_SECRET = 'custom-secret';
    process.env.JWT_EXPIRATION = '2d';

    // Load the config module
    const config = require('../config');

    // Check that environment variables override defaults
    expect(config.port).toBe(5000);
    expect(config.logLevel).toBe('warn');
    expect(config.mongodb.uri).toBe('mongodb://custom:27017/test');
    expect(config.jwt.secret).toBe('custom-secret');
    expect(config.jwt.expiration).toBe('2d');
  });

  test('handles missing environment variables gracefully', () => {
    // Delete required environment variables
    delete process.env.PORT;
    delete process.env.MONGODB_URI;
    delete process.env.JWT_SECRET;

    // Load the config module
    const config = require('../config');

    // Check that defaults are used
    expect(config.port).toBeDefined();
    expect(config.mongodb.uri).toBeDefined();
    expect(config.jwt.secret).toBeDefined();
  });

  test('validates configuration values', () => {
    // Set invalid environment variables
    process.env.PORT = 'not-a-number';

    // Loading the config should throw or use default
    let config;
    expect(() => {
      config = require('../config');
    }).not.toThrow();

    // Should use default port or convert to number
    expect(typeof config.port).toBe('number');
  });

  test('loads configuration from file if present', () => {
    // Mock fs.existsSync to return true
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    // Mock fs.readFileSync to return a JSON string
    const mockConfig = {
      port: 4000,
      logLevel: 'silent',
      mongodb: {
        uri: 'mongodb://file-config:27017/test'
      }
    };
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));

    // Load the config module
    const config = require('../config');

    // Check that file config is used
    expect(config.port).toBe(4000);
    expect(config.logLevel).toBe('silent');
    expect(config.mongodb.uri).toBe('mongodb://file-config:27017/test');

    // Restore fs mocks
    fs.existsSync.mockRestore();
    fs.readFileSync.mockRestore();
  });

  test('environment variables take precedence over file configuration', () => {
    // Mock fs.existsSync to return true
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    // Mock fs.readFileSync to return a JSON string
    const mockConfig = {
      port: 4000,
      logLevel: 'silent'
    };
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));

    // Set environment variables
    process.env.PORT = '5000';

    // Load the config module
    const config = require('../config');

    // Check that environment variables override file config
    expect(config.port).toBe(5000);
    expect(config.logLevel).toBe('silent');

    // Restore fs mocks
    fs.existsSync.mockRestore();
    fs.readFileSync.mockRestore();
  });

  test('handles invalid configuration file gracefully', () => {
    // Mock fs.existsSync to return true
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    // Mock fs.readFileSync to return invalid JSON
    jest.spyOn(fs, 'readFileSync').mockReturnValue('not-valid-json');

    // Mock console.error to avoid test output pollution
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Load the config module
    let config;
    expect(() => {
      config = require('../config');
    }).not.toThrow();

    // Should use default configuration
    expect(config).toBeDefined();

    // Should have logged an error
    expect(console.error).toHaveBeenCalled();

    // Restore mocks
    fs.existsSync.mockRestore();
    fs.readFileSync.mockRestore();
    console.error = originalConsoleError;
  });

  test('exports a frozen configuration object', () => {
    // Load the config module
    const config = require('../config');

    // Check that the config object is frozen
    expect(Object.isFrozen(config)).toBe(true);

    // Attempt to modify the config
    expect(() => {
      config.port = 9999;
    }).toThrow();
  });

  test('provides helper methods for accessing configuration', () => {
    // Load the config module
    const config = require('../config');

    // Check for helper methods if they exist
    if (typeof config.get === 'function') {
      expect(config.get('port')).toBe(config.port);
      expect(config.get('nonexistent', 'default')).toBe('default');
    }

    if (typeof config.has === 'function') {
      expect(config.has('port')).toBe(true);
      expect(config.has('nonexistent')).toBe(false);
    }
  });

  test('handles nested configuration properties', () => {
    // Set nested environment variables
    process.env.CORS_ORIGIN = 'https://example.com';
    process.env.CORS_METHODS = 'GET,POST';

    // Load the config module
    const config = require('../config');

    // Check nested properties
    expect(config.cors.origin).toBe('https://example.com');
    expect(config.cors.methods).toBe('GET,POST');

    // Check nested access with helper method if it exists
    if (typeof config.get === 'function') {
      expect(config.get('cors.origin')).toBe('https://example.com');
    }
  });

  test('loads different rate limit configurations based on environment', () => {
    // Test environment
    process.env.NODE_ENV = 'test';
    let config = require('../config');
    
    // Test environment should have high or no rate limits
    expect(config.rateLimit.windowMs).toBeGreaterThanOrEqual(60000); // At least 1 minute
    expect(config.rateLimit.max).toBeGreaterThanOrEqual(100); // At least 100 requests
    
    // Reset modules
    jest.resetModules();
    
    // Production environment
    process.env.NODE_ENV = 'production';
    config = require('../config');
    
    // Production should have stricter rate limits
    expect(config.rateLimit.windowMs).toBeDefined();
    expect(config.rateLimit.max).toBeDefined();
    // Production limits should be more restrictive than test
    expect(config.rateLimit.max).toBeLessThanOrEqual(100);
  });

  test('loads different security configurations based on environment', () => {
    // Test environment
    process.env.NODE_ENV = 'test';
    let config = require('../config');
    
    // Test environment might have relaxed security
    
    // Reset modules
    jest.resetModules();
    
    // Production environment
    process.env.NODE_ENV = 'production';
    config = require('../config');
    
    // Production should have strict security settings
    if (config.security) {
      expect(config.security.helmet).toBeDefined();
      expect(config.security.csrf).toBeDefined();
    }
  });

  test('loads different logging configurations based on environment', () => {
    // Test environment
    process.env.NODE_ENV = 'test';
    let config = require('../config');
    
    // Test environment might have minimal logging
    expect(config.logging).toBeDefined();
    
    // Reset modules
    jest.resetModules();
    
    // Development environment
    process.env.NODE_ENV = 'development';
    config = require('../config');
    
    // Development should have verbose logging
    expect(config.logging).toBeDefined();
    expect(config.logLevel).toBe('debug');
    
    // Reset modules
    jest.resetModules();
    
    // Production environment
    process.env.NODE_ENV = 'production';
    config = require('../config');
    
    // Production should have appropriate logging
    expect(config.logging).toBeDefined();
    expect(config.logLevel).toBe('info');
  });
});