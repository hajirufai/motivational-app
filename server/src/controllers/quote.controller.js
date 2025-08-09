const Quote = require('../models/quote.model');
const User = require('../models/user.model');
const UserActivity = require('../models/userActivity.model');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Get a random quote
 */
exports.getRandomQuote = async (req, res) => {
  const quote = await Quote.getRandom();
  
  if (!quote) {
    throw ApiError.notFound('No quotes available');
  }
  
  // Increment view count
  await quote.incrementViews();
  
  // Log activity if user is authenticated
  if (req.user) {
    await UserActivity.logActivity(
      req.user._id,
      'quote_viewed',
      { quoteId: quote._id },
      req
    );
    
    // Add to user's viewed quotes
    await req.user.addViewedQuote(quote._id);
  }
  
  return res.status(200).json({ quote });
};

/**
 * Get a quote by ID
 */
exports.getQuoteById = async (req, res) => {
  const quote = await Quote.findById(req.params.id);
  
  if (!quote) {
    throw ApiError.notFound('Quote not found');
  }
  
  // Increment view count
  await quote.incrementViews();
  
  // Log activity if user is authenticated
  if (req.user) {
    await UserActivity.logActivity(
      req.user._id,
      'quote_viewed',
      { quoteId: quote._id },
      req
    );
    
    // Add to user's viewed quotes
    await req.user.addViewedQuote(quote._id);
  }
  
  return res.status(200).json({ quote });
};

/**
 * Get quotes by tag
 */
exports.getQuotesByTag = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const tag = req.params.tag.toLowerCase();
  
  const quotes = await Quote.find({ tags: tag })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await Quote.countDocuments({ tags: tag });
  
  return res.status(200).json({
    quotes,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
};

/**
 * Get all quotes with pagination
 */
exports.getAllQuotes = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Handle search query if provided
  const searchQuery = {};
  if (req.query.search) {
    searchQuery.$text = { $search: req.query.search };
  }
  
  const quotes = await Quote.find(searchQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await Quote.countDocuments(searchQuery);
  
  return res.status(200).json({
    quotes,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
};

/**
 * Create a new quote (admin only)
 */
exports.createQuote = async (req, res) => {
  const { text, author, source, tags } = req.body;
  
  // Validate required fields
  if (!text || !author) {
    throw ApiError.badRequest('Quote text and author are required');
  }
  
  // Create new quote
  const quote = await Quote.create({
    text,
    author,
    source,
    tags: tags || []
  });
  
  // Log activity
  await UserActivity.logActivity(
    req.user._id,
    'quote_created',
    { quoteId: quote._id },
    req
  );
  
  return res.status(201).json({ quote });
};

/**
 * Update a quote (admin only)
 */
exports.updateQuote = async (req, res) => {
  const { text, author, source, tags } = req.body;
  
  // Find quote
  const quote = await Quote.findById(req.params.id);
  
  if (!quote) {
    throw ApiError.notFound('Quote not found');
  }
  
  // Update fields
  if (text) quote.text = text;
  if (author) quote.author = author;
  if (source !== undefined) quote.source = source;
  if (tags) quote.tags = tags;
  
  // Save changes
  await quote.save();
  
  // Log activity
  await UserActivity.logActivity(
    req.user._id,
    'quote_updated',
    { quoteId: quote._id },
    req
  );
  
  return res.status(200).json({ quote });
};

/**
 * Delete a quote (admin only)
 */
exports.deleteQuote = async (req, res) => {
  // Find and delete quote
  const quote = await Quote.findByIdAndDelete(req.params.id);
  
  if (!quote) {
    throw ApiError.notFound('Quote not found');
  }
  
  // Log activity
  await UserActivity.logActivity(
    req.user._id,
    'quote_deleted',
    { quoteId: req.params.id },
    req
  );
  
  return res.status(200).json({
    success: true,
    message: 'Quote deleted successfully'
  });
};