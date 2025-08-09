const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const httpMocks = require('node-mocks-http');
const { ApiError } = require('../../src/middleware/error.middleware');
const quoteController = require('../../src/controllers/quote.controller');

// Mock models
jest.mock('../../src/models/quote.model', () => {
  return {
    getRandom: jest.fn(),
    findById: jest.fn(),
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  };
});

jest.mock('../../src/models/user.model', () => {
  return {
    findById: jest.fn()
  };
});

jest.mock('../../src/models/userActivity.model', () => {
  return {
    logActivity: jest.fn().mockResolvedValue({})
  };
});

const Quote = require('../../src/models/quote.model');
const User = require('../../src/models/user.model');
const UserActivity = require('../../src/models/userActivity.model');

describe('Quote Controller', () => {
  let req, res, next;
  let mockQuote, mockUser;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock request and response objects
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();

    // Create mock quote
    mockQuote = {
      _id: new mongoose.Types.ObjectId(),
      text: 'Test quote',
      author: 'Test Author',
      tags: ['test', 'inspiration'],
      incrementViews: jest.fn().mockResolvedValue({}),
      save: jest.fn().mockResolvedValue({})
    };

    // Create mock user
    mockUser = {
      _id: new mongoose.Types.ObjectId(),
      addViewedQuote: jest.fn().mockResolvedValue({})
    };

    // Set up request user for authenticated routes
    req.user = mockUser;
  });

  describe('getRandomQuote', () => {
    test('should return a random quote', async () => {
      // Setup
      Quote.getRandom.mockResolvedValue(mockQuote);

      // Execute
      await quoteController.getRandomQuote(req, res);

      // Assert
      expect(Quote.getRandom).toHaveBeenCalled();
      expect(mockQuote.incrementViews).toHaveBeenCalled();
      expect(UserActivity.logActivity).toHaveBeenCalledWith(
        mockUser._id,
        'quote_viewed',
        { quoteId: mockQuote._id },
        req
      );
      expect(mockUser.addViewedQuote).toHaveBeenCalledWith(mockQuote._id);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ quote: mockQuote });
    });

    test('should throw error when no quotes are available', async () => {
      // Setup
      Quote.getRandom.mockResolvedValue(null);

      // Execute & Assert
      await expect(quoteController.getRandomQuote(req, res))
        .rejects
        .toThrow(ApiError);
    });

    test('should not log activity or add to viewed quotes if user is not authenticated', async () => {
      // Setup
      Quote.getRandom.mockResolvedValue(mockQuote);
      req.user = null;

      // Execute
      await quoteController.getRandomQuote(req, res);

      // Assert
      expect(Quote.getRandom).toHaveBeenCalled();
      expect(mockQuote.incrementViews).toHaveBeenCalled();
      expect(UserActivity.logActivity).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ quote: mockQuote });
    });
  });

  describe('getQuoteById', () => {
    test('should return a quote by ID', async () => {
      // Setup
      req.params.id = mockQuote._id;
      Quote.findById.mockResolvedValue(mockQuote);

      // Execute
      await quoteController.getQuoteById(req, res);

      // Assert
      expect(Quote.findById).toHaveBeenCalledWith(mockQuote._id);
      expect(mockQuote.incrementViews).toHaveBeenCalled();
      expect(UserActivity.logActivity).toHaveBeenCalledWith(
        mockUser._id,
        'quote_viewed',
        { quoteId: mockQuote._id },
        req
      );
      expect(mockUser.addViewedQuote).toHaveBeenCalledWith(mockQuote._id);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ quote: mockQuote });
    });

    test('should throw error when quote is not found', async () => {
      // Setup
      req.params.id = 'nonexistent-id';
      Quote.findById.mockResolvedValue(null);

      // Execute & Assert
      await expect(quoteController.getQuoteById(req, res))
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('getQuotesByTag', () => {
    test('should return quotes filtered by tag with pagination', async () => {
      // Setup
      const mockQuotes = [mockQuote, { ...mockQuote, _id: new mongoose.Types.ObjectId() }];
      const mockTotal = 2;
      
      req.params.tag = 'inspiration';
      req.query.page = '1';
      req.query.limit = '10';
      
      Quote.find.mockReturnThis();
      Quote.sort.mockReturnThis();
      Quote.skip.mockReturnThis();
      Quote.limit.mockResolvedValue(mockQuotes);
      Quote.countDocuments.mockResolvedValue(mockTotal);

      // Execute
      await quoteController.getQuotesByTag(req, res);

      // Assert
      expect(Quote.find).toHaveBeenCalledWith({ tags: 'inspiration' });
      expect(Quote.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(Quote.skip).toHaveBeenCalledWith(0);
      expect(Quote.limit).toHaveBeenCalledWith(10);
      expect(Quote.countDocuments).toHaveBeenCalledWith({ tags: 'inspiration' });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({
        quotes: mockQuotes,
        pagination: {
          total: mockTotal,
          page: 1,
          limit: 10,
          pages: 1
        }
      });
    });
  });

  describe('getAllQuotes', () => {
    test('should return all quotes with pagination', async () => {
      // Setup
      const mockQuotes = [mockQuote, { ...mockQuote, _id: new mongoose.Types.ObjectId() }];
      const mockTotal = 2;
      
      req.query.page = '1';
      req.query.limit = '10';
      
      Quote.find.mockReturnThis();
      Quote.sort.mockReturnThis();
      Quote.skip.mockReturnThis();
      Quote.limit.mockResolvedValue(mockQuotes);
      Quote.countDocuments.mockResolvedValue(mockTotal);

      // Execute
      await quoteController.getAllQuotes(req, res);

      // Assert
      expect(Quote.find).toHaveBeenCalledWith({});
      expect(Quote.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(Quote.skip).toHaveBeenCalledWith(0);
      expect(Quote.limit).toHaveBeenCalledWith(10);
      expect(Quote.countDocuments).toHaveBeenCalledWith({});
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({
        quotes: mockQuotes,
        pagination: {
          total: mockTotal,
          page: 1,
          limit: 10,
          pages: 1
        }
      });
    });

    test('should handle search query', async () => {
      // Setup
      const mockQuotes = [mockQuote];
      const mockTotal = 1;
      
      req.query.search = 'inspiration';
      
      Quote.find.mockReturnThis();
      Quote.sort.mockReturnThis();
      Quote.skip.mockReturnThis();
      Quote.limit.mockResolvedValue(mockQuotes);
      Quote.countDocuments.mockResolvedValue(mockTotal);

      // Execute
      await quoteController.getAllQuotes(req, res);

      // Assert
      expect(Quote.find).toHaveBeenCalledWith({ $text: { $search: 'inspiration' } });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().quotes).toEqual(mockQuotes);
    });
  });

  describe('createQuote', () => {
    test('should create a new quote', async () => {
      // Setup
      req.body = {
        text: 'New quote',
        author: 'New Author',
        source: 'Book',
        tags: ['new', 'test']
      };
      
      Quote.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        ...req.body
      });

      // Execute
      await quoteController.createQuote(req, res);

      // Assert
      expect(Quote.create).toHaveBeenCalledWith({
        text: req.body.text,
        author: req.body.author,
        source: req.body.source,
        tags: req.body.tags
      });
      expect(UserActivity.logActivity).toHaveBeenCalled();
      expect(res.statusCode).toBe(201);
      expect(res._getJSONData()).toHaveProperty('quote');
    });

    test('should throw error when required fields are missing', async () => {
      // Setup
      req.body = {
        text: 'New quote'
        // Missing author
      };

      // Execute & Assert
      await expect(quoteController.createQuote(req, res))
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('updateQuote', () => {
    test('should update an existing quote', async () => {
      // Setup
      req.params.id = mockQuote._id;
      req.body = {
        text: 'Updated quote',
        author: 'Updated Author',
        source: 'Updated Source',
        tags: ['updated', 'test']
      };
      
      Quote.findById.mockResolvedValue(mockQuote);

      // Execute
      await quoteController.updateQuote(req, res);

      // Assert
      expect(Quote.findById).toHaveBeenCalledWith(mockQuote._id);
      expect(mockQuote.text).toBe(req.body.text);
      expect(mockQuote.author).toBe(req.body.author);
      expect(mockQuote.source).toBe(req.body.source);
      expect(mockQuote.tags).toBe(req.body.tags);
      expect(mockQuote.save).toHaveBeenCalled();
      expect(UserActivity.logActivity).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ quote: mockQuote });
    });

    test('should throw error when quote is not found', async () => {
      // Setup
      req.params.id = 'nonexistent-id';
      Quote.findById.mockResolvedValue(null);

      // Execute & Assert
      await expect(quoteController.updateQuote(req, res))
        .rejects
        .toThrow(ApiError);
    });

    test('should handle partial updates', async () => {
      // Setup
      req.params.id = mockQuote._id;
      req.body = {
        text: 'Updated quote'
        // Only updating text
      };
      
      const originalAuthor = mockQuote.author;
      const originalTags = mockQuote.tags;
      
      Quote.findById.mockResolvedValue(mockQuote);

      // Execute
      await quoteController.updateQuote(req, res);

      // Assert
      expect(mockQuote.text).toBe(req.body.text);
      expect(mockQuote.author).toBe(originalAuthor); // Should remain unchanged
      expect(mockQuote.tags).toBe(originalTags); // Should remain unchanged
      expect(mockQuote.save).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });

  describe('deleteQuote', () => {
    test('should delete a quote', async () => {
      // Setup
      req.params.id = mockQuote._id;
      Quote.findByIdAndDelete.mockResolvedValue(mockQuote);

      // Execute
      await quoteController.deleteQuote(req, res);

      // Assert
      expect(Quote.findByIdAndDelete).toHaveBeenCalledWith(mockQuote._id);
      expect(UserActivity.logActivity).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({
        success: true,
        message: 'Quote deleted successfully'
      });
    });

    test('should throw error when quote is not found', async () => {
      // Setup
      req.params.id = 'nonexistent-id';
      Quote.findByIdAndDelete.mockResolvedValue(null);

      // Execute & Assert
      await expect(quoteController.deleteQuote(req, res))
        .rejects
        .toThrow(ApiError);
    });
  });
});