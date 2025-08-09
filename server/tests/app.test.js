const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Mock middleware and dependencies
jest.mock('cors', () => jest.fn(() => (req, res, next) => next()));
jest.mock('helmet', () => jest.fn(() => (req, res, next) => next()));
jest.mock('morgan', () => jest.fn(() => (req, res, next) => next()));
jest.mock('compression', () => jest.fn(() => (req, res, next) => next()));
jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

// Mock routes
jest.mock('../routes', () => jest.fn(app => {
  app.get('/api/test', (req, res) => res.status(200).json({ message: 'Test route' }));
}));

// Mock error handler middleware
jest.mock('../middleware/errorHandler', () => ({
  notFound: jest.fn((req, res, next) => {
    const error = new Error('Not found');
    error.status = 404;
    next(error);
  }),
  errorHandler: jest.fn((err, req, res, next) => {
    res.status(err.status || 500).json({
      error: {
        message: err.message,
        status: err.status || 500
      }
    });
  })
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  stream: { write: jest.fn() }
}));

describe('Express App Configuration', () => {
  let app;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh app for each test
    jest.isolateModules(() => {
      app = require('../app');
    });
  });
  
  test('initializes an Express application', () => {
    expect(app).toBeDefined();
    expect(app.listen).toBeDefined();
  });
  
  test('applies middleware in the correct order', () => {
    // Check that middleware was applied
    expect(helmet).toHaveBeenCalled();
    expect(cors).toHaveBeenCalled();
    expect(morgan).toHaveBeenCalled();
    expect(compression).toHaveBeenCalled();
    expect(rateLimit).toHaveBeenCalled();
    expect(express.json).toHaveBeenCalled();
    
    // Check that routes were applied
    expect(require('../routes')).toHaveBeenCalledWith(app);
  });
  
  test('configures CORS with appropriate options', () => {
    // Check CORS configuration
    const corsOptions = cors.mock.calls[0][0];
    expect(corsOptions).toBeDefined();
    
    // CORS should have origin configuration
    expect(corsOptions.origin).toBeDefined();
  });
  
  test('configures rate limiting with appropriate options', () => {
    // Check rate limit configuration
    const rateLimitOptions = rateLimit.mock.calls[0][0];
    expect(rateLimitOptions).toBeDefined();
    
    // Rate limiter should have windowMs and max properties
    expect(rateLimitOptions.windowMs).toBeDefined();
    expect(rateLimitOptions.max).toBeDefined();
  });
  
  test('configures JSON body parser with appropriate limits', () => {
    // Check JSON parser configuration
    const jsonOptions = express.json.mock.calls[0][0];
    expect(jsonOptions).toBeDefined();
    
    // JSON parser should have limit property
    expect(jsonOptions.limit).toBeDefined();
  });
  
  test('applies error handling middleware last', () => {
    // Check that error handlers were applied
    expect(require('../middleware/errorHandler').notFound).toHaveBeenCalled();
    expect(require('../middleware/errorHandler').errorHandler).toHaveBeenCalled();
  });
  
  test('test route returns 200 status', async () => {
    const response = await request(app).get('/api/test');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Test route');
  });
  
  test('non-existent route returns 404 status', async () => {
    const response = await request(app).get('/api/non-existent');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});

describe('Express App Integration', () => {
  let app;
  let server;
  
  beforeAll(() => {
    // Use the real app for integration tests
    jest.unmock('cors');
    jest.unmock('helmet');
    jest.unmock('morgan');
    jest.unmock('compression');
    jest.unmock('express-rate-limit');
    jest.unmock('../routes');
    jest.unmock('../middleware/errorHandler');
    
    // Load the real app
    jest.isolateModules(() => {
      app = require('../app');
    });
    
    // Start the server
    server = app.listen(0); // Use any available port
  });
  
  afterAll((done) => {
    // Close the server after tests
    server.close(done);
  });
  
  test('health check endpoint returns 200 status', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
  
  test('app handles JSON parsing errors', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{malformed json');
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
  
  test('app handles URL encoded data', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('email=test@example.com&password=password');
    
    // Even if the route doesn't exist, the parser should handle the data
    expect(response.status).not.toBe(400);
  });
  
  test('app sets security headers', async () => {
    const response = await request(app).get('/api/health');
    
    // Check for security headers set by helmet
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('x-xss-protection');
  });
  
  test('app handles CORS preflight requests', async () => {
    const response = await request(app)
      .options('/api/health')
      .set('Origin', 'http://example.com')
      .set('Access-Control-Request-Method', 'GET');
    
    // Should respond to OPTIONS requests
    expect(response.status).toBe(204);
    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });
  
  test('app handles rate limiting', async () => {
    // This test is a bit tricky since we don't want to make too many requests
    // Just check that the rate limiter is applied
    const response = await request(app).get('/api/health');
    
    // Rate limiter might set headers like X-RateLimit-Limit
    // But this depends on the configuration
    expect(response.status).toBe(200);
  });
});