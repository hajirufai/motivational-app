const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const database = require('../config/database');

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.NODE_ENV = 'test';

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  connection: {
    on: jest.fn(),
    once: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined)
  },
  set: jest.fn()
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const logger = require('../utils/logger');

describe('Database Configuration', () => {
  let mongoServer;
  
  beforeAll(async () => {
    // Create a MongoDB Memory Server for testing
    mongoServer = await MongoMemoryServer.create();
  });
  
  afterAll(async () => {
    await mongoServer.stop();
  });
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  test('connect initializes database connection with correct options', async () => {
    await database.connect();
    
    // Check that mongoose.connect was called with correct URI
    expect(mongoose.connect).toHaveBeenCalledWith(
      process.env.MONGODB_URI,
      expect.objectContaining({
        useNewUrlParser: true,
        useUnifiedTopology: true
      })
    );
    
    // Check that mongoose configuration was set
    expect(mongoose.set).toHaveBeenCalled();
    
    // Check that event listeners were set up
    expect(mongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mongoose.connection.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    expect(mongoose.connection.once).toHaveBeenCalledWith('open', expect.any(Function));
    
    // Check that success was logged
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Connected to MongoDB'));
  });
  
  test('connect handles connection errors', async () => {
    // Mock mongoose.connect to reject
    mongoose.connect.mockRejectedValueOnce(new Error('Connection failed'));
    
    // Should throw error
    await expect(database.connect()).rejects.toThrow('Connection failed');
    
    // Check that error was logged
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error connecting to MongoDB'),
      expect.any(Error)
    );
  });
  
  test('disconnect closes the database connection', async () => {
    await database.disconnect();
    
    // Check that mongoose.connection.close was called
    expect(mongoose.connection.close).toHaveBeenCalled();
    
    // Check that success was logged
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Disconnected from MongoDB'));
  });
  
  test('disconnect handles errors', async () => {
    // Mock mongoose.connection.close to reject
    mongoose.connection.close.mockRejectedValueOnce(new Error('Disconnect failed'));
    
    // Should throw error
    await expect(database.disconnect()).rejects.toThrow('Disconnect failed');
    
    // Check that error was logged
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error disconnecting from MongoDB'),
      expect.any(Error)
    );
  });
  
  test('error event handler logs connection errors', () => {
    // Get the error handler
    const errorHandler = mongoose.connection.on.mock.calls.find(
      call => call[0] === 'error'
    )[1];
    
    // Simulate error event
    const testError = new Error('Connection error');
    errorHandler(testError);
    
    // Check that error was logged
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('MongoDB connection error'),
      testError
    );
  });
  
  test('disconnected event handler logs disconnection', () => {
    // Get the disconnected handler
    const disconnectedHandler = mongoose.connection.on.mock.calls.find(
      call => call[0] === 'disconnected'
    )[1];
    
    // Simulate disconnected event
    disconnectedHandler();
    
    // Check that disconnection was logged
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('MongoDB disconnected'));
  });
  
  test('open event handler logs successful connection', () => {
    // Get the open handler
    const openHandler = mongoose.connection.once.mock.calls.find(
      call => call[0] === 'open'
    )[1];
    
    // Simulate open event
    openHandler();
    
    // Check that connection was logged
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('MongoDB connection opened'));
  });
  
  test('getConnectionString returns correct URI based on environment', () => {
    // Test environment
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    expect(database.getConnectionString()).toBe('mongodb://localhost:27017/test');
    
    // Development environment
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/dev';
    expect(database.getConnectionString()).toBe('mongodb://localhost:27017/dev');
    
    // Production environment
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb://user:pass@host:port/prod';
    expect(database.getConnectionString()).toBe('mongodb://user:pass@host:port/prod');
  });
  
  test('getConnectionString falls back to default URI if not specified', () => {
    // Delete environment variable
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    
    // Should use default URI
    expect(database.getConnectionString()).toBe('mongodb://localhost:27017/motivational-app');
    
    // Restore environment variable
    process.env.MONGODB_URI = originalUri;
  });
  
  test('getConnectionOptions returns correct options based on environment', () => {
    // Test environment
    process.env.NODE_ENV = 'test';
    const testOptions = database.getConnectionOptions();
    expect(testOptions).toEqual(expect.objectContaining({
      useNewUrlParser: true,
      useUnifiedTopology: true
    }));
    
    // Development environment
    process.env.NODE_ENV = 'development';
    const devOptions = database.getConnectionOptions();
    expect(devOptions).toEqual(expect.objectContaining({
      useNewUrlParser: true,
      useUnifiedTopology: true
    }));
    
    // Production environment
    process.env.NODE_ENV = 'production';
    const prodOptions = database.getConnectionOptions();
    expect(prodOptions).toEqual(expect.objectContaining({
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Production should have additional options
      serverSelectionTimeoutMS: expect.any(Number),
      socketTimeoutMS: expect.any(Number),
      keepAlive: true
    }));
  });
  
  test('isConnected returns connection status', () => {
    // Mock connection readyState
    mongoose.connection.readyState = 1; // Connected
    expect(database.isConnected()).toBe(true);
    
    mongoose.connection.readyState = 0; // Disconnected
    expect(database.isConnected()).toBe(false);
    
    mongoose.connection.readyState = 2; // Connecting
    expect(database.isConnected()).toBe(false);
    
    mongoose.connection.readyState = 3; // Disconnecting
    expect(database.isConnected()).toBe(false);
  });
  
  test('getMongooseInstance returns mongoose instance', () => {
    expect(database.getMongooseInstance()).toBe(mongoose);
  });
  
  test('reconnect attempts to reconnect after failure', async () => {
    // Mock first connect to fail, then succeed
    mongoose.connect
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce(undefined);
    
    // Call reconnect
    await database.reconnect();
    
    // Should have called connect twice
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
    
    // Should have logged reconnection attempt
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Attempting to reconnect'));
    
    // Should have logged success
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Reconnected to MongoDB'));
  });
  
  test('reconnect gives up after max retries', async () => {
    // Mock connect to always fail
    mongoose.connect.mockRejectedValue(new Error('Connection failed'));
    
    // Should throw error after max retries
    await expect(database.reconnect(3)).rejects.toThrow('Failed to reconnect after 3 attempts');
    
    // Should have called connect 3 times
    expect(mongoose.connect).toHaveBeenCalledTimes(3);
    
    // Should have logged max retries reached
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Max reconnection attempts reached'));
  });
  
  test('healthCheck returns connection status', async () => {
    // Mock connection readyState
    mongoose.connection.readyState = 1; // Connected
    
    const result = await database.healthCheck();
    expect(result).toEqual({
      status: 'connected',
      database: 'MongoDB',
      healthy: true
    });
    
    // Test disconnected state
    mongoose.connection.readyState = 0; // Disconnected
    
    const disconnectedResult = await database.healthCheck();
    expect(disconnectedResult).toEqual({
      status: 'disconnected',
      database: 'MongoDB',
      healthy: false
    });
  });
});

describe('Database Integration', () => {
  let mongoServer;
  let realMongoose;
  
  beforeAll(async () => {
    // Save the real mongoose
    realMongoose = jest.requireActual('mongoose');
    
    // Restore the real mongoose for integration tests
    jest.unmock('mongoose');
    const mongoose = jest.requireActual('mongoose');
    
    // Create a MongoDB Memory Server for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Override environment variable
    process.env.MONGODB_URI = mongoUri;
  });
  
  afterAll(async () => {
    // Disconnect from the in-memory database
    await mongoose.disconnect();
    
    // Stop the MongoDB Memory Server
    await mongoServer.stop();
    
    // Restore mocks
    jest.resetModules();
  });
  
  test('connect establishes a real connection to MongoDB', async () => {
    // Get a fresh instance of the database module
    jest.resetModules();
    const database = require('../config/database');
    
    // Connect to the database
    await database.connect();
    
    // Check connection status
    expect(database.isConnected()).toBe(true);
    
    // Disconnect
    await database.disconnect();
  });
  
  test('can perform basic database operations', async () => {
    // Get a fresh instance of the database module
    jest.resetModules();
    const database = require('../config/database');
    
    // Connect to the database
    await database.connect();
    
    // Create a simple model
    const TestModel = mongoose.model('Test', new mongoose.Schema({
      name: String,
      value: Number
    }));
    
    // Create a document
    const testDoc = new TestModel({ name: 'test', value: 42 });
    await testDoc.save();
    
    // Find the document
    const foundDoc = await TestModel.findOne({ name: 'test' });
    expect(foundDoc).toBeDefined();
    expect(foundDoc.name).toBe('test');
    expect(foundDoc.value).toBe(42);
    
    // Update the document
    foundDoc.value = 100;
    await foundDoc.save();
    
    // Find the updated document
    const updatedDoc = await TestModel.findOne({ name: 'test' });
    expect(updatedDoc.value).toBe(100);
    
    // Delete the document
    await TestModel.deleteOne({ name: 'test' });
    
    // Verify deletion
    const deletedDoc = await TestModel.findOne({ name: 'test' });
    expect(deletedDoc).toBeNull();
    
    // Disconnect
    await database.disconnect();
  });
  
  test('reconnect works with real connection', async () => {
    // Get a fresh instance of the database module
    jest.resetModules();
    const database = require('../config/database');
    
    // Connect to the database
    await database.connect();
    
    // Force disconnect
    await database.disconnect();
    
    // Reconnect
    await database.reconnect();
    
    // Check connection status
    expect(database.isConnected()).toBe(true);
    
    // Disconnect
    await database.disconnect();
  });
});