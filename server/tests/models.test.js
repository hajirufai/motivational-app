const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Quote = require('../models/Quote');
const Activity = require('../models/Activity');
const Favorite = require('../models/Favorite');

describe('Database Models', () => {
  let mongoServer;

  beforeAll(async () => {
    // Set up the MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up the database after each test
    await User.deleteMany({});
    await Quote.deleteMany({});
    await Activity.deleteMany({});
    await Favorite.deleteMany({});
  });

  describe('User Model', () => {
    test('creates a user successfully with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
        role: 'user'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.displayName).toBe(userData.displayName);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();

      // Password should be hashed
      expect(savedUser.password).not.toBe(userData.password);
    });

    test('fails to create user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        displayName: 'Test User'
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    test('fails to create user with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      };

      // Create first user
      const user1 = new User(userData);
      await user1.save();

      // Try to create second user with same email
      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });

    test('fails to create user with password too short', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'short',
        displayName: 'Test User'
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    test('sets default role to "user" when not specified', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe('user');
    });

    test('comparePassword method works correctly', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      };

      const user = new User(userData);
      await user.save();

      // Test with correct password
      const isMatch = await user.comparePassword('Password123!');
      expect(isMatch).toBe(true);

      // Test with incorrect password
      const isNotMatch = await user.comparePassword('WrongPassword');
      expect(isNotMatch).toBe(false);
    });

    test('pre-save hook hashes password only when modified', async () => {
      // Create initial user
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      };

      const user = new User(userData);
      await user.save();
      const originalPassword = user.password;

      // Update user without changing password
      user.displayName = 'Updated Name';
      await user.save();

      // Password should remain the same
      expect(user.password).toBe(originalPassword);

      // Update user with new password
      user.password = 'NewPassword123!';
      await user.save();

      // Password should be different
      expect(user.password).not.toBe(originalPassword);
      expect(user.password).not.toBe('NewPassword123!');
    });
  });

  describe('Quote Model', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user for quote associations
      testUser = new User({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      });
      await testUser.save();
    });

    test('creates a quote successfully with valid data', async () => {
      const quoteData = {
        text: 'This is a test quote',
        author: 'Test Author',
        tags: ['inspiration', 'motivation'],
        addedBy: testUser._id
      };

      const quote = new Quote(quoteData);
      const savedQuote = await quote.save();

      expect(savedQuote._id).toBeDefined();
      expect(savedQuote.text).toBe(quoteData.text);
      expect(savedQuote.author).toBe(quoteData.author);
      expect(savedQuote.tags).toEqual(expect.arrayContaining(quoteData.tags));
      expect(savedQuote.addedBy.toString()).toBe(testUser._id.toString());
      expect(savedQuote.createdAt).toBeDefined();
      expect(savedQuote.updatedAt).toBeDefined();
      expect(savedQuote.viewCount).toBe(0);
    });

    test('fails to create quote without required text', async () => {
      const quoteData = {
        author: 'Test Author',
        tags: ['inspiration'],
        addedBy: testUser._id
      };

      const quote = new Quote(quoteData);

      await expect(quote.save()).rejects.toThrow();
    });

    test('fails to create quote without required author', async () => {
      const quoteData = {
        text: 'This is a test quote',
        tags: ['inspiration'],
        addedBy: testUser._id
      };

      const quote = new Quote(quoteData);

      await expect(quote.save()).rejects.toThrow();
    });

    test('creates quote with default empty tags array', async () => {
      const quoteData = {
        text: 'This is a test quote',
        author: 'Test Author',
        addedBy: testUser._id
      };

      const quote = new Quote(quoteData);
      const savedQuote = await quote.save();

      expect(savedQuote.tags).toEqual([]);
    });

    test('incrementViewCount method works correctly', async () => {
      const quoteData = {
        text: 'This is a test quote',
        author: 'Test Author',
        addedBy: testUser._id
      };

      const quote = new Quote(quoteData);
      await quote.save();

      // Initial view count should be 0
      expect(quote.viewCount).toBe(0);

      // Increment view count
      await quote.incrementViewCount();
      expect(quote.viewCount).toBe(1);

      // Increment again
      await quote.incrementViewCount();
      expect(quote.viewCount).toBe(2);

      // Verify persistence by fetching from database
      const fetchedQuote = await Quote.findById(quote._id);
      expect(fetchedQuote.viewCount).toBe(2);
    });

    test('virtual field for id works correctly', async () => {
      const quoteData = {
        text: 'This is a test quote',
        author: 'Test Author',
        addedBy: testUser._id
      };

      const quote = new Quote(quoteData);
      await quote.save();

      // Convert to JSON to trigger virtuals
      const quoteJson = quote.toJSON();

      expect(quoteJson.id).toBeDefined();
      expect(quoteJson.id).toBe(quote._id.toString());
    });
  });

  describe('Activity Model', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user for activity associations
      testUser = new User({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      });
      await testUser.save();
    });

    test('creates an activity successfully with valid data', async () => {
      const activityData = {
        user: testUser._id,
        type: 'login',
        details: { ip: '127.0.0.1', device: 'desktop' }
      };

      const activity = new Activity(activityData);
      const savedActivity = await activity.save();

      expect(savedActivity._id).toBeDefined();
      expect(savedActivity.user.toString()).toBe(testUser._id.toString());
      expect(savedActivity.type).toBe(activityData.type);
      expect(savedActivity.details).toEqual(activityData.details);
      expect(savedActivity.createdAt).toBeDefined();
    });

    test('fails to create activity without required user', async () => {
      const activityData = {
        type: 'login',
        details: { ip: '127.0.0.1' }
      };

      const activity = new Activity(activityData);

      await expect(activity.save()).rejects.toThrow();
    });

    test('fails to create activity without required type', async () => {
      const activityData = {
        user: testUser._id,
        details: { ip: '127.0.0.1' }
      };

      const activity = new Activity(activityData);

      await expect(activity.save()).rejects.toThrow();
    });

    test('creates activity with default empty details object', async () => {
      const activityData = {
        user: testUser._id,
        type: 'login'
      };

      const activity = new Activity(activityData);
      const savedActivity = await activity.save();

      expect(savedActivity.details).toEqual({});
    });

    test('validates activity type against allowed values', async () => {
      // Valid types
      const validTypes = ['login', 'logout', 'view_quote', 'favorite_quote', 'unfavorite_quote', 'profile_update'];

      for (const type of validTypes) {
        const activityData = {
          user: testUser._id,
          type
        };

        const activity = new Activity(activityData);
        const savedActivity = await activity.save();

        expect(savedActivity.type).toBe(type);
      }

      // Invalid type
      const activityData = {
        user: testUser._id,
        type: 'invalid_type'
      };

      const activity = new Activity(activityData);

      await expect(activity.save()).rejects.toThrow();
    });
  });

  describe('Favorite Model', () => {
    let testUser;
    let testQuote;

    beforeEach(async () => {
      // Create a test user
      testUser = new User({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      });
      await testUser.save();

      // Create a test quote
      testQuote = new Quote({
        text: 'This is a test quote',
        author: 'Test Author',
        addedBy: testUser._id
      });
      await testQuote.save();
    });

    test('creates a favorite successfully with valid data', async () => {
      const favoriteData = {
        user: testUser._id,
        quote: testQuote._id
      };

      const favorite = new Favorite(favoriteData);
      const savedFavorite = await favorite.save();

      expect(savedFavorite._id).toBeDefined();
      expect(savedFavorite.user.toString()).toBe(testUser._id.toString());
      expect(savedFavorite.quote.toString()).toBe(testQuote._id.toString());
      expect(savedFavorite.createdAt).toBeDefined();
    });

    test('fails to create favorite without required user', async () => {
      const favoriteData = {
        quote: testQuote._id
      };

      const favorite = new Favorite(favoriteData);

      await expect(favorite.save()).rejects.toThrow();
    });

    test('fails to create favorite without required quote', async () => {
      const favoriteData = {
        user: testUser._id
      };

      const favorite = new Favorite(favoriteData);

      await expect(favorite.save()).rejects.toThrow();
    });

    test('prevents duplicate favorites for the same user and quote', async () => {
      const favoriteData = {
        user: testUser._id,
        quote: testQuote._id
      };

      // Create first favorite
      const favorite1 = new Favorite(favoriteData);
      await favorite1.save();

      // Try to create duplicate favorite
      const favorite2 = new Favorite(favoriteData);
      await expect(favorite2.save()).rejects.toThrow();
    });

    test('allows different users to favorite the same quote', async () => {
      // Create second user
      const secondUser = new User({
        email: 'second@example.com',
        password: 'Password123!',
        displayName: 'Second User'
      });
      await secondUser.save();

      // First user favorites the quote
      const favorite1 = new Favorite({
        user: testUser._id,
        quote: testQuote._id
      });
      await favorite1.save();

      // Second user favorites the same quote
      const favorite2 = new Favorite({
        user: secondUser._id,
        quote: testQuote._id
      });
      const savedFavorite2 = await favorite2.save();

      expect(savedFavorite2._id).toBeDefined();
      expect(savedFavorite2.user.toString()).toBe(secondUser._id.toString());
      expect(savedFavorite2.quote.toString()).toBe(testQuote._id.toString());
    });

    test('allows same user to favorite different quotes', async () => {
      // Create second quote
      const secondQuote = new Quote({
        text: 'This is another test quote',
        author: 'Another Author',
        addedBy: testUser._id
      });
      await secondQuote.save();

      // User favorites first quote
      const favorite1 = new Favorite({
        user: testUser._id,
        quote: testQuote._id
      });
      await favorite1.save();

      // User favorites second quote
      const favorite2 = new Favorite({
        user: testUser._id,
        quote: secondQuote._id
      });
      const savedFavorite2 = await favorite2.save();

      expect(savedFavorite2._id).toBeDefined();
      expect(savedFavorite2.user.toString()).toBe(testUser._id.toString());
      expect(savedFavorite2.quote.toString()).toBe(secondQuote._id.toString());
    });
  });

  describe('Model Relationships', () => {
    let testUser;
    let testQuote;

    beforeEach(async () => {
      // Create a test user
      testUser = new User({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      });
      await testUser.save();

      // Create a test quote
      testQuote = new Quote({
        text: 'This is a test quote',
        author: 'Test Author',
        addedBy: testUser._id
      });
      await testQuote.save();
    });

    test('populates user reference in quote', async () => {
      // Fetch quote with populated user
      const populatedQuote = await Quote.findById(testQuote._id).populate('addedBy');

      expect(populatedQuote.addedBy).toBeInstanceOf(Object);
      expect(populatedQuote.addedBy._id.toString()).toBe(testUser._id.toString());
      expect(populatedQuote.addedBy.email).toBe(testUser.email);
      expect(populatedQuote.addedBy.displayName).toBe(testUser.displayName);
      // Password should not be included
      expect(populatedQuote.addedBy.password).toBeUndefined();
    });

    test('populates user and quote references in favorite', async () => {
      // Create a favorite
      const favorite = new Favorite({
        user: testUser._id,
        quote: testQuote._id
      });
      await favorite.save();

      // Fetch favorite with populated references
      const populatedFavorite = await Favorite.findById(favorite._id)
        .populate('user')
        .populate('quote');

      // Check user population
      expect(populatedFavorite.user).toBeInstanceOf(Object);
      expect(populatedFavorite.user._id.toString()).toBe(testUser._id.toString());
      expect(populatedFavorite.user.email).toBe(testUser.email);

      // Check quote population
      expect(populatedFavorite.quote).toBeInstanceOf(Object);
      expect(populatedFavorite.quote._id.toString()).toBe(testQuote._id.toString());
      expect(populatedFavorite.quote.text).toBe(testQuote.text);
      expect(populatedFavorite.quote.author).toBe(testQuote.author);
    });

    test('populates user reference in activity', async () => {
      // Create an activity
      const activity = new Activity({
        user: testUser._id,
        type: 'login',
        details: { ip: '127.0.0.1' }
      });
      await activity.save();

      // Fetch activity with populated user
      const populatedActivity = await Activity.findById(activity._id).populate('user');

      expect(populatedActivity.user).toBeInstanceOf(Object);
      expect(populatedActivity.user._id.toString()).toBe(testUser._id.toString());
      expect(populatedActivity.user.email).toBe(testUser.email);
      expect(populatedActivity.user.displayName).toBe(testUser.displayName);
    });

    test('cascading delete removes user-related data', async () => {
      // Create activities for the user
      await Activity.create({
        user: testUser._id,
        type: 'login'
      });
      await Activity.create({
        user: testUser._id,
        type: 'view_quote'
      });

      // Create favorites for the user
      await Favorite.create({
        user: testUser._id,
        quote: testQuote._id
      });

      // Create another quote by the user
      await Quote.create({
        text: 'Another quote',
        author: 'Test Author',
        addedBy: testUser._id
      });

      // Delete the user
      await User.findByIdAndDelete(testUser._id);

      // Check that related data is deleted or updated
      const activities = await Activity.find({ user: testUser._id });
      expect(activities).toHaveLength(0);

      const favorites = await Favorite.find({ user: testUser._id });
      expect(favorites).toHaveLength(0);

      // Quotes should still exist but with null addedBy
      const quotes = await Quote.find({ addedBy: testUser._id });
      expect(quotes).toHaveLength(0);
    });
  });
});