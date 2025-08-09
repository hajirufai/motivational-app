const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => {
  return {
    initializeApp: jest.fn(),
    auth: jest.fn().mockReturnValue({
      verifyIdToken: jest.fn().mockImplementation((token) => {
        if (token === 'valid-firebase-token') {
          return Promise.resolve({
            uid: 'firebase-user-123',
            email: 'test@example.com',
            email_verified: true
          });
        } else {
          return Promise.reject(new Error('Invalid token'));
        }
      }),
      setCustomUserClaims: jest.fn().mockResolvedValue(undefined)
    })
  };
});

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';

describe('Authentication Routes', () => {
  let mongoServer;
  
  beforeAll(async () => {
    // Start an in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(uri);
  });
  
  afterAll(async () => {
    // Disconnect and stop MongoDB server
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // Clear the User collection before each test
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'Password123!',
        displayName: 'New User'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      // Check response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('displayName', userData.displayName);
      expect(response.body.user).not.toHaveProperty('password');
      
      // Verify user was saved to database
      const savedUser = await User.findOne({ email: userData.email });
      expect(savedUser).not.toBeNull();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.displayName).toBe(userData.displayName);
      
      // Verify password was hashed
      expect(savedUser.password).not.toBe(userData.password);
      const passwordMatch = await bcrypt.compare(userData.password, savedUser.password);
      expect(passwordMatch).toBe(true);
      
      // Verify JWT token
      const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decodedToken).toHaveProperty('id', savedUser._id.toString());
    });
    
    test('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@example.com',
          // Missing password and displayName
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 400 if email is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          displayName: 'Invalid Email User'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 400 if password is too weak', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weakpass@example.com',
          password: '123', // Too short
          displayName: 'Weak Password User'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 409 if email is already registered', async () => {
      // Create a user first
      const existingUser = new User({
        email: 'existing@example.com',
        password: await bcrypt.hash('ExistingPass123!', 10),
        displayName: 'Existing User'
      });
      await existingUser.save();
      
      // Try to register with the same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'NewPassword123!',
          displayName: 'Duplicate Email User'
        })
        .expect(409);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      const testUser = new User({
        email: 'testuser@example.com',
        password: hashedPassword,
        displayName: 'Test User'
      });
      await testUser.save();
    });
    
    test('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'TestPassword123!'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
      
      // Check response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', loginData.email);
      expect(response.body.user).not.toHaveProperty('password');
      
      // Verify JWT token
      const user = await User.findOne({ email: loginData.email });
      const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decodedToken).toHaveProperty('id', user._id.toString());
    });
    
    test('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'TestPassword123!'
          // Missing email
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com'
          // Missing password
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 401 if email is not found', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 401 if password is incorrect', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/firebase', () => {
    test('should authenticate with valid Firebase token', async () => {
      const response = await request(app)
        .post('/api/auth/firebase')
        .send({
          token: 'valid-firebase-token'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });
    
    test('should return 401 with invalid Firebase token', async () => {
      const response = await request(app)
        .post('/api/auth/firebase')
        .send({
          token: 'invalid-firebase-token'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 400 if token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/firebase')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser;
    let authToken;
    
    beforeEach(async () => {
      // Create a test user
      testUser = new User({
        email: 'profile@example.com',
        password: await bcrypt.hash('ProfilePass123!', 10),
        displayName: 'Profile User'
      });
      await testUser.save();
      
      // Generate a valid JWT token
      authToken = jwt.sign(
        { id: testUser._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
    });
    
    test('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('displayName', testUser.displayName);
      expect(response.body.user).not.toHaveProperty('password');
    });
    
    test('should return 401 with no token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 404 if user no longer exists', async () => {
      // Generate token for a non-existent user ID
      const nonExistentToken = jwt.sign(
        { id: new mongoose.Types.ObjectId() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${nonExistentToken}`)
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});