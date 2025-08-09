const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const httpMocks = require('node-mocks-http');
const { ApiError } = require('../../src/middleware/error.middleware');
const userController = require('../../src/controllers/user.controller');

// Mock models
jest.mock('../../src/models/user.model', () => {
  return {
    findById: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis()
  };
});

jest.mock('../../src/models/quote.model', () => {
  return {
    findById: jest.fn()
  };
});

jest.mock('../../src/models/userActivity.model', () => {
  return {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    countDocuments: jest.fn(),
    logActivity: jest.fn().mockResolvedValue({})
  };
});

const User = require('../../src/models/user.model');
const Quote = require('../../src/models/quote.model');
const UserActivity = require('../../src/models/userActivity.model');

describe('User Controller', () => {
  let req, res, next;
  let mockUser, mockQuote;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock request and response objects
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();

    // Create mock user
    mockUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      displayName: 'Test User',
      preferences: {
        theme: 'light',
        emailNotifications: true
      },
      favorites: [],
      save: jest.fn().mockResolvedValue({})
    };

    // Create mock quote
    mockQuote = {
      _id: new mongoose.Types.ObjectId(),
      text: 'Test quote',
      author: 'Test Author',
      tags: ['test', 'inspiration']
    };

    // Set up request user for authenticated routes
    req.user = { _id: mockUser._id };
  });

  describe('getUserProfile', () => {
    test('should return user profile', async () => {
      // Setup
      User.findById.mockReturnThis();
      User.select.mockResolvedValue(mockUser);

      // Execute
      await userController.getUserProfile(req, res);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(User.select).toHaveBeenCalledWith('-__v');
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ user: mockUser });
    });

    test('should throw error when user is not found', async () => {
      // Setup
      User.findById.mockReturnThis();
      User.select.mockResolvedValue(null);

      // Execute & Assert
      await expect(userController.getUserProfile(req, res))
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('updateUserProfile', () => {
    test('should update user profile with all fields', async () => {
      // Setup
      req.body = {
        displayName: 'Updated Name',
        preferences: {
          theme: 'dark',
          emailNotifications: false
        }
      };
      
      User.findById.mockResolvedValue(mockUser);

      // Execute
      await userController.updateUserProfile(req, res);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockUser.displayName).toBe(req.body.displayName);
      expect(mockUser.preferences).toEqual(req.body.preferences);
      expect(mockUser.save).toHaveBeenCalled();
      expect(UserActivity.logActivity).toHaveBeenCalledWith(
        mockUser._id,
        'profile_updated',
        {},
        req
      );
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ user: mockUser });
    });

    test('should update only provided fields', async () => {
      // Setup
      req.body = {
        displayName: 'Updated Name'
        // No preferences
      };
      
      const originalPreferences = { ...mockUser.preferences };
      User.findById.mockResolvedValue(mockUser);

      // Execute
      await userController.updateUserProfile(req, res);

      // Assert
      expect(mockUser.displayName).toBe(req.body.displayName);
      expect(mockUser.preferences).toEqual(originalPreferences); // Should remain unchanged
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    test('should throw error when user is not found', async () => {
      // Setup
      User.findById.mockResolvedValue(null);

      // Execute & Assert
      await expect(userController.updateUserProfile(req, res))
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('getUserActivity', () => {
    test('should return user activity with pagination', async () => {
      // Setup
      const mockActivities = [
        { type: 'quote_viewed', timestamp: new Date() },
        { type: 'profile_updated', timestamp: new Date() }
      ];
      const mockTotal = 2;
      
      req.query.page = '1';
      req.query.limit = '10';
      
      UserActivity.find.mockReturnThis();
      UserActivity.sort.mockReturnThis();
      UserActivity.skip.mockReturnThis();
      UserActivity.limit.mockResolvedValue(mockActivities);
      UserActivity.countDocuments.mockResolvedValue(mockTotal);

      // Execute
      await userController.getUserActivity(req, res);

      // Assert
      expect(UserActivity.find).toHaveBeenCalledWith({ userId: mockUser._id });
      expect(UserActivity.sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(UserActivity.skip).toHaveBeenCalledWith(0);
      expect(UserActivity.limit).toHaveBeenCalledWith(10);
      expect(UserActivity.countDocuments).toHaveBeenCalledWith({ userId: mockUser._id });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({
        activities: mockActivities,
        pagination: {
          total: mockTotal,
          page: 1,
          limit: 10,
          pages: 1
        }
      });
    });
  });

  describe('getFavorites', () => {
    test('should return user favorites', async () => {
      // Setup
      mockUser.favorites = [mockQuote._id];
      User.findById.mockReturnThis();
      User.populate.mockResolvedValue(mockUser);

      // Execute
      await userController.getFavorites(req, res);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(User.populate).toHaveBeenCalledWith('favorites');
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ favorites: mockUser.favorites });
    });

    test('should return empty array when no favorites', async () => {
      // Setup
      mockUser.favorites = undefined;
      User.findById.mockReturnThis();
      User.populate.mockResolvedValue(mockUser);

      // Execute
      await userController.getFavorites(req, res);

      // Assert
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ favorites: [] });
    });

    test('should throw error when user is not found', async () => {
      // Setup
      User.findById.mockReturnThis();
      User.populate.mockResolvedValue(null);

      // Execute & Assert
      await expect(userController.getFavorites(req, res))
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('addFavorite', () => {
    test('should add quote to favorites', async () => {
      // Setup
      req.params.quoteId = mockQuote._id;
      mockUser.favorites = [];
      
      Quote.findById.mockResolvedValue(mockQuote);
      User.findById.mockResolvedValue(mockUser);

      // Execute
      await userController.addFavorite(req, res);

      // Assert
      expect(Quote.findById).toHaveBeenCalledWith(mockQuote._id);
      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockUser.favorites).toContain(mockQuote._id);
      expect(mockUser.save).toHaveBeenCalled();
      expect(UserActivity.logActivity).toHaveBeenCalledWith(
        mockUser._id,
        'favorite_added',
        { quoteId: mockQuote._id },
        req
      );
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toHaveProperty('message');
      expect(res._getJSONData()).toHaveProperty('favorites');
    });

    test('should not add duplicate to favorites', async () => {
      // Setup
      req.params.quoteId = mockQuote._id;
      mockUser.favorites = [mockQuote._id]; // Already in favorites
      
      Quote.findById.mockResolvedValue(mockQuote);
      User.findById.mockResolvedValue(mockUser);

      // Execute
      await userController.addFavorite(req, res);

      // Assert
      expect(mockUser.favorites).toHaveLength(1); // Still only one item
      expect(mockUser.save).not.toHaveBeenCalled(); // No need to save
      expect(UserActivity.logActivity).not.toHaveBeenCalled(); // No activity logged
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().message).toContain('already in favorites');
    });

    test('should throw error when quote is not found', async () => {
      // Setup
      req.params.quoteId = 'nonexistent-id';
      Quote.findById.mockResolvedValue(null);

      // Execute & Assert
      await expect(userController.addFavorite(req, res))
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('removeFavorite', () => {
    test('should remove quote from favorites', async () => {
      // Setup
      req.params.quoteId = mockQuote._id.toString();
      mockUser.favorites = [mockQuote._id];
      
      User.findById.mockResolvedValue(mockUser);

      // Execute
      await userController.removeFavorite(req, res);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockUser.favorites).toHaveLength(0); // Quote removed
      expect(mockUser.save).toHaveBeenCalled();
      expect(UserActivity.logActivity).toHaveBeenCalledWith(
        mockUser._id,
        'favorite_removed',
        { quoteId: mockQuote._id.toString() },
        req
      );
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().message).toContain('removed from favorites');
    });

    test('should handle quote not in favorites', async () => {
      // Setup
      req.params.quoteId = mockQuote._id.toString();
      mockUser.favorites = []; // Empty favorites
      
      User.findById.mockResolvedValue(mockUser);

      // Execute
      await userController.removeFavorite(req, res);

      // Assert
      expect(mockUser.save).not.toHaveBeenCalled(); // No need to save
      expect(UserActivity.logActivity).not.toHaveBeenCalled(); // No activity logged
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().message).toContain('not in favorites');
    });

    test('should throw error when user is not found', async () => {
      // Setup
      User.findById.mockResolvedValue(null);

      // Execute & Assert
      await expect(userController.removeFavorite(req, res))
        .rejects
        .toThrow(ApiError);
    });
  });
});