const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

// All routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination
 * @access  Admin
 */
router.get('/users', asyncHandler(adminController.getAllUsers));

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Admin
 */
router.get('/users/:id', asyncHandler(adminController.getUserById));

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user (e.g., change role)
 * @access  Admin
 */
router.put('/users/:id', asyncHandler(adminController.updateUser));

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Admin
 */
router.delete('/users/:id', asyncHandler(adminController.deleteUser));

/**
 * @route   GET /api/admin/stats
 * @desc    Get system statistics
 * @access  Admin
 */
router.get('/stats', asyncHandler(adminController.getSystemStats));

/**
 * @route   GET /api/admin/activity
 * @desc    Get all user activity with pagination
 * @access  Admin
 */
router.get('/activity', asyncHandler(adminController.getAllActivity));

/**
 * @route   POST /api/admin/quotes/import
 * @desc    Import quotes from JSON file
 * @access  Admin
 */
router.post('/quotes/import', asyncHandler(adminController.importQuotes));

/**
 * @route   GET /api/admin/quotes/export
 * @desc    Export all quotes to JSON
 * @access  Admin
 */
router.get('/quotes/export', asyncHandler(adminController.exportQuotes));

module.exports = router;