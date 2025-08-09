const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');

const router = express.Router();

/**
 * @route   POST /api/auth/verify
 * @desc    Verify Firebase token and return user info
 * @access  Private
 */
router.post('/verify', authMiddleware, asyncHandler(authController.verifyToken));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get('/me', authMiddleware, asyncHandler(authController.getCurrentUser));

/**
 * @route   POST /api/auth/logout
 * @desc    Log out user (revoke token on client side)
 * @access  Private
 */
router.post('/logout', authMiddleware, asyncHandler(authController.logout));

module.exports = router;