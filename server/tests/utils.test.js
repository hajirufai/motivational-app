const {
  generateToken,
  hashPassword,
  comparePassword,
  sanitizeUser,
  paginateResults,
  validateObjectId,
  formatErrorResponse,
  generateSlug,
  parseQueryFilters,
  calculateStreak
} = require('../utils');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token')
}));

describe('Server Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    test('generates JWT token with correct payload and options', () => {
      // Set up test environment
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_EXPIRES_IN = '1h';

      const userId = 'user123';
      const role = 'user';

      // Call the function
      const token = generateToken(userId, role);

      // Check that jwt.sign was called with correct parameters
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, role },
        'test-secret',
        { expiresIn: '1h' }
      );

      // Check that the function returns the token from jwt.sign
      expect(token).toBe('mock-token');
    });

    test('uses default expiration when not set in environment', () => {
      // Set up test environment
      process.env.JWT_SECRET = 'test-secret';
      delete process.env.JWT_EXPIRES_IN;

      const userId = 'user123';
      const role = 'user';

      // Call the function
      generateToken(userId, role);

      // Check that jwt.sign was called with default expiration
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, role },
        'test-secret',
        { expiresIn: '1d' } // Default value
      );
    });
  });

  describe('hashPassword and comparePassword', () => {
    test('hashes password and can verify it', async () => {
      const password = 'securePassword123';

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Check that the hashed password is not the original
      expect(hashedPassword).not.toBe(password);

      // Verify the password
      const isMatch = await comparePassword(password, hashedPassword);
      expect(isMatch).toBe(true);
    });

    test('comparePassword returns false for incorrect password', async () => {
      const password = 'securePassword123';
      const wrongPassword = 'wrongPassword123';

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Verify with wrong password
      const isMatch = await comparePassword(wrongPassword, hashedPassword);
      expect(isMatch).toBe(false);
    });
  });

  describe('sanitizeUser', () => {
    test('removes sensitive fields from user object', () => {
      const user = {
        _id: 'user123',
        email: 'user@example.com',
        password: 'hashedPassword',
        role: 'user',
        createdAt: new Date(),
        __v: 0,
        displayName: 'Test User',
        preferences: { theme: 'dark' }
      };

      const sanitized = sanitizeUser(user);

      // Check that sensitive fields are removed
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('__v');

      // Check that non-sensitive fields are preserved
      expect(sanitized).toHaveProperty('_id', 'user123');
      expect(sanitized).toHaveProperty('email', 'user@example.com');
      expect(sanitized).toHaveProperty('role', 'user');
      expect(sanitized).toHaveProperty('displayName', 'Test User');
      expect(sanitized).toHaveProperty('preferences');
      expect(sanitized.preferences).toHaveProperty('theme', 'dark');
    });

    test('handles user object as mongoose document', () => {
      // Create a mock mongoose document
      const user = {
        _id: 'user123',
        email: 'user@example.com',
        password: 'hashedPassword',
        role: 'user',
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          email: 'user@example.com',
          password: 'hashedPassword',
          role: 'user',
          __v: 0
        })
      };

      const sanitized = sanitizeUser(user);

      // Check that toObject was called
      expect(user.toObject).toHaveBeenCalled();

      // Check that sensitive fields are removed
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('__v');

      // Check that non-sensitive fields are preserved
      expect(sanitized).toHaveProperty('_id', 'user123');
      expect(sanitized).toHaveProperty('email', 'user@example.com');
      expect(sanitized).toHaveProperty('role', 'user');
    });
  });

  describe('paginateResults', () => {
    test('paginates results correctly', () => {
      // Create test data
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
      const page = 2;
      const limit = 10;

      // Call the function
      const result = paginateResults(items, page, limit);

      // Check pagination metadata
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toEqual({
        total: 50,
        page: 2,
        limit: 10,
        pages: 5
      });

      // Check that correct items are returned
      expect(result.items).toHaveLength(10);
      expect(result.items[0]).toEqual({ id: 11 }); // First item on page 2
      expect(result.items[9]).toEqual({ id: 20 }); // Last item on page 2
    });

    test('handles empty results', () => {
      const items = [];
      const page = 1;
      const limit = 10;

      const result = paginateResults(items, page, limit);

      expect(result).toHaveProperty('items', []);
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        pages: 0
      });
    });

    test('handles page exceeding total pages', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
      const page = 3; // Only 1 page of results exists
      const limit = 10;

      const result = paginateResults(items, page, limit);

      // Should return empty items but correct pagination metadata
      expect(result).toHaveProperty('items', []);
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toEqual({
        total: 5,
        page: 3,
        limit: 10,
        pages: 1
      });
    });

    test('uses default values when page and limit are not provided', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));

      const result = paginateResults(items);

      expect(result).toHaveProperty('items');
      expect(result.items).toHaveLength(10); // Default limit
      expect(result.pagination).toEqual({
        total: 50,
        page: 1, // Default page
        limit: 10, // Default limit
        pages: 5
      });
    });
  });

  describe('validateObjectId', () => {
    test('returns true for valid MongoDB ObjectId', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      expect(validateObjectId(validId)).toBe(true);
    });

    test('returns false for invalid MongoDB ObjectId', () => {
      expect(validateObjectId('invalid-id')).toBe(false);
      expect(validateObjectId('123')).toBe(false);
      expect(validateObjectId('')).toBe(false);
      expect(validateObjectId(null)).toBe(false);
      expect(validateObjectId(undefined)).toBe(false);
    });
  });

  describe('formatErrorResponse', () => {
    test('formats validation error correctly', () => {
      const validationError = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          password: { message: 'Password must be at least 8 characters' }
        }
      };

      const response = formatErrorResponse(validationError);

      expect(response).toHaveProperty('message', 'Validation Error');
      expect(response).toHaveProperty('errors');
      expect(response.errors).toHaveLength(2);
      expect(response.errors).toContainEqual({
        field: 'email',
        message: 'Email is required'
      });
      expect(response.errors).toContainEqual({
        field: 'password',
        message: 'Password must be at least 8 characters'
      });
    });

    test('formats MongoDB duplicate key error correctly', () => {
      const duplicateError = {
        name: 'MongoError',
        code: 11000,
        keyValue: { email: 'user@example.com' }
      };

      const response = formatErrorResponse(duplicateError);

      expect(response).toHaveProperty('message', 'Duplicate Key Error');
      expect(response).toHaveProperty('field', 'email');
      expect(response).toHaveProperty('value', 'user@example.com');
    });

    test('formats generic error correctly', () => {
      const genericError = new Error('Something went wrong');

      const response = formatErrorResponse(genericError);

      expect(response).toHaveProperty('message', 'Something went wrong');
    });

    test('handles error as string', () => {
      const errorString = 'Error message as string';

      const response = formatErrorResponse(errorString);

      expect(response).toHaveProperty('message', 'Error message as string');
    });
  });

  describe('generateSlug', () => {
    test('generates slug from string correctly', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
      expect(generateSlug('This is a Test')).toBe('this-is-a-test');
      expect(generateSlug('Special Characters: !@#$%^&*()')).toBe('special-characters');
    });

    test('handles empty or invalid input', () => {
      expect(generateSlug('')).toBe('');
      expect(generateSlug(null)).toBe('');
      expect(generateSlug(undefined)).toBe('');
      expect(generateSlug(123)).toBe('123');
    });

    test('trims and normalizes whitespace', () => {
      expect(generateSlug('  Trim  Spaces  ')).toBe('trim-spaces');
      expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
      expect(generateSlug('Tabs\tAnd\nNewlines')).toBe('tabs-and-newlines');
    });

    test('handles non-ASCII characters', () => {
      expect(generateSlug('Café')).toBe('cafe');
      expect(generateSlug('Über')).toBe('uber');
      expect(generateSlug('Niño')).toBe('nino');
    });
  });

  describe('parseQueryFilters', () => {
    test('parses simple query parameters correctly', () => {
      const query = {
        search: 'test',
        category: 'inspiration',
        active: 'true'
      };

      const result = parseQueryFilters(query);

      expect(result).toEqual({
        search: 'test',
        category: 'inspiration',
        active: true
      });
    });

    test('converts numeric strings to numbers', () => {
      const query = {
        page: '1',
        limit: '10',
        price: '19.99'
      };

      const result = parseQueryFilters(query);

      expect(result).toEqual({
        page: 1,
        limit: 10,
        price: 19.99
      });
    });

    test('converts boolean strings to booleans', () => {
      const query = {
        active: 'true',
        featured: 'false',
        published: 'TRUE',
        archived: 'FALSE'
      };

      const result = parseQueryFilters(query);

      expect(result).toEqual({
        active: true,
        featured: false,
        published: true,
        archived: false
      });
    });

    test('parses comma-separated values into arrays', () => {
      const query = {
        tags: 'inspiration,motivation,success',
        categories: 'personal,professional'
      };

      const result = parseQueryFilters(query);

      expect(result).toEqual({
        tags: ['inspiration', 'motivation', 'success'],
        categories: ['personal', 'professional']
      });
    });

    test('handles date strings', () => {
      const query = {
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01T12:00:00Z'
      };

      const result = parseQueryFilters(query);

      // Dates should be converted to Date objects
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toContain('2023-01-01');
      expect(result.updatedAt.toISOString()).toBe('2023-01-01T12:00:00.000Z');
    });

    test('handles range operators', () => {
      const query = {
        'price[gte]': '10',
        'price[lte]': '100',
        'createdAt[gt]': '2023-01-01',
        'createdAt[lt]': '2023-12-31'
      };

      const result = parseQueryFilters(query);

      expect(result).toEqual({
        price: { $gte: 10, $lte: 100 },
        createdAt: {
          $gt: expect.any(Date),
          $lt: expect.any(Date)
        }
      });

      // Check that dates are correctly parsed
      expect(result.createdAt.$gt.toISOString()).toContain('2023-01-01');
      expect(result.createdAt.$lt.toISOString()).toContain('2023-12-31');
    });

    test('ignores null, undefined, and empty string values', () => {
      const query = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        validValue: 'test'
      };

      const result = parseQueryFilters(query);

      expect(result).toEqual({
        validValue: 'test'
      });
    });
  });

  describe('calculateStreak', () => {
    test('calculates current streak correctly', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      // Format dates as ISO strings (YYYY-MM-DD)
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      const activityDates = [
        formatDate(today),
        formatDate(yesterday),
        formatDate(twoDaysAgo)
      ];
      
      const result = calculateStreak(activityDates);
      
      expect(result).toEqual({
        currentStreak: 3,
        longestStreak: 3,
        lastActiveDate: formatDate(today)
      });
    });
    
    test('breaks streak when days are missed', () => {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const fourDaysAgo = new Date(today);
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      
      // Format dates as ISO strings (YYYY-MM-DD)
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      const activityDates = [
        formatDate(today),
        formatDate(threeDaysAgo),
        formatDate(fourDaysAgo)
      ];
      
      const result = calculateStreak(activityDates);
      
      expect(result).toEqual({
        currentStreak: 1, // Only today
        longestStreak: 2, // Three and four days ago
        lastActiveDate: formatDate(today)
      });
    });
    
    test('handles empty activity dates', () => {
      const result = calculateStreak([]);
      
      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null
      });
    });
    
    test('handles streak broken today', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      // Format dates as ISO strings (YYYY-MM-DD)
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      const activityDates = [
        formatDate(yesterday),
        formatDate(twoDaysAgo),
        formatDate(threeDaysAgo)
      ];
      
      const result = calculateStreak(activityDates);
      
      expect(result).toEqual({
        currentStreak: 0, // Streak broken today
        longestStreak: 3,
        lastActiveDate: formatDate(yesterday)
      });
    });
    
    test('handles multiple activity entries on the same day', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Format dates as ISO strings (YYYY-MM-DD)
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      const activityDates = [
        formatDate(today),
        formatDate(today), // Duplicate entry for today
        formatDate(yesterday)
      ];
      
      const result = calculateStreak(activityDates);
      
      expect(result).toEqual({
        currentStreak: 2,
        longestStreak: 2,
        lastActiveDate: formatDate(today)
      });
    });
  });
});