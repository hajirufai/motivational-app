const express = require('express');
const { asyncHandler } = require('../middleware/error.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');
const { adminMiddleware } = require('../middleware/auth.middleware');
const quoteController = require('../controllers/quote.controller');

const router = express.Router();

/**
 * @route   GET /api/quotes/random
 * @desc    Get a random quote
 * @access  Public
 */
router.get('/random', asyncHandler(quoteController.getRandomQuote));

/**
 * @route   GET /api/quotes/:id
 * @desc    Get a quote by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(quoteController.getQuoteById));

/**
 * @route   GET /api/quotes/tag/:tag
 * @desc    Get quotes by tag
 * @access  Public
 */
router.get('/tag/:tag', asyncHandler(quoteController.getQuotesByTag));

/**
 * @route   GET /api/quotes
 * @desc    Get all quotes with pagination
 * @access  Public
 */
router.get('/', asyncHandler(quoteController.getAllQuotes));

/**
 * @route   POST /api/quotes
 * @desc    Create a new quote
 * @access  Admin
 */
router.post('/', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(quoteController.createQuote)
);

/**
 * @route   PUT /api/quotes/:id
 * @desc    Update a quote
 * @access  Admin
 */
router.put('/:id', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(quoteController.updateQuote)
);

/**
 * @route   DELETE /api/quotes/:id
 * @desc    Delete a quote
 * @access  Admin
 */
router.delete('/:id', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(quoteController.deleteQuote)
);

module.exports = router;