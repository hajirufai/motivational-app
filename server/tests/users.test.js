const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const User = require('../models/User');
const Quote = require('../models/Quote');
const Activity = require('../models/Activity');
const jwt = require('jsonwebtoken');

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';

describe('User API Routes', () => {
  let mongoServer;
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  let testQuotes = [];
  
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
    // Clear the collections before each test
    await User.deleteMany({});
    await Quote.deleteMany({});
    await Activity.deleteMany({});
    
    // Create test users
    testUser = new User({
      email: 'user@example.com',
      password: 'hashedpassword',
      displayName: 'Test User',
      role: 'user',
      bio: 'Test bio',
      location: 'Test City',
      favoriteCategories: ['inspiration', 'motivation']
    });
    await testUser.save();
    
    adminUser = new User({
      email: 'admin@example.com',
      password: 'hashedpassword',
      displayName: 'Admin User',
      role: 'admin'
    });
    await adminUser.save();
    
    // Generate tokens
    userToken = jwt.sign(
      { id: testUser._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    adminToken = jwt.sign(
      { id: adminUser._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // Create some test quotes
    const quotes = [
      {
        text: 'The only way to do great work is to love what you do.',
        author: 'Steve Jobs',
        tags: ['inspiration', 'work']
      },
      {
        text: 'Life is what happens when you're busy making other plans.',
        author: 'John Lennon',
        tags: ['life', 'planning']
      },
      {
        text: 'The future belongs to those who believe in the beauty of their dreams.',
        author: 'Eleanor Roosevelt',
        tags: ['future', 'dreams']
      }
    ];
    
    testQuotes = await Quote.insertMany(quotes);
    
    // Add some quotes to user's favorites
    testUser.favorites = [testQuotes[0]._id, testQuotes[1]._id];
    await testUser.save();
    
    // Create some user activities
    const activities = [
      {
        user: testUser._id,
        type: 'view',
        quote: testQuotes[0]._id,
        timestamp: new Date('2023-06-01T10:00:00.000Z')
      },
      {
        user: testUser._id,
        type: 'favorite',
        quote: testQuotes[0]._id,
        timestamp: new Date('2023-06-01T11:00:00.000Z')
      },
      {
        user: testUser._id,
        type: 'share',
        quote: testQuotes[1]._id,
        timestamp: new Date('2023-06-01T12:00:00.000Z')
      }
    ];
    
    await Activity.insertMany(activities);
  });

  describe('GET /api/users/profile', () => {
    test('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('displayName', testUser.displayName);
      expect(response.body.user).toHaveProperty('bio', testUser.bio);
      expect(response.body.user).toHaveProperty('location', testUser.location);
      expect(response.body.user).toHaveProperty('favoriteCategories');
      expect(response.body.user.favoriteCategories).toEqual(expect.arrayContaining(testUser.favoriteCategories));
      expect(response.body.user).not.toHaveProperty('password');
    });
    
    test('should return 401 with no token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/users/profile', () => {
    test('should update user profile with valid data', async () => {
      const updateData = {
        displayName: 'Updated Name',
        bio: 'Updated bio information',
        location: 'New City',
        favoriteCategories: ['success', 'happiness']
      };
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('displayName', updateData.displayName);
      expect(response.body.user).toHaveProperty('bio', updateData.bio);
      expect(response.body.user).toHaveProperty('location', updateData.location);
      expect(response.body.user.favoriteCategories).toEqual(expect.arrayContaining(updateData.favoriteCategories));
      
      // Verify user was updated in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.displayName).toBe(updateData.displayName);
      expect(updatedUser.bio).toBe(updateData.bio);
      expect(updatedUser.location).toBe(updateData.location);
    });
    
    test('should return 400 with invalid data', async () => {
      const invalidData = {
        displayName: '' // Empty display name
      };
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should not allow updating email or password through this endpoint', async () => {
      const updateData = {
        displayName: 'Valid Name',
        email: 'newemail@example.com',
        password: 'newpassword'
      };
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);
      
      // Verify user was updated in database but email and password remained unchanged
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.displayName).toBe(updateData.displayName);
      expect(updatedUser.email).toBe(testUser.email); // Email should not change
      expect(updatedUser.password).toBe(testUser.password); // Password should not change
    });
  });

  describe('GET /api/users/favorites', () => {
    test('should return user favorites with pagination', async () => {
      const response = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.quotes).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total', 2);
      
      // Verify the returned quotes match the user's favorites
      const quoteIds = response.body.quotes.map(q => q._id);
      expect(quoteIds).toContain(testQuotes[0]._id.toString());
      expect(quoteIds).toContain(testQuotes[1]._id.toString());
    });
    
    test('should respect pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users/favorites?page=1&limit=1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      expect(response.body.quotes).toHaveLength(1);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 1);
      expect(response.body.pagination).toHaveProperty('pages', 2);
    });
    
    test('should return empty array if user has no favorites', async () => {
      // Remove all favorites
      testUser.favorites = [];
      await testUser.save();
      
      const response = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      expect(response.body.quotes).toHaveLength(0);
      expect(response.body.pagination).toHaveProperty('total', 0);
    });
  });

  describe('POST /api/users/favorites', () => {
    test('should add a quote to favorites', async () => {
      // Remove all favorites first
      testUser.favorites = [];
      await testUser.save();
      
      const response = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quoteId: testQuotes[0]._id })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      
      // Verify quote was added to favorites in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.favorites).toContainEqual(testQuotes[0]._id);
      
      // Verify activity was recorded
      const activity = await Activity.findOne({
        user: testUser._id,
        type: 'favorite',
        quote: testQuotes[0]._id
      });
      expect(activity).not.toBeNull();
    });
    
    test('should return 400 if quoteId is missing', async () => {
      const response = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .send({}) // Missing quoteId
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 404 if quote does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quoteId: nonExistentId })
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should not add duplicate favorites', async () => {
      // Add a quote to favorites
      testUser.favorites = [testQuotes[0]._id];
      await testUser.save();
      
      // Try to add the same quote again
      const response = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quoteId: testQuotes[0]._id })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/already in favorites/i);
    });
  });

  describe('DELETE /api/users/favorites/:quoteId', () => {
    test('should remove a quote from favorites', async () => {
      // Ensure the quote is in favorites
      testUser.favorites = [testQuotes[0]._id, testQuotes[1]._id];
      await testUser.save();
      
      const response = await request(app)
        .delete(`/api/users/favorites/${testQuotes[0]._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      
      // Verify quote was removed from favorites in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.favorites).not.toContainEqual(testQuotes[0]._id);
      expect(updatedUser.favorites).toContainEqual(testQuotes[1]._id); // Other favorite should remain
    });
    
    test('should return 404 if quote is not in favorites', async () => {
      // Ensure the quote is not in favorites
      testUser.favorites = [testQuotes[1]._id];
      await testUser.save();
      
      const response = await request(app)
        .delete(`/api/users/favorites/${testQuotes[0]._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not found in favorites/i);
    });
  });

  describe('GET /api/users/favorites/check/:quoteId', () => {
    test('should return true if quote is in favorites', async () => {
      // Ensure the quote is in favorites
      testUser.favorites = [testQuotes[0]._id];
      await testUser.save();
      
      const response = await request(app)
        .get(`/api/users/favorites/check/${testQuotes[0]._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('isFavorite', true);
    });
    
    test('should return false if quote is not in favorites', async () => {
      // Ensure the quote is not in favorites
      testUser.favorites = [];
      await testUser.save();
      
      const response = await request(app)
        .get(`/api/users/favorites/check/${testQuotes[0]._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('isFavorite', false);
    });
  });

  describe('GET /api/users/activity', () => {
    test('should return user activity with pagination', async () => {
      const response = await request(app)
        .get('/api/users/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.activities).toHaveLength(3);
      expect(response.body.pagination).toHaveProperty('total', 3);
      
      // Verify activities have expected properties
      response.body.activities.forEach(activity => {
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('quote');
        expect(activity).toHaveProperty('timestamp');
      });
    });
    
    test('should respect pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users/activity?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('activities');
      expect(response.body.activities).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
      expect(response.body.pagination).toHaveProperty('pages', 2);
    });
    
    test('should filter activities by type', async () => {
      const response = await request(app)
        .get('/api/users/activity?type=view')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('activities');
      expect(response.body.activities).toHaveLength(1);
      expect(response.body.activities[0].type).toBe('view');
    });
    
    test('should return empty array if user has no activity', async () => {
      // Remove all activities
      await Activity.deleteMany({ user: testUser._id });
      
      const response = await request(app)
        .get('/api/users/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('activities');
      expect(response.body.activities).toHaveLength(0);
      expect(response.body.pagination).toHaveProperty('total', 0);
    });
  });

  describe('GET /api/users/stats', () => {
    test('should return user stats', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('quotesViewed');
      expect(response.body.stats).toHaveProperty('favoriteQuotes');
      expect(response.body.stats).toHaveProperty('streakDays');
      expect(response.body.stats).toHaveProperty('topCategories');
      expect(response.body.stats).toHaveProperty('activityByDay');
      
      // Verify specific stats values
      expect(response.body.stats.quotesViewed).toBe(1); // One view activity
      expect(response.body.stats.favoriteQuotes).toBe(2); // Two favorites
    });
    
    test('should return zero values for new user with no activity', async () => {
      // Create a new user with no activity
      const newUser = new User({
        email: 'newuser@example.com',
        password: 'hashedpassword',
        displayName: 'New User',
        role: 'user'
      });
      await newUser.save();
      
      const newUserToken = jwt.sign(
        { id: newUser._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats.quotesViewed).toBe(0);
      expect(response.body.stats.favoriteQuotes).toBe(0);
      expect(response.body.stats.streakDays).toBe(0);
      expect(response.body.stats.topCategories).toHaveLength(0);
    });
  });
});