const User = require('../models/user.model');
const UserActivity = require('../models/userActivity.model');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Verify Firebase token and return user info
 */
exports.verifyToken = async (req, res) => {
  // User is already verified and attached to req by authMiddleware
  return res.status(200).json({
    user: {
      uid: req.user.firebaseUid,
      email: req.user.email,
      displayName: req.user.displayName,
      role: req.user.role
    }
  });
};

/**
 * Get current user information
 */
exports.getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user._id).select('-__v');
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  return res.status(200).json({ user });
};

/**
 * Log out user
 * Note: Firebase token revocation happens on client side
 * This endpoint just logs the logout event
 */
exports.logout = async (req, res) => {
  // Log logout activity
  await UserActivity.logActivity(
    req.user._id,
    'logout',
    {},
    req
  );
  
  return res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
};