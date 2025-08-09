const User = require('../models/user.model');
const Quote = require('../models/quote.model');
const UserActivity = require('../models/userActivity.model');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Get user profile
 */
exports.getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-__v');
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  return res.status(200).json({ user });
};

/**
 * Update user profile
 */
exports.updateUserProfile = async (req, res) => {
  const { displayName, preferences } = req.body;
  
  // Find user
  const user = await User.findById(req.user._id);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Update fields
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
    user._id,
    'profile_updated',
    {},
    req
  );
  
  return res.status(200).json({ user });
};

/**
 * Get user activity history
 */
exports.getUserActivity = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const activities = await UserActivity.find({ userId: req.user._id })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await UserActivity.countDocuments({ userId: req.user._id });
  
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
 * Get user favorite quotes
 */
exports.getFavorites = async (req, res) => {
  const user = await User.findById(req.user._id).populate('favorites');
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  return res.status(200).json({
    favorites: user.favorites || []
  });
};

/**
 * Add a quote to favorites
 */
exports.addFavorite = async (req, res) => {
  const quoteId = req.params.quoteId;
  
  // Check if quote exists
  const quote = await Quote.findById(quoteId);
  
  if (!quote) {
    throw ApiError.notFound('Quote not found');
  }
  
  // Find user
  const user = await User.findById(req.user._id);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Check if already in favorites
  if (!user.favorites) {
    user.favorites = [];
  }
  
  if (user.favorites.includes(quoteId)) {
    return res.status(200).json({
      message: 'Quote already in favorites',
      favorites: user.favorites
    });
  }
  
  // Add to favorites
  user.favorites.push(quoteId);
  await user.save();
  
  // Log activity
  await UserActivity.logActivity(
    user._id,
    'favorite_added',
    { quoteId },
    req
  );
  
  return res.status(200).json({
    message: 'Quote added to favorites',
    favorites: user.favorites
  });
};

/**
 * Remove a quote from favorites
 */
exports.removeFavorite = async (req, res) => {
  const quoteId = req.params.quoteId;
  
  // Find user
  const user = await User.findById(req.user._id);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Check if in favorites
  if (!user.favorites || !user.favorites.includes(quoteId)) {
    return res.status(200).json({
      message: 'Quote not in favorites',
      favorites: user.favorites || []
    });
  }
  
  // Remove from favorites
  user.favorites = user.favorites.filter(id => id.toString() !== quoteId);
  await user.save();
  
  // Log activity
  await UserActivity.logActivity(
    user._id,
    'favorite_removed',
    { quoteId },
    req
  );
  
  return res.status(200).json({
    message: 'Quote removed from favorites',
    favorites: user.favorites
  });
};