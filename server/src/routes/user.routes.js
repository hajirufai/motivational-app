const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, asyncHandler(userController.getUserProfile));

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authMiddleware, asyncHandler(userController.updateUserProfile));

/**
 * @route   GET /api/users/activity
 * @desc    Get user activity history
 * @access  Private
 */
router.get('/activity', authMiddleware, asyncHandler(userController.getUserActivity));

/**
 * @route   GET /api/users/favorites
 * @desc    Get user favorite quotes
 * @access  Private
 */
router.get('/favorites', authMiddleware, asyncHandler(userController.getFavorites));

/**
 * @route   POST /api/users/favorites/:quoteId
 * @desc    Add a quote to favorites
 * @access  Private
 */
router.post('/favorites/:quoteId', authMiddleware, asyncHandler(userController.addFavorite));

/**
 * @route   DELETE /api/users/favorites/:quoteId
 * @desc    Remove a quote from favorites
 * @access  Private
 */
router.delete('/favorites/:quoteId', authMiddleware, asyncHandler(userController.removeFavorite));

module.exports = router;