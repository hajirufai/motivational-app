const express = require('express');
const request = require('supertest');
const routes = require('../routes');
const authMiddleware = require('../middleware/auth');

// Mock middleware
jest.mock('../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn((roles) => (req, res, next) => next())
}));

// Mock controllers
jest.mock('../controllers/auth', () => ({
  login: jest.fn((req, res) => res.status(200).json({ token: 'test-token' })),
  register: jest.fn((req, res) => res.status(201).json({ message: 'User registered' })),
  refreshToken: jest.fn((req, res) => res.status(200).json({ token: 'new-token' })),
  forgotPassword: jest.fn((req, res) => res.status(200).json({ message: 'Password reset email sent' })),
  resetPassword: jest.fn((req, res) => res.status(200).json({ message: 'Password reset successful' })),
  verifyEmail: jest.fn((req, res) => res.status(200).json({ message: 'Email verified' }))
}));

jest.mock('../controllers/users', () => ({
  getProfile: jest.fn((req, res) => res.status(200).json({ user: { id: 'user-id' } })),
  updateProfile: jest.fn((req, res) => res.status(200).json({ message: 'Profile updated' })),
  getFavorites: jest.fn((req, res) => res.status(200).json({ favorites: [] })),
  addFavorite: jest.fn((req, res) => res.status(201).json({ message: 'Quote added to favorites' })),
  removeFavorite: jest.fn((req, res) => res.status(200).json({ message: 'Quote removed from favorites' })),
  checkFavorite: jest.fn((req, res) => res.status(200).json({ isFavorite: true })),
  getActivity: jest.fn((req, res) => res.status(200).json({ activity: [] })),
  getStats: jest.fn((req, res) => res.status(200).json({ stats: {} }))
}));

jest.mock('../controllers/quotes', () => ({
  getQuotes: jest.fn((req, res) => res.status(200).json({ quotes: [] })),
  getQuoteById: jest.fn((req, res) => res.status(200).json({ quote: { id: 'quote-id' } })),
  getRandomQuote: jest.fn((req, res) => res.status(200).json({ quote: { id: 'random-quote-id' } })),
  searchQuotes: jest.fn((req, res) => res.status(200).json({ quotes: [] })),
  getQuotesByTag: jest.fn((req, res) => res.status(200).json({ quotes: [] })),
  getQuotesByAuthor: jest.fn((req, res) => res.status(200).json({ quotes: [] })),
  getTags: jest.fn((req, res) => res.status(200).json({ tags: [] })),
  getAuthors: jest.fn((req, res) => res.status(200).json({ authors: [] }))
}));

jest.mock('../controllers/admin', () => ({
  getUsers: jest.fn((req, res) => res.status(200).json({ users: [] })),
  getUserById: jest.fn((req, res) => res.status(200).json({ user: { id: 'user-id' } })),
  updateUser: jest.fn((req, res) => res.status(200).json({ message: 'User updated' })),
  deleteUser: jest.fn((req, res) => res.status(200).json({ message: 'User deleted' })),
  getAllQuotes: jest.fn((req, res) => res.status(200).json({ quotes: [] })),
  createQuote: jest.fn((req, res) => res.status(201).json({ quote: { id: 'new-quote-id' } })),
  updateQuote: jest.fn((req, res) => res.status(200).json({ message: 'Quote updated' })),
  deleteQuote: jest.fn((req, res) => res.status(200).json({ message: 'Quote deleted' })),
  getDashboardStats: jest.fn((req, res) => res.status(200).json({ stats: {} })),
  getActivityLogs: jest.fn((req, res) => res.status(200).json({ activities: [] }))
}));

describe('API Routes', () => {
  let app;

  beforeEach(() => {
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    
    // Apply routes to the app
    routes(app);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Auth Routes', () => {
    test('POST /api/auth/login calls the login controller', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(require('../controllers/auth').login).toHaveBeenCalled();
    });

    test('POST /api/auth/register calls the register controller', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User', email: 'test@example.com', password: 'password' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(require('../controllers/auth').register).toHaveBeenCalled();
    });

    test('POST /api/auth/refresh-token calls the refreshToken controller', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(require('../controllers/auth').refreshToken).toHaveBeenCalled();
    });

    test('POST /api/auth/forgot-password calls the forgotPassword controller', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(require('../controllers/auth').forgotPassword).toHaveBeenCalled();
    });

    test('POST /api/auth/reset-password calls the resetPassword controller', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'reset-token', password: 'new-password' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(require('../controllers/auth').resetPassword).toHaveBeenCalled();
    });

    test('GET /api/auth/verify-email calls the verifyEmail controller', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'verification-token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(require('../controllers/auth').verifyEmail).toHaveBeenCalled();
    });
  });

  describe('User Routes', () => {
    test('GET /api/users/profile calls the getProfile controller with authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(require('../controllers/users').getProfile).toHaveBeenCalled();
    });

    test('PUT /api/users/profile calls the updateProfile controller with authentication', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(require('../controllers/users').updateProfile).toHaveBeenCalled();
    });

    test('GET /api/users/favorites calls the getFavorites controller with authentication', async () => {
      const response = await request(app)
        .get('/api/users/favorites');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('favorites');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(require('../controllers/users').getFavorites).toHaveBeenCalled();
    });

    test('POST /api/users/favorites calls the addFavorite controller with authentication', async () => {
      const response = await request(app)
        .post('/api/users/favorites')
        .send({ quoteId: 'quote-id' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(require('../controllers/users').addFavorite).toHaveBeenCalled();
    });

    test('DELETE /api/users/favorites/:quoteId calls the removeFavorite controller with authentication', async () => {
      const response = await request(app)
        .delete('/api/users/favorites/quote-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(require('../controllers/users').removeFavorite).toHaveBeenCalled();
    });

    test('GET /api/users/favorites/check/:quoteId calls the checkFavorite controller with authentication', async () => {
      const response = await request(app)
        .get('/api/users/favorites/check/quote-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isFavorite');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(require('../controllers/users').checkFavorite).toHaveBeenCalled();
    });

    test('GET /api/users/activity calls the getActivity controller with authentication', async () => {
      const response = await request(app)
        .get('/api/users/activity');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activity');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(require('../controllers/users').getActivity).toHaveBeenCalled();
    });

    test('GET /api/users/stats calls the getStats controller with authentication', async () => {
      const response = await request(app)
        .get('/api/users/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(require('../controllers/users').getStats).toHaveBeenCalled();
    });
  });

  describe('Quote Routes', () => {
    test('GET /api/quotes calls the getQuotes controller', async () => {
      const response = await request(app)
        .get('/api/quotes');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quotes');
      expect(require('../controllers/quotes').getQuotes).toHaveBeenCalled();
    });

    test('GET /api/quotes/:id calls the getQuoteById controller', async () => {
      const response = await request(app)
        .get('/api/quotes/quote-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quote');
      expect(require('../controllers/quotes').getQuoteById).toHaveBeenCalled();
    });

    test('GET /api/quotes/random calls the getRandomQuote controller', async () => {
      const response = await request(app)
        .get('/api/quotes/random');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quote');
      expect(require('../controllers/quotes').getRandomQuote).toHaveBeenCalled();
    });

    test('GET /api/quotes/search calls the searchQuotes controller', async () => {
      const response = await request(app)
        .get('/api/quotes/search')
        .query({ q: 'inspiration' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quotes');
      expect(require('../controllers/quotes').searchQuotes).toHaveBeenCalled();
    });

    test('GET /api/quotes/tags/:tag calls the getQuotesByTag controller', async () => {
      const response = await request(app)
        .get('/api/quotes/tags/inspiration');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quotes');
      expect(require('../controllers/quotes').getQuotesByTag).toHaveBeenCalled();
    });

    test('GET /api/quotes/authors/:author calls the getQuotesByAuthor controller', async () => {
      const response = await request(app)
        .get('/api/quotes/authors/Einstein');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quotes');
      expect(require('../controllers/quotes').getQuotesByAuthor).toHaveBeenCalled();
    });

    test('GET /api/quotes/tags calls the getTags controller', async () => {
      const response = await request(app)
        .get('/api/quotes/tags');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tags');
      expect(require('../controllers/quotes').getTags).toHaveBeenCalled();
    });

    test('GET /api/quotes/authors calls the getAuthors controller', async () => {
      const response = await request(app)
        .get('/api/quotes/authors');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authors');
      expect(require('../controllers/quotes').getAuthors).toHaveBeenCalled();
    });
  });

  describe('Admin Routes', () => {
    test('GET /api/admin/users calls the getUsers controller with admin authorization', async () => {
      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(authMiddleware.authorize).toHaveBeenCalledWith(['admin']);
      expect(require('../controllers/admin').getUsers).toHaveBeenCalled();
    });

    test('GET /api/admin/users/:id calls the getUserById controller with admin authorization', async () => {
      const response = await request(app)
        .get('/api/admin/users/user-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(authMiddleware.authorize).toHaveBeenCalledWith(['admin']);
      expect(require('../controllers/admin').getUserById).toHaveBeenCalled();
    });

    test('PUT /api/admin/users/:id calls the updateUser controller with admin authorization', async () => {
      const response = await request(app)
        .put('/api/admin/users/user-id')
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(authMiddleware.authorize).toHaveBeenCalledWith(['admin']);
      expect(require('../controllers/admin').updateUser).toHaveBeenCalled();
    });

    test('DELETE /api/admin/users/:id calls the deleteUser controller with admin authorization', async () => {
      const response = await request(app)
        .delete('/api/admin/users/user-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(authMiddleware.authorize).toHaveBeenCalledWith(['admin']);
      expect(require('../controllers/admin').deleteUser).toHaveBeenCalled();
    });

    test('GET /api/admin/quotes calls the getAllQuotes controller with admin authorization', async () => {
      const response = await request(app)
        .get('/api/admin/quotes');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quotes');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(authMiddleware.authorize).toHaveBeenCalledWith(['admin']);
      expect(require('../controllers/admin').getAllQuotes).toHaveBeenCalled();
    });

    test('POST /api/admin/quotes calls the createQuote controller with admin authorization', async () => {
      const response = await request(app)
        .post('/api/admin/quotes')
        .send({ text: 'New quote', author: 'Author', tags: ['inspiration'] });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('quote');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(authMiddleware.authorize).toHaveBeenCalledWith(['admin']);
      expect(require('../controllers/admin').createQuote).toHaveBeenCalled();
    });

    test('PUT /api/admin/quotes/:id calls the updateQuote controller with admin authorization', async () => {
      const response = await request(app)
        .put('/api/admin/quotes/quote-id')
        .send({ text: 'Updated quote' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(authMiddleware.authorize).toHaveBeenCalledWith(['admin']);
      expect(require('../controllers/admin').updateQuote).toHaveBeenCalled();
    });

    test('DELETE /api/admin/quotes/:id calls the deleteQuote controller with admin authorization', async () => {
      const response = await request(app)
        .delete('/api/admin/quotes/quote-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(authMiddleware.authorize).toHaveBeenCalledWith(['admin']);
      expect(require('../controllers/admin').deleteQuote).toHaveBeenCalled();
    });

    test('GET /api/admin/stats calls the getDashboardStats controller with admin authorization', async () => {
      const response = await request(app)
        .get('/api/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(authMiddleware.authorize).toHaveBeenCalledWith(['admin']);
      expect(require('../controllers/admin').getDashboardStats).toHaveBeenCalled();
    });

    test('GET /api/admin/activities calls the getActivityLogs controller with admin authorization', async () => {
      const response = await request(app)
        .get('/api/admin/activities');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activities');
      expect(authMiddleware.authenticate).toHaveBeenCalled();
      expect(authMiddleware.authorize).toHaveBeenCalledWith(['admin']);
      expect(require('../controllers/admin').getActivityLogs).toHaveBeenCalled();
    });
  });

  describe('API Health Check', () => {
    test('GET /api/health returns 200 status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('API Documentation', () => {
    test('GET /api/docs redirects to API documentation', async () => {
      const response = await request(app)
        .get('/api/docs');

      // Depending on implementation, this might redirect or serve docs directly
      expect(response.status).toBe(200);
    });
  });

  describe('404 Handler', () => {
    test('Non-existent route returns 404 status', async () => {
      const response = await request(app)
        .get('/api/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});