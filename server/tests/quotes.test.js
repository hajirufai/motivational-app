const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const Quote = require('../models/Quote');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';

describe('Quotes API Routes', () => {
  let mongoServer;
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  
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
    await Quote.deleteMany({});
    await User.deleteMany({});
    
    // Create test users
    testUser = new User({
      email: 'user@example.com',
      password: 'hashedpassword',
      displayName: 'Test User',
      role: 'user'
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
        tags: ['inspiration', 'work'],
        addedBy: testUser._id
      },
      {
        text: 'Life is what happens when you're busy making other plans.',
        author: 'John Lennon',
        tags: ['life', 'planning'],
        addedBy: adminUser._id
      },
      {
        text: 'The future belongs to those who believe in the beauty of their dreams.',
        author: 'Eleanor Roosevelt',
        tags: ['future', 'dreams'],
        addedBy: testUser._id
      }
    ];
    
    await Quote.insertMany(quotes);
  });

  describe('GET /api/quotes/random', () => {
    test('should return a random quote', async () => {
      const response = await request(app)
        .get('/api/quotes/random')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quote');
      expect(response.body.quote).toHaveProperty('text');
      expect(response.body.quote).toHaveProperty('author');
      expect(response.body.quote).toHaveProperty('tags');
    });
    
    test('should return a random quote filtered by tag', async () => {
      const response = await request(app)
        .get('/api/quotes/random?tag=work')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quote');
      expect(response.body.quote.tags).toContain('work');
    });
    
    test('should return 404 if no quotes match the tag', async () => {
      const response = await request(app)
        .get('/api/quotes/random?tag=nonexistent')
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/quotes', () => {
    test('should return paginated quotes', async () => {
      const response = await request(app)
        .get('/api/quotes?page=1&limit=2')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.quotes).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
    });
    
    test('should filter quotes by tag', async () => {
      const response = await request(app)
        .get('/api/quotes?tag=work')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      response.body.quotes.forEach(quote => {
        expect(quote.tags).toContain('work');
      });
    });
    
    test('should filter quotes by author', async () => {
      const response = await request(app)
        .get('/api/quotes?author=Steve Jobs')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      response.body.quotes.forEach(quote => {
        expect(quote.author).toBe('Steve Jobs');
      });
    });
    
    test('should search quotes by text', async () => {
      const response = await request(app)
        .get('/api/quotes?search=future')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      response.body.quotes.forEach(quote => {
        expect(quote.text.toLowerCase()).toContain('future');
      });
    });
  });

  describe('GET /api/quotes/:id', () => {
    test('should return a quote by ID', async () => {
      // Get a quote ID first
      const quote = await Quote.findOne();
      
      const response = await request(app)
        .get(`/api/quotes/${quote._id}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quote');
      expect(response.body.quote).toHaveProperty('_id', quote._id.toString());
      expect(response.body.quote).toHaveProperty('text', quote.text);
      expect(response.body.quote).toHaveProperty('author', quote.author);
    });
    
    test('should return 404 for non-existent quote ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/quotes/${nonExistentId}`)
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 400 for invalid quote ID format', async () => {
      const response = await request(app)
        .get('/api/quotes/invalid-id')
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/quotes/tag/:tag', () => {
    test('should return quotes by tag', async () => {
      const response = await request(app)
        .get('/api/quotes/tag/inspiration')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      response.body.quotes.forEach(quote => {
        expect(quote.tags).toContain('inspiration');
      });
    });
    
    test('should return empty array for non-existent tag', async () => {
      const response = await request(app)
        .get('/api/quotes/tag/nonexistent')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      expect(response.body.quotes).toHaveLength(0);
    });
  });

  describe('POST /api/quotes', () => {
    test('should create a new quote with valid token and data', async () => {
      const newQuote = {
        text: 'Be the change you wish to see in the world.',
        author: 'Mahatma Gandhi',
        tags: ['change', 'inspiration']
      };
      
      const response = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newQuote)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quote');
      expect(response.body.quote).toHaveProperty('text', newQuote.text);
      expect(response.body.quote).toHaveProperty('author', newQuote.author);
      expect(response.body.quote.tags).toEqual(expect.arrayContaining(newQuote.tags));
      expect(response.body.quote).toHaveProperty('addedBy', testUser._id.toString());
      
      // Verify quote was saved to database
      const savedQuote = await Quote.findById(response.body.quote._id);
      expect(savedQuote).not.toBeNull();
      expect(savedQuote.text).toBe(newQuote.text);
    });
    
    test('should return 401 without token', async () => {
      const newQuote = {
        text: 'Test quote',
        author: 'Test Author',
        tags: ['test']
      };
      
      const response = await request(app)
        .post('/api/quotes')
        .send(newQuote)
        .expect(401);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 400 with invalid data', async () => {
      // Missing required fields
      const invalidQuote = {
        text: 'Test quote'
        // Missing author
      };
      
      const response = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidQuote)
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/quotes/:id', () => {
    test('should update a quote with admin token', async () => {
      // Get a quote ID first
      const quote = await Quote.findOne();
      
      const updateData = {
        text: 'Updated quote text',
        author: 'Updated Author',
        tags: ['updated', 'test']
      };
      
      const response = await request(app)
        .put(`/api/quotes/${quote._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quote');
      expect(response.body.quote).toHaveProperty('text', updateData.text);
      expect(response.body.quote).toHaveProperty('author', updateData.author);
      expect(response.body.quote.tags).toEqual(expect.arrayContaining(updateData.tags));
      
      // Verify quote was updated in database
      const updatedQuote = await Quote.findById(quote._id);
      expect(updatedQuote.text).toBe(updateData.text);
    });
    
    test('should update own quote with user token', async () => {
      // Get a quote added by the test user
      const quote = await Quote.findOne({ addedBy: testUser._id });
      
      const updateData = {
        text: 'User updated quote',
        author: quote.author, // Keep the same author
        tags: quote.tags // Keep the same tags
      };
      
      const response = await request(app)
        .put(`/api/quotes/${quote._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.quote).toHaveProperty('text', updateData.text);
    });
    
    test('should return 403 when user tries to update quote they did not add', async () => {
      // Get a quote added by the admin user
      const quote = await Quote.findOne({ addedBy: adminUser._id });
      
      const updateData = {
        text: 'Unauthorized update attempt',
        author: quote.author,
        tags: quote.tags
      };
      
      const response = await request(app)
        .put(`/api/quotes/${quote._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should return 404 for non-existent quote ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/quotes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'Updated text', author: 'Author' })
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/quotes/:id', () => {
    test('should delete a quote with admin token', async () => {
      // Get a quote ID first
      const quote = await Quote.findOne();
      
      const response = await request(app)
        .delete(`/api/quotes/${quote._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      
      // Verify quote was deleted from database
      const deletedQuote = await Quote.findById(quote._id);
      expect(deletedQuote).toBeNull();
    });
    
    test('should delete own quote with user token', async () => {
      // Get a quote added by the test user
      const quote = await Quote.findOne({ addedBy: testUser._id });
      
      const response = await request(app)
        .delete(`/api/quotes/${quote._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      
      // Verify quote was deleted
      const deletedQuote = await Quote.findById(quote._id);
      expect(deletedQuote).toBeNull();
    });
    
    test('should return 403 when user tries to delete quote they did not add', async () => {
      // Get a quote added by the admin user
      const quote = await Quote.findOne({ addedBy: adminUser._id });
      
      const response = await request(app)
        .delete(`/api/quotes/${quote._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      
      // Verify quote was not deleted
      const notDeletedQuote = await Quote.findById(quote._id);
      expect(notDeletedQuote).not.toBeNull();
    });
    
    test('should return 404 for non-existent quote ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/quotes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/quotes/popular', () => {
    beforeEach(async () => {
      // Update quotes with view counts for popularity testing
      await Quote.updateMany({}, { $set: { viewCount: 0 } });
      
      const quotes = await Quote.find().limit(3);
      
      // Set different view counts
      await Quote.findByIdAndUpdate(quotes[0]._id, { viewCount: 10 });
      await Quote.findByIdAndUpdate(quotes[1]._id, { viewCount: 5 });
      await Quote.findByIdAndUpdate(quotes[2]._id, { viewCount: 15 });
    });
    
    test('should return quotes sorted by popularity (view count)', async () => {
      const response = await request(app)
        .get('/api/quotes/popular')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      expect(response.body.quotes).toHaveLength(3);
      
      // Verify sorting by viewCount in descending order
      expect(response.body.quotes[0].viewCount).toBe(15);
      expect(response.body.quotes[1].viewCount).toBe(10);
      expect(response.body.quotes[2].viewCount).toBe(5);
    });
    
    test('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/quotes/popular?limit=2')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      expect(response.body.quotes).toHaveLength(2);
      
      // Should only return the top 2 most popular
      expect(response.body.quotes[0].viewCount).toBe(15);
      expect(response.body.quotes[1].viewCount).toBe(10);
    });
  });

  describe('POST /api/quotes/:id/view', () => {
    test('should increment view count for a quote', async () => {
      // Get a quote ID first
      const quote = await Quote.findOne();
      const initialViewCount = quote.viewCount || 0;
      
      const response = await request(app)
        .post(`/api/quotes/${quote._id}/view`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      
      // Verify view count was incremented
      const updatedQuote = await Quote.findById(quote._id);
      expect(updatedQuote.viewCount).toBe(initialViewCount + 1);
    });
    
    test('should return 404 for non-existent quote ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post(`/api/quotes/${nonExistentId}/view`)
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});