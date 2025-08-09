const mongoose = require('mongoose');
const { mockRequest, mockResponse } = require('jest-mock-req-res');
const adminController = require('../../src/controllers/admin.controller');
const User = require('../../src/models/user.model');
const Quote = require('../../src/models/quote.model');
const UserActivity = require('../../src/models/userActivity.model');
const { ApiError } = require('../../src/middleware/error.middleware');

// Mock the models
jest.mock('../../src/models/user.model');
jest.mock('../../src/models/quote.model');
jest.mock('../../src/models/userActivity.model');
jest.mock('../../src/middleware/error.middleware');

describe('Admin Controller', () => {
  let req;
  let res;
  
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default request user (admin)
    req.user = {
      _id: 'admin-user-id',
      role: 'admin'
    };
  });
  
  describe('getAllUsers', () => {
    beforeEach(() => {
      // Setup default query parameters
      req.query = { page: '1', limit: '10' };
      
      // Mock User.find chain
      const mockUserFind = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { _id: 'user1', email: 'user1@example.com', displayName: 'User One' },
          { _id: 'user2', email: 'user2@example.com', displayName: 'User Two' }
        ])
      };
      
      User.find.mockReturnValue(mockUserFind);
      User.countDocuments.mockResolvedValue(20);
    });
    
    test('should get all users with pagination', async () => {
      await adminController.getAllUsers(req, res);
      
      expect(User.find).toHaveBeenCalledWith({});
      expect(User.countDocuments).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        users: expect.any(Array),
        pagination: {
          total: 20,
          page: 1,
          limit: 10,
          pages: 2
        }
      });
    });
    
    test('should handle search query', async () => {
      req.query.search = 'test';
      
      await adminController.getAllUsers(req, res);
      
      expect(User.find).toHaveBeenCalledWith({
        $or: [
          { email: { $regex: 'test', $options: 'i' } },
          { displayName: { $regex: 'test', $options: 'i' } }
        ]
      });
    });
    
    test('should use default pagination values when not provided', async () => {
      req.query = {}; // No page or limit
      
      await adminController.getAllUsers(req, res);
      
      // Should use default values (page 1, limit 10)
      const mockUserFind = User.find.mock.results[0].value;
      expect(mockUserFind.skip).toHaveBeenCalledWith(0); // (page-1) * limit = 0
      expect(mockUserFind.limit).toHaveBeenCalledWith(10);
    });
  });
  
  describe('getUserById', () => {
    beforeEach(() => {
      req.params = { id: 'user-id-123' };
      
      // Mock User.findById
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'user-id-123',
          email: 'user@example.com',
          displayName: 'Test User'
        })
      });
      
      // Mock UserActivity.find
      UserActivity.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { _id: 'activity1', action: 'login', timestamp: new Date() },
          { _id: 'activity2', action: 'quote_viewed', timestamp: new Date() }
        ])
      });
    });
    
    test('should get user by ID with recent activity', async () => {
      await adminController.getUserById(req, res);
      
      expect(User.findById).toHaveBeenCalledWith('user-id-123');
      expect(UserActivity.find).toHaveBeenCalledWith({ userId: 'user-id-123' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          _id: 'user-id-123',
          email: 'user@example.com'
        }),
        recentActivity: expect.any(Array)
      });
    });
    
    test('should throw error when user not found', async () => {
      // Mock user not found
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });
      
      // Mock ApiError.notFound
      ApiError.notFound = jest.fn(() => {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      });
      
      await expect(adminController.getUserById(req, res)).rejects.toThrow('User not found');
      expect(ApiError.notFound).toHaveBeenCalledWith('User not found');
    });
  });
  
  describe('updateUser', () => {
    let mockUser;
    
    beforeEach(() => {
      req.params = { id: 'user-id-123' };
      req.body = { role: 'admin', displayName: 'Updated Name' };
      
      // Create mock user with save method
      mockUser = {
        _id: 'user-id-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'user',
        preferences: { theme: 'light' },
        save: jest.fn().mockResolvedValue(undefined)
      };
      
      // Mock User.findById
      User.findById.mockResolvedValue(mockUser);
      
      // Mock UserActivity.logActivity
      UserActivity.logActivity = jest.fn().mockResolvedValue(undefined);
    });
    
    test('should update user role and displayName', async () => {
      await adminController.updateUser(req, res);
      
      expect(User.findById).toHaveBeenCalledWith('user-id-123');
      expect(mockUser.role).toBe('admin');
      expect(mockUser.displayName).toBe('Updated Name');
      expect(mockUser.save).toHaveBeenCalled();
      expect(UserActivity.logActivity).toHaveBeenCalledWith(
        'admin-user-id',
        'user_updated',
        { targetUserId: mockUser._id },
        req
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
    });
    
    test('should update user preferences', async () => {
      req.body = { preferences: { theme: 'dark', notifications: true } };
      
      await adminController.updateUser(req, res);
      
      expect(mockUser.preferences).toEqual({
        theme: 'dark',
        notifications: true
      });
      expect(mockUser.save).toHaveBeenCalled();
    });
    
    test('should throw error when user not found', async () => {
      // Mock user not found
      User.findById.mockResolvedValue(null);
      
      // Mock ApiError.notFound
      ApiError.notFound = jest.fn(() => {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      });
      
      await expect(adminController.updateUser(req, res)).rejects.toThrow('User not found');
      expect(ApiError.notFound).toHaveBeenCalledWith('User not found');
    });
    
    test('should only update valid role values', async () => {
      req.body = { role: 'invalid_role' };
      
      await adminController.updateUser(req, res);
      
      // Role should not be updated with invalid value
      expect(mockUser.role).toBe('user');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
  
  describe('deleteUser', () => {
    beforeEach(() => {
      req.params = { id: 'user-id-123' };
      
      // Mock User.findByIdAndDelete
      User.findByIdAndDelete.mockResolvedValue({
        _id: 'user-id-123',
        email: 'user@example.com'
      });
      
      // Mock UserActivity.logActivity
      UserActivity.logActivity = jest.fn().mockResolvedValue(undefined);
    });
    
    test('should delete user', async () => {
      await adminController.deleteUser(req, res);
      
      expect(User.findByIdAndDelete).toHaveBeenCalledWith('user-id-123');
      expect(UserActivity.logActivity).toHaveBeenCalledWith(
        'admin-user-id',
        'user_deleted',
        { targetUserId: 'user-id-123' },
        req
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully'
      });
    });
    
    test('should prevent deleting self', async () => {
      // Set request user ID to match the ID to delete
      req.user._id = { toString: () => 'user-id-123' };
      req.params.id = 'user-id-123';
      
      // Mock ApiError.badRequest
      ApiError.badRequest = jest.fn(() => {
        const error = new Error('Cannot delete your own account');
        error.statusCode = 400;
        throw error;
      });
      
      await expect(adminController.deleteUser(req, res)).rejects.toThrow('Cannot delete your own account');
      expect(ApiError.badRequest).toHaveBeenCalledWith('Cannot delete your own account');
      expect(User.findByIdAndDelete).not.toHaveBeenCalled();
    });
    
    test('should throw error when user not found', async () => {
      // Mock user not found
      User.findByIdAndDelete.mockResolvedValue(null);
      
      // Mock ApiError.notFound
      ApiError.notFound = jest.fn(() => {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      });
      
      await expect(adminController.deleteUser(req, res)).rejects.toThrow('User not found');
      expect(ApiError.notFound).toHaveBeenCalledWith('User not found');
    });
  });
  
  describe('getSystemStats', () => {
    beforeEach(() => {
      // Mock date for consistent testing
      jest.spyOn(global, 'Date').mockImplementation(() => {
        return {
          setDate: jest.fn(),
          setMonth: jest.fn(),
          getDate: jest.fn().mockReturnValue(15),
          getMonth: jest.fn().mockReturnValue(5) // June (0-indexed)
        };
      });
      
      // Mock User.countDocuments
      User.countDocuments.mockImplementation((query) => {
        if (!query) return Promise.resolve(100); // Total users
        if (query.lastLogin) return Promise.resolve(50); // Active users
        if (query.createdAt) return Promise.resolve(10); // New registrations
        return Promise.resolve(0);
      });
      
      // Mock Quote.countDocuments
      Quote.countDocuments.mockResolvedValue(500);
      
      // Mock Quote.find for top quotes
      Quote.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([
          { text: 'Quote 1', author: 'Author 1', views: 100 },
          { text: 'Quote 2', author: 'Author 2', views: 80 }
        ])
      });
      
      // Mock UserActivity.countDocuments
      UserActivity.countDocuments.mockImplementation((query) => {
        if (query.action === 'quote_viewed') {
          if (query.timestamp.$gte === 'oneDayAgo') return Promise.resolve(200);
          if (query.timestamp.$gte === 'oneWeekAgo') return Promise.resolve(1000);
          if (query.timestamp.$gte === 'oneMonthAgo') return Promise.resolve(3000);
        }
        return Promise.resolve(0);
      });
    });
    
    test('should return system statistics', async () => {
      await adminController.getSystemStats(req, res);
      
      expect(User.countDocuments).toHaveBeenCalledTimes(7); // Total + 3 active + 3 registrations
      expect(Quote.countDocuments).toHaveBeenCalledTimes(1);
      expect(Quote.find).toHaveBeenCalledTimes(1);
      expect(UserActivity.countDocuments).toHaveBeenCalledTimes(3); // Daily, weekly, monthly quotes served
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        stats: expect.objectContaining({
          totalUsers: 100,
          activeUsers: expect.any(Object),
          totalQuotes: 500,
          quotesServed: expect.any(Object),
          topQuotes: expect.any(Array),
          registrations: expect.any(Object)
        })
      });
    });
    
    afterEach(() => {
      // Restore Date mock
      global.Date.mockRestore();
    });
  });
  
  describe('getAllActivity', () => {
    beforeEach(() => {
      req.query = { page: '1', limit: '10' };
      
      // Mock UserActivity.find chain
      const mockActivityFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([
          { _id: 'activity1', userId: 'user1', action: 'login', timestamp: new Date() },
          { _id: 'activity2', userId: 'user2', action: 'quote_viewed', timestamp: new Date() }
        ])
      };
      
      UserActivity.find.mockReturnValue(mockActivityFind);
      UserActivity.countDocuments.mockResolvedValue(25);
    });
    
    test('should get all activity with pagination', async () => {
      await adminController.getAllActivity(req, res);
      
      expect(UserActivity.find).toHaveBeenCalledWith({});
      expect(UserActivity.countDocuments).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        activities: expect.any(Array),
        pagination: {
          total: 25,
          page: 1,
          limit: 10,
          pages: 3
        }
      });
    });
    
    test('should filter by userId when provided', async () => {
      req.query.userId = 'user-id-123';
      
      await adminController.getAllActivity(req, res);
      
      expect(UserActivity.find).toHaveBeenCalledWith({ userId: 'user-id-123' });
    });
    
    test('should filter by action when provided', async () => {
      req.query.action = 'login';
      
      await adminController.getAllActivity(req, res);
      
      expect(UserActivity.find).toHaveBeenCalledWith({ action: 'login' });
    });
    
    test('should filter by date range when provided', async () => {
      req.query.startDate = '2023-01-01';
      req.query.endDate = '2023-01-31';
      
      await adminController.getAllActivity(req, res);
      
      expect(UserActivity.find).toHaveBeenCalledWith({
        timestamp: {
          $gte: expect.any(Date),
          $lte: expect.any(Date)
        }
      });
    });
  });
  
  describe('importQuotes', () => {
    beforeEach(() => {
      req.body = {
        quotes: [
          { text: 'Quote 1', author: 'Author 1', tags: ['inspiration'] },
          { text: 'Quote 2', author: 'Author 2', source: 'Book', tags: ['motivation'] },
          { text: 'Invalid Quote', tags: ['missing-author'] } // Missing author
        ]
      };
      
      // Mock Quote.create
      Quote.create.mockImplementation((quote) => {
        if (!quote.text || !quote.author) {
          const error = new Error('Missing required fields');
          return Promise.reject(error);
        }
        return Promise.resolve(quote);
      });
      
      // Mock UserActivity.logActivity
      UserActivity.logActivity = jest.fn().mockResolvedValue(undefined);
    });
    
    test('should import valid quotes and report errors', async () => {
      await adminController.importQuotes(req, res);
      
      // Should create two valid quotes
      expect(Quote.create).toHaveBeenCalledTimes(3);
      expect(UserActivity.logActivity).toHaveBeenCalledWith(
        'admin-user-id',
        'quotes_imported',
        { count: 2 }, // Only 2 valid quotes
        req
      );
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        results: {
          total: 3,
          imported: 2,
          errors: expect.arrayContaining([
            expect.objectContaining({
              quote: expect.objectContaining({ text: 'Invalid Quote' }),
              error: expect.any(String)
            })
          ])
        }
      });
    });
    
    test('should throw error for invalid quotes data', async () => {
      req.body = { quotes: 'not-an-array' };
      
      // Mock ApiError.badRequest
      ApiError.badRequest = jest.fn(() => {
        const error = new Error('Invalid quotes data');
        error.statusCode = 400;
        throw error;
      });
      
      await expect(adminController.importQuotes(req, res)).rejects.toThrow('Invalid quotes data');
      expect(ApiError.badRequest).toHaveBeenCalled();
    });
    
    test('should throw error for empty quotes array', async () => {
      req.body = { quotes: [] };
      
      // Mock ApiError.badRequest
      ApiError.badRequest = jest.fn(() => {
        const error = new Error('Invalid quotes data');
        error.statusCode = 400;
        throw error;
      });
      
      await expect(adminController.importQuotes(req, res)).rejects.toThrow('Invalid quotes data');
      expect(ApiError.badRequest).toHaveBeenCalled();
    });
  });
  
  describe('exportQuotes', () => {
    beforeEach(() => {
      // Mock Quote.find chain
      Quote.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { _id: 'quote1', text: 'Quote 1', author: 'Author 1' },
          { _id: 'quote2', text: 'Quote 2', author: 'Author 2' }
        ])
      });
      
      // Mock UserActivity.logActivity
      UserActivity.logActivity = jest.fn().mockResolvedValue(undefined);
    });
    
    test('should export all quotes', async () => {
      await adminController.exportQuotes(req, res);
      
      expect(Quote.find).toHaveBeenCalled();
      expect(UserActivity.logActivity).toHaveBeenCalledWith(
        'admin-user-id',
        'quotes_exported',
        { count: 2 },
        req
      );
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        quotes: expect.arrayContaining([
          expect.objectContaining({ text: 'Quote 1' }),
          expect.objectContaining({ text: 'Quote 2' })
        ])
      });
    });
  });
});