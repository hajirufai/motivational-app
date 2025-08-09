const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Quote = require('../models/Quote');
const Activity = require('../models/Activity');
const { generateToken } = require('../utils/auth');

describe('Admin Routes', () => {
  let mongoServer;
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;
  let testQuote;

  beforeAll(async () => {
    // Set up the MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create admin user
    adminUser = new User({
      email: 'admin@example.com',
      password: 'AdminPass123!',
      displayName: 'Admin User',
      role: 'admin'
    });
    await adminUser.save();
    adminToken = generateToken(adminUser);

    // Create regular user
    regularUser = new User({
      email: 'user@example.com',
      password: 'UserPass123!',
      displayName: 'Regular User',
      role: 'user'
    });
    await regularUser.save();
    userToken = generateToken(regularUser);

    // Create a test quote
    testQuote = new Quote({
      text: 'Test quote for admin routes',
      author: 'Test Author',
      tags: ['test', 'admin'],
      addedBy: adminUser._id
    });
    await testQuote.save();

    // Create some test activities
    await Activity.create({
      user: regularUser._id,
      type: 'login',
      details: { ip: '127.0.0.1' }
    });

    await Activity.create({
      user: regularUser._id,
      type: 'view_quote',
      details: { quoteId: testQuote._id }
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('GET /api/admin/users', () => {
    test('should return all users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(2);
      
      // Check user data structure
      const user = response.body.data.users[0];
      expect(user).toHaveProperty('_id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('displayName');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('createdAt');
      
      // Password should not be included
      expect(user).not.toHaveProperty('password');
    });

    test('should support pagination', async () => {
      // Create additional users for pagination testing
      for (let i = 0; i < 10; i++) {
        await User.create({
          email: `paginationtest${i}@example.com`,
          password: 'TestPass123!',
          displayName: `Pagination Test ${i}`,
          role: 'user'
        });
      }

      // Test first page with limit
      const response1 = await request(app)
        .get('/api/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response1.status).toBe(200);
      expect(response1.body.data.users.length).toBe(5);
      expect(response1.body.data.pagination).toBeDefined();
      expect(response1.body.data.pagination.totalUsers).toBeGreaterThanOrEqual(12); // 2 original + 10 new
      expect(response1.body.data.pagination.totalPages).toBeGreaterThanOrEqual(3);
      expect(response1.body.data.pagination.currentPage).toBe(1);

      // Test second page
      const response2 = await request(app)
        .get('/api/admin/users?page=2&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body.data.users.length).toBe(5);
      expect(response2.body.data.pagination.currentPage).toBe(2);

      // Ensure different users on different pages
      const firstPageIds = response1.body.data.users.map(u => u._id);
      const secondPageIds = response2.body.data.users.map(u => u._id);
      const intersection = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(intersection.length).toBe(0);
    });

    test('should support filtering by role', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users.every(user => user.role === 'admin')).toBe(true);
    });

    test('should support searching by email or displayName', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.users.some(user => 
        user.email.includes('admin') || user.displayName.includes('Admin')
      )).toBe(true);
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/admin/users/:userId', () => {
    test('should return user details for admin', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user._id.toString()).toBe(regularUser._id.toString());
      expect(response.body.data.user.email).toBe(regularUser.email);
      expect(response.body.data.user.displayName).toBe(regularUser.displayName);
      expect(response.body.data.user.role).toBe(regularUser.role);
      
      // Should include activity data
      expect(response.body.data.activity).toBeDefined();
      expect(Array.isArray(response.body.data.activity)).toBe(true);
      expect(response.body.data.activity.length).toBeGreaterThan(0);
    });

    test('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/admin/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/admin/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/users/:userId', () => {
    test('should update user role for admin', async () => {
      const updateData = {
        role: 'moderator'
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.role).toBe('moderator');

      // Verify in database
      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.role).toBe('moderator');

      // Reset role for other tests
      updatedUser.role = 'user';
      await updatedUser.save();
    });

    test('should update multiple user fields', async () => {
      const updateData = {
        displayName: 'Updated User Name',
        role: 'user',
        isActive: false
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.user.displayName).toBe('Updated User Name');
      expect(response.body.data.user.role).toBe('user');
      expect(response.body.data.user.isActive).toBe(false);

      // Reset for other tests
      await User.findByIdAndUpdate(regularUser._id, {
        displayName: 'Regular User',
        isActive: true
      });
    });

    test('should prevent admin from downgrading their own role', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('cannot downgrade your own role');

      // Verify role didn't change
      const unchangedAdmin = await User.findById(adminUser._id);
      expect(unchangedAdmin.role).toBe('admin');
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'moderator' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/admin/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'moderator' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should validate role values', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid_role' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/users/:userId', () => {
    let userToDelete;

    beforeEach(async () => {
      // Create a user to delete in each test
      userToDelete = new User({
        email: `delete-test-${Date.now()}@example.com`,
        password: 'DeleteTest123!',
        displayName: 'User To Delete',
        role: 'user'
      });
      await userToDelete.save();
    });

    test('should delete user for admin', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('successfully deleted');

      // Verify user is deleted
      const deletedUser = await User.findById(userToDelete._id);
      expect(deletedUser).toBeNull();
    });

    test('should prevent admin from deleting themselves', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('cannot delete your own account');

      // Verify admin still exists
      const adminStillExists = await User.findById(adminUser._id);
      expect(adminStillExists).not.toBeNull();
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Verify user still exists
      const userStillExists = await User.findById(userToDelete._id);
      expect(userStillExists).not.toBeNull();
    });

    test('should return 404 for non-existent user', async () => {
      // Delete the user first
      await User.findByIdAndDelete(userToDelete._id);

      const response = await request(app)
        .delete(`/api/admin/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/quotes', () => {
    beforeEach(async () => {
      // Create additional quotes for testing
      for (let i = 0; i < 5; i++) {
        await Quote.create({
          text: `Admin test quote ${i}`,
          author: `Test Author ${i}`,
          tags: ['test', `tag${i}`],
          addedBy: adminUser._id
        });
      }
    });

    test('should return all quotes for admin', async () => {
      const response = await request(app)
        .get('/api/admin/quotes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.quotes)).toBe(true);
      expect(response.body.data.quotes.length).toBeGreaterThan(0);
      
      // Check quote data structure
      const quote = response.body.data.quotes[0];
      expect(quote).toHaveProperty('_id');
      expect(quote).toHaveProperty('text');
      expect(quote).toHaveProperty('author');
      expect(quote).toHaveProperty('tags');
      expect(quote).toHaveProperty('viewCount');
      expect(quote).toHaveProperty('createdAt');
    });

    test('should support pagination', async () => {
      // Test first page with limit
      const response1 = await request(app)
        .get('/api/admin/quotes?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response1.status).toBe(200);
      expect(response1.body.data.quotes.length).toBe(3);
      expect(response1.body.data.pagination).toBeDefined();
      expect(response1.body.data.pagination.totalQuotes).toBeGreaterThan(5);
      expect(response1.body.data.pagination.currentPage).toBe(1);

      // Test second page
      const response2 = await request(app)
        .get('/api/admin/quotes?page=2&limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body.data.quotes.length).toBe(3);
      expect(response2.body.data.pagination.currentPage).toBe(2);

      // Ensure different quotes on different pages
      const firstPageIds = response1.body.data.quotes.map(q => q._id);
      const secondPageIds = response2.body.data.quotes.map(q => q._id);
      const intersection = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(intersection.length).toBe(0);
    });

    test('should support filtering by tag', async () => {
      const response = await request(app)
        .get('/api/admin/quotes?tag=tag1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.quotes.every(quote => 
        quote.tags.includes('tag1')
      )).toBe(true);
    });

    test('should support searching by text or author', async () => {
      const response = await request(app)
        .get('/api/admin/quotes?search=Author 2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.quotes.length).toBeGreaterThan(0);
      expect(response.body.data.quotes.some(quote => 
        quote.author.includes('Author 2') || quote.text.includes('Author 2')
      )).toBe(true);
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/quotes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/quotes/:quoteId', () => {
    test('should return quote details for admin', async () => {
      const response = await request(app)
        .get(`/api/admin/quotes/${testQuote._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.quote).toBeDefined();
      expect(response.body.data.quote._id.toString()).toBe(testQuote._id.toString());
      expect(response.body.data.quote.text).toBe(testQuote.text);
      expect(response.body.data.quote.author).toBe(testQuote.author);
      
      // Should include user who added the quote
      expect(response.body.data.quote.addedBy).toBeDefined();
      expect(response.body.data.quote.addedBy._id.toString()).toBe(adminUser._id.toString());
    });

    test('should return 404 for non-existent quote', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/admin/quotes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get(`/api/admin/quotes/${testQuote._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/quotes', () => {
    test('should create a new quote for admin', async () => {
      const newQuoteData = {
        text: 'New admin-created quote',
        author: 'Admin Test Author',
        tags: ['admin', 'test', 'new']
      };

      const response = await request(app)
        .post('/api/admin/quotes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newQuoteData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.quote).toBeDefined();
      expect(response.body.data.quote.text).toBe(newQuoteData.text);
      expect(response.body.data.quote.author).toBe(newQuoteData.author);
      expect(response.body.data.quote.tags).toEqual(expect.arrayContaining(newQuoteData.tags));
      expect(response.body.data.quote.addedBy.toString()).toBe(adminUser._id.toString());

      // Verify in database
      const savedQuote = await Quote.findById(response.body.data.quote._id);
      expect(savedQuote).not.toBeNull();
      expect(savedQuote.text).toBe(newQuoteData.text);
    });

    test('should validate required fields', async () => {
      // Missing text
      const invalidQuote1 = {
        author: 'Test Author',
        tags: ['test']
      };

      const response1 = await request(app)
        .post('/api/admin/quotes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidQuote1);

      expect(response1.status).toBe(400);
      expect(response1.body.success).toBe(false);

      // Missing author
      const invalidQuote2 = {
        text: 'Test quote without author',
        tags: ['test']
      };

      const response2 = await request(app)
        .post('/api/admin/quotes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidQuote2);

      expect(response2.status).toBe(400);
      expect(response2.body.success).toBe(false);
    });

    test('should handle tags properly', async () => {
      // No tags provided
      const quoteWithoutTags = {
        text: 'Quote without tags',
        author: 'Test Author'
      };

      const response1 = await request(app)
        .post('/api/admin/quotes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(quoteWithoutTags);

      expect(response1.status).toBe(201);
      expect(response1.body.data.quote.tags).toEqual([]);

      // Empty tags array
      const quoteWithEmptyTags = {
        text: 'Quote with empty tags array',
        author: 'Test Author',
        tags: []
      };

      const response2 = await request(app)
        .post('/api/admin/quotes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(quoteWithEmptyTags);

      expect(response2.status).toBe(201);
      expect(response2.body.data.quote.tags).toEqual([]);
    });

    test('should return 403 for non-admin users', async () => {
      const quoteData = {
        text: 'Quote by non-admin',
        author: 'Test Author',
        tags: ['test']
      };

      const response = await request(app)
        .post('/api/admin/quotes')
        .set('Authorization', `Bearer ${userToken}`)
        .send(quoteData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/quotes/:quoteId', () => {
    let quoteToUpdate;

    beforeEach(async () => {
      // Create a quote to update in each test
      quoteToUpdate = new Quote({
        text: 'Quote to update',
        author: 'Original Author',
        tags: ['original', 'test'],
        addedBy: adminUser._id
      });
      await quoteToUpdate.save();
    });

    test('should update quote for admin', async () => {
      const updateData = {
        text: 'Updated quote text',
        author: 'Updated Author',
        tags: ['updated', 'test']
      };

      const response = await request(app)
        .put(`/api/admin/quotes/${quoteToUpdate._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.quote).toBeDefined();
      expect(response.body.data.quote.text).toBe(updateData.text);
      expect(response.body.data.quote.author).toBe(updateData.author);
      expect(response.body.data.quote.tags).toEqual(expect.arrayContaining(updateData.tags));

      // Verify in database
      const updatedQuote = await Quote.findById(quoteToUpdate._id);
      expect(updatedQuote.text).toBe(updateData.text);
      expect(updatedQuote.author).toBe(updateData.author);
    });

    test('should allow partial updates', async () => {
      // Update only the text
      const partialUpdate = {
        text: 'Only the text is updated'
      };

      const response = await request(app)
        .put(`/api/admin/quotes/${quoteToUpdate._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate);

      expect(response.status).toBe(200);
      expect(response.body.data.quote.text).toBe(partialUpdate.text);
      expect(response.body.data.quote.author).toBe(quoteToUpdate.author); // Unchanged
      expect(response.body.data.quote.tags).toEqual(expect.arrayContaining(quoteToUpdate.tags)); // Unchanged
    });

    test('should return 404 for non-existent quote', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = {
        text: 'Updated quote text',
        author: 'Updated Author'
      };

      const response = await request(app)
        .put(`/api/admin/quotes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should return 403 for non-admin users', async () => {
      const updateData = {
        text: 'Updated by non-admin',
        author: 'Non-admin Author'
      };

      const response = await request(app)
        .put(`/api/admin/quotes/${quoteToUpdate._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Verify quote was not updated
      const unchangedQuote = await Quote.findById(quoteToUpdate._id);
      expect(unchangedQuote.text).toBe(quoteToUpdate.text);
    });
  });

  describe('DELETE /api/admin/quotes/:quoteId', () => {
    let quoteToDelete;

    beforeEach(async () => {
      // Create a quote to delete in each test
      quoteToDelete = new Quote({
        text: 'Quote to delete',
        author: 'Delete Test Author',
        tags: ['delete', 'test'],
        addedBy: adminUser._id
      });
      await quoteToDelete.save();
    });

    test('should delete quote for admin', async () => {
      const response = await request(app)
        .delete(`/api/admin/quotes/${quoteToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('successfully deleted');

      // Verify quote is deleted
      const deletedQuote = await Quote.findById(quoteToDelete._id);
      expect(deletedQuote).toBeNull();
    });

    test('should return 404 for non-existent quote', async () => {
      // Delete the quote first
      await Quote.findByIdAndDelete(quoteToDelete._id);

      const response = await request(app)
        .delete(`/api/admin/quotes/${quoteToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/admin/quotes/${quoteToDelete._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Verify quote still exists
      const quoteStillExists = await Quote.findById(quoteToDelete._id);
      expect(quoteStillExists).not.toBeNull();
    });
  });

  describe('GET /api/admin/stats', () => {
    test('should return admin dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Check for required statistics
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('totalQuotes');
      expect(response.body.data).toHaveProperty('totalFavorites');
      expect(response.body.data).toHaveProperty('totalViews');
      expect(response.body.data).toHaveProperty('newUsersThisWeek');
      expect(response.body.data).toHaveProperty('newQuotesThisWeek');
      expect(response.body.data).toHaveProperty('popularTags');
      expect(response.body.data).toHaveProperty('usersByRole');
      expect(response.body.data).toHaveProperty('activityOverTime');
      
      // Verify data types
      expect(typeof response.body.data.totalUsers).toBe('number');
      expect(typeof response.body.data.totalQuotes).toBe('number');
      expect(Array.isArray(response.body.data.popularTags)).toBe(true);
      expect(Array.isArray(response.body.data.usersByRole)).toBe(true);
      expect(Array.isArray(response.body.data.activityOverTime)).toBe(true);
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/activity', () => {
    beforeEach(async () => {
      // Create additional activities for testing
      for (let i = 0; i < 5; i++) {
        await Activity.create({
          user: regularUser._id,
          type: ['login', 'logout', 'view_quote', 'favorite_quote', 'profile_update'][i % 5],
          details: { ip: `192.168.1.${i}` }
        });
      }
    });

    test('should return all activities for admin', async () => {
      const response = await request(app)
        .get('/api/admin/activity')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.activities)).toBe(true);
      expect(response.body.data.activities.length).toBeGreaterThan(0);
      
      // Check activity data structure
      const activity = response.body.data.activities[0];
      expect(activity).toHaveProperty('_id');
      expect(activity).toHaveProperty('user');
      expect(activity).toHaveProperty('type');
      expect(activity).toHaveProperty('details');
      expect(activity).toHaveProperty('createdAt');
      
      // User should be populated
      expect(activity.user).toHaveProperty('_id');
      expect(activity.user).toHaveProperty('displayName');
    });

    test('should support pagination', async () => {
      // Test first page with limit
      const response1 = await request(app)
        .get('/api/admin/activity?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response1.status).toBe(200);
      expect(response1.body.data.activities.length).toBe(3);
      expect(response1.body.data.pagination).toBeDefined();
      expect(response1.body.data.pagination.totalActivities).toBeGreaterThan(5);
      expect(response1.body.data.pagination.currentPage).toBe(1);

      // Test second page
      const response2 = await request(app)
        .get('/api/admin/activity?page=2&limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body.data.activities.length).toBe(3);
      expect(response2.body.data.pagination.currentPage).toBe(2);

      // Ensure different activities on different pages
      const firstPageIds = response1.body.data.activities.map(a => a._id);
      const secondPageIds = response2.body.data.activities.map(a => a._id);
      const intersection = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(intersection.length).toBe(0);
    });

    test('should support filtering by activity type', async () => {
      const response = await request(app)
        .get('/api/admin/activity?type=login')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.activities.every(activity => 
        activity.type === 'login'
      )).toBe(true);
    });

    test('should support filtering by user', async () => {
      const response = await request(app)
        .get(`/api/admin/activity?userId=${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.activities.every(activity => 
        activity.user._id.toString() === regularUser._id.toString()
      )).toBe(true);
    });

    test('should support date range filtering', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const startDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
      const endDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

      const response = await request(app)
        .get(`/api/admin/activity?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.activities.length).toBeGreaterThan(0);
      
      // All activities should be within the date range
      const activitiesInRange = response.body.data.activities.every(activity => {
        const activityDate = new Date(activity.createdAt);
        const activityDateStr = activityDate.toISOString().split('T')[0];
        return activityDateStr >= startDate && activityDateStr <= endDate;
      });
      
      expect(activitiesInRange).toBe(true);
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/activity')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});