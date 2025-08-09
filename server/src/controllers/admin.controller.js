const User = require('../models/user.model');
const Quote = require('../models/quote.model');
const UserActivity = require('../models/userActivity.model');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Get all users with pagination
 */
exports.getAllUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Handle search query if provided
  const searchQuery = {};
  if (req.query.search) {
    searchQuery.$or = [
      { email: { $regex: req.query.search, $options: 'i' } },
      { displayName: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  const users = await User.find(searchQuery)
    .select('-__v')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await User.countDocuments(searchQuery);
  
  return res.status(200).json({
    users,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
};

/**
 * Get user by ID
 */
exports.getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select('-__v');
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Get user activity
  const activities = await UserActivity.find({ userId: user._id })
    .sort({ timestamp: -1 })
    .limit(10);
  
  return res.status(200).json({
    user,
    recentActivity: activities
  });
};

/**
 * Update user (e.g., change role)
 */
exports.updateUser = async (req, res) => {
  const { role, displayName, preferences } = req.body;
  
  // Find user
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Update fields
  if (role && ['user', 'admin'].includes(role)) {
    user.role = role;
  }
  
  if (displayName) user.displayName = displayName;
  
  if (preferences) {
    // Update only provided preference fields
    user.preferences = {
      ...user.preferences,
      ...preferences
    };
  }
  
  // Save changes
  await user.save();
  
  // Log activity
  await UserActivity.logActivity(
    req.user._id,
    'user_updated',
    { targetUserId: user._id },
    req
  );
  
  return res.status(200).json({ user });
};

/**
 * Delete user
 */
exports.deleteUser = async (req, res) => {
  // Prevent deleting self
  if (req.params.id === req.user._id.toString()) {
    throw ApiError.badRequest('Cannot delete your own account');
  }
  
  // Find and delete user
  const user = await User.findByIdAndDelete(req.params.id);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Log activity
  await UserActivity.logActivity(
    req.user._id,
    'user_deleted',
    { targetUserId: req.params.id },
    req
  );
  
  return res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
};

/**
 * Get system statistics
 */
exports.getSystemStats = async (req, res) => {
  const now = new Date();
  const oneDayAgo = new Date(now.setDate(now.getDate() - 1));
  const oneWeekAgo = new Date(now.setDate(now.getDate() - 6)); // -7 days total
  const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
  
  // Total users
  const totalUsers = await User.countDocuments();
  
  // Active users
  const activeUsersDaily = await User.countDocuments({ lastLogin: { $gte: oneDayAgo } });
  const activeUsersWeekly = await User.countDocuments({ lastLogin: { $gte: oneWeekAgo } });
  const activeUsersMonthly = await User.countDocuments({ lastLogin: { $gte: oneMonthAgo } });
  
  // Total quotes
  const totalQuotes = await Quote.countDocuments();
  
  // Quotes served
  const quotesServedDaily = await UserActivity.countDocuments({
    action: 'quote_viewed',
    timestamp: { $gte: oneDayAgo }
  });
  
  const quotesServedWeekly = await UserActivity.countDocuments({
    action: 'quote_viewed',
    timestamp: { $gte: oneWeekAgo }
  });
  
  const quotesServedMonthly = await UserActivity.countDocuments({
    action: 'quote_viewed',
    timestamp: { $gte: oneMonthAgo }
  });
  
  // Top quotes
  const topQuotes = await Quote.find()
    .sort({ views: -1 })
    .limit(5)
    .select('text author views');
  
  // New registrations
  const registrationsDaily = await User.countDocuments({
    createdAt: { $gte: oneDayAgo }
  });
  
  const registrationsWeekly = await User.countDocuments({
    createdAt: { $gte: oneWeekAgo }
  });
  
  const registrationsMonthly = await User.countDocuments({
    createdAt: { $gte: oneMonthAgo }
  });
  
  return res.status(200).json({
    stats: {
      totalUsers,
      activeUsers: {
        daily: activeUsersDaily,
        weekly: activeUsersWeekly,
        monthly: activeUsersMonthly
      },
      totalQuotes,
      quotesServed: {
        daily: quotesServedDaily,
        weekly: quotesServedWeekly,
        monthly: quotesServedMonthly
      },
      topQuotes,
      registrations: {
        daily: registrationsDaily,
        weekly: registrationsWeekly,
        monthly: registrationsMonthly
      }
    }
  });
};

/**
 * Get all user activity with pagination
 */
exports.getAllActivity = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Filter by user if provided
  const query = {};
  if (req.query.userId) {
    query.userId = req.query.userId;
  }
  
  // Filter by action if provided
  if (req.query.action) {
    query.action = req.query.action;
  }
  
  // Filter by date range if provided
  if (req.query.startDate && req.query.endDate) {
    query.timestamp = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }
  
  const activities = await UserActivity.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'email displayName');
  
  const total = await UserActivity.countDocuments(query);
  
  return res.status(200).json({
    activities,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
};

/**
 * Import quotes from JSON file
 */
exports.importQuotes = async (req, res) => {
  const { quotes } = req.body;
  
  if (!quotes || !Array.isArray(quotes) || quotes.length === 0) {
    throw ApiError.badRequest('Invalid quotes data. Expected an array of quotes.');
  }
  
  const results = {
    total: quotes.length,
    imported: 0,
    errors: []
  };
  
  // Process each quote
  for (const quoteData of quotes) {
    try {
      // Validate required fields
      if (!quoteData.text || !quoteData.author) {
        results.errors.push({
          quote: quoteData,
          error: 'Missing required fields (text or author)'
        });
        continue;
      }
      
      // Create quote
      await Quote.create({
        text: quoteData.text,
        author: quoteData.author,
        source: quoteData.source || '',
        tags: quoteData.tags || []
      });
      
      results.imported++;
    } catch (error) {
      results.errors.push({
        quote: quoteData,
        error: error.message
      });
    }
  }
  
  // Log activity
  await UserActivity.logActivity(
    req.user._id,
    'quotes_imported',
    { count: results.imported },
    req
  );
  
  return res.status(200).json({
    success: true,
    results
  });
};

/**
 * Export all quotes to JSON
 */
exports.exportQuotes = async (req, res) => {
  const quotes = await Quote.find().sort({ createdAt: -1 });
  
  // Log activity
  await UserActivity.logActivity(
    req.user._id,
    'quotes_exported',
    { count: quotes.length },
    req
  );
  
  return res.status(200).json({ quotes });
};