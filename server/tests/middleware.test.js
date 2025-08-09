const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// Import middleware
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { errorHandler } = require('../middleware/error');
const { rateLimiter } = require('../middleware/rateLimiter');

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn()
  })
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn()
}));

describe('Middleware Tests', () => {
  let mongoServer;
  let app;
  
  beforeAll(async () => {
    // Set up MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-secret';
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('Authentication Middleware', () => {
    test('should pass with valid JWT token', async () => {
      // Mock JWT verification to return a valid user
      jwt.verify.mockImplementation(() => ({ userId: 'user123', role: 'user' }));
      
      // Set up test route with auth middleware
      app.get('/protected', authenticate, (req, res) => {
        res.status(200).json({ success: true, user: req.user });
      });
      
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({ userId: 'user123', role: 'user' });
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    });
    
    test('should reject requests with no token', async () => {
      // Set up test route with auth middleware
      app.get('/protected', authenticate, (req, res) => {
        res.status(200).json({ success: true });
      });
      
      const response = await request(app).get('/protected');
      
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('No token provided');
    });
    
    test('should reject requests with invalid token format', async () => {
      // Set up test route with auth middleware
      app.get('/protected', authenticate, (req, res) => {
        res.status(200).json({ success: true });
      });
      
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat token123');
      
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid token format');
    });
    
    test('should reject requests with invalid token', async () => {
      // Mock JWT verification to throw an error
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Set up test route with auth middleware
      app.get('/protected', authenticate, (req, res) => {
        res.status(200).json({ success: true });
      });
      
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid token');
    });
    
    test('should handle Firebase authentication', async () => {
      // Mock Firebase token verification
      admin.auth().verifyIdToken.mockResolvedValue({
        uid: 'firebase123',
        email: 'user@example.com',
        email_verified: true,
        firebase: { sign_in_provider: 'password' },
        role: 'user'
      });
      
      // Set up test route with auth middleware
      app.get('/firebase-auth', authenticate, (req, res) => {
        res.status(200).json({ success: true, user: req.user });
      });
      
      const response = await request(app)
        .get('/firebase-auth')
        .set('Authorization', 'Bearer firebase-token');
      
      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('uid', 'firebase123');
      expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('firebase-token');
    });
    
    test('should reject Firebase token verification failures', async () => {
      // Mock Firebase token verification to fail
      admin.auth().verifyIdToken.mockRejectedValue(new Error('Invalid Firebase token'));
      
      // Set up test route with auth middleware
      app.get('/firebase-auth', authenticate, (req, res) => {
        res.status(200).json({ success: true });
      });
      
      const response = await request(app)
        .get('/firebase-auth')
        .set('Authorization', 'Bearer firebase-token');
      
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid Firebase token');
    });
  });
  
  describe('Validation Middleware', () => {
    test('should pass with valid request data', async () => {
      // Define validation schema
      const schema = {
        body: {
          name: { type: 'string', required: true },
          email: { type: 'string', format: 'email', required: true },
          age: { type: 'number', minimum: 18 }
        }
      };
      
      // Set up test route with validation middleware
      app.post('/validate', validateRequest(schema), (req, res) => {
        res.status(200).json({ success: true, data: req.body });
      });
      
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        age: 25
      };
      
      const response = await request(app)
        .post('/validate')
        .send(validData);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(validData);
    });
    
    test('should reject requests with missing required fields', async () => {
      // Define validation schema
      const schema = {
        body: {
          name: { type: 'string', required: true },
          email: { type: 'string', format: 'email', required: true }
        }
      };
      
      // Set up test route with validation middleware
      app.post('/validate', validateRequest(schema), (req, res) => {
        res.status(200).json({ success: true });
      });
      
      const invalidData = {
        name: 'Test User'
        // Missing email
      };
      
      const response = await request(app)
        .post('/validate')
        .send(invalidData);
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ path: 'email' })
      );
    });
    
    test('should reject requests with invalid data types', async () => {
      // Define validation schema
      const schema = {
        body: {
          name: { type: 'string', required: true },
          age: { type: 'number', minimum: 18 }
        }
      };
      
      // Set up test route with validation middleware
      app.post('/validate', validateRequest(schema), (req, res) => {
        res.status(200).json({ success: true });
      });
      
      const invalidData = {
        name: 'Test User',
        age: 'twenty-five' // Should be a number
      };
      
      const response = await request(app)
        .post('/validate')
        .send(invalidData);
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ path: 'age' })
      );
    });
    
    test('should reject requests with values outside constraints', async () => {
      // Define validation schema
      const schema = {
        body: {
          name: { type: 'string', minLength: 3, maxLength: 50 },
          age: { type: 'number', minimum: 18, maximum: 120 }
        }
      };
      
      // Set up test route with validation middleware
      app.post('/validate', validateRequest(schema), (req, res) => {
        res.status(200).json({ success: true });
      });
      
      const invalidData = {
        name: 'Test User',
        age: 15 // Below minimum age
      };
      
      const response = await request(app)
        .post('/validate')
        .send(invalidData);
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ path: 'age' })
      );
    });
    
    test('should validate query parameters', async () => {
      // Define validation schema
      const schema = {
        query: {
          page: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100 }
        }
      };
      
      // Set up test route with validation middleware
      app.get('/validate', validateRequest(schema), (req, res) => {
        res.status(200).json({ success: true, query: req.query });
      });
      
      const response = await request(app)
        .get('/validate?page=0&limit=200'); // Invalid values
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveLength(2); // Both page and limit are invalid
    });
    
    test('should validate URL parameters', async () => {
      // Define validation schema
      const schema = {
        params: {
          id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } // MongoDB ObjectId pattern
        }
      };
      
      // Set up test route with validation middleware
      app.get('/validate/:id', validateRequest(schema), (req, res) => {
        res.status(200).json({ success: true, id: req.params.id });
      });
      
      const response = await request(app)
        .get('/validate/invalid-id'); // Not a valid ObjectId
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ path: 'id' })
      );
    });
  });
  
  describe('Error Handler Middleware', () => {
    test('should handle validation errors', async () => {
      // Set up test route that throws a validation error
      app.get('/error/validation', (req, res, next) => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        error.errors = [{ field: 'name', message: 'Name is required' }];
        next(error);
      });
      
      // Add error handler middleware
      app.use(errorHandler);
      
      const response = await request(app).get('/error/validation');
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Validation failed');
      expect(response.body.errors).toEqual([{ field: 'name', message: 'Name is required' }]);
    });
    
    test('should handle authentication errors', async () => {
      // Set up test route that throws an authentication error
      app.get('/error/auth', (req, res, next) => {
        const error = new Error('Authentication failed');
        error.name = 'AuthenticationError';
        next(error);
      });
      
      // Add error handler middleware
      app.use(errorHandler);
      
      const response = await request(app).get('/error/auth');
      
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Authentication failed');
    });
    
    test('should handle authorization errors', async () => {
      // Set up test route that throws an authorization error
      app.get('/error/forbidden', (req, res, next) => {
        const error = new Error('Access denied');
        error.name = 'ForbiddenError';
        next(error);
      });
      
      // Add error handler middleware
      app.use(errorHandler);
      
      const response = await request(app).get('/error/forbidden');
      
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');
    });
    
    test('should handle not found errors', async () => {
      // Set up test route that throws a not found error
      app.get('/error/notfound', (req, res, next) => {
        const error = new Error('Resource not found');
        error.name = 'NotFoundError';
        next(error);
      });
      
      // Add error handler middleware
      app.use(errorHandler);
      
      const response = await request(app).get('/error/notfound');
      
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Resource not found');
    });
    
    test('should handle duplicate key errors from MongoDB', async () => {
      // Set up test route that throws a MongoDB duplicate key error
      app.get('/error/duplicate', (req, res, next) => {
        const error = new Error('Duplicate key error');
        error.name = 'MongoError';
        error.code = 11000;
        error.keyValue = { email: 'test@example.com' };
        next(error);
      });
      
      // Add error handler middleware
      app.use(errorHandler);
      
      const response = await request(app).get('/error/duplicate');
      
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Duplicate key error');
      expect(response.body.field).toBe('email');
    });
    
    test('should handle generic server errors', async () => {
      // Set up test route that throws a generic error
      app.get('/error/server', (req, res, next) => {
        next(new Error('Something went wrong'));
      });
      
      // Add error handler middleware
      app.use(errorHandler);
      
      const response = await request(app).get('/error/server');
      
      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Something went wrong');
      
      // In production, should not expose error details
      process.env.NODE_ENV = 'production';
      const prodResponse = await request(app).get('/error/server');
      expect(prodResponse.status).toBe(500);
      expect(prodResponse.body.message).toBe('Internal server error');
      process.env.NODE_ENV = 'test'; // Reset environment
    });
  });
  
  describe('Rate Limiter Middleware', () => {
    test('should allow requests under the rate limit', async () => {
      // Configure a test rate limiter with high limits
      const testLimiter = rateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
      });
      
      // Set up test route with rate limiter
      app.get('/rate-limited', testLimiter, (req, res) => {
        res.status(200).json({ success: true });
      });
      
      const response = await request(app).get('/rate-limited');
      
      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
    
    test('should block requests over the rate limit', async () => {
      // Configure a test rate limiter with very low limits
      const testLimiter = rateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1, // Only 1 request per windowMs
        standardHeaders: true,
        legacyHeaders: false,
      });
      
      // Set up test route with rate limiter
      app.get('/rate-limited', testLimiter, (req, res) => {
        res.status(200).json({ success: true });
      });
      
      // First request should succeed
      const firstResponse = await request(app).get('/rate-limited');
      expect(firstResponse.status).toBe(200);
      
      // Second request should be rate limited
      const secondResponse = await request(app).get('/rate-limited');
      expect(secondResponse.status).toBe(429); // Too Many Requests
      expect(secondResponse.body.message).toContain('Too many requests');
    });
  });
});