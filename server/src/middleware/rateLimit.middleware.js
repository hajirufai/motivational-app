const { rateLimit } = require('express-rate-limit');
const redis = require('redis');
const { promisify } = require('util');
const { ApiError } = require('./error.middleware');

// Initialize Redis client if REDIS_URL is provided
let redisClient;
let redisGetAsync;
let redisSetAsync;
let redisIncrAsync;
let redisExpireAsync;

if (process.env.REDIS_URL) {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      legacyMode: true
    });
    
    redisClient.connect().catch(console.error);
    
    redisGetAsync = promisify(redisClient.get).bind(redisClient);
    redisSetAsync = promisify(redisClient.set).bind(redisClient);
    redisIncrAsync = promisify(redisClient.incr).bind(redisClient);
    redisExpireAsync = promisify(redisClient.expire).bind(redisClient);
    
    console.log('Redis connected for rate limiting');
  } catch (error) {
    console.error('Redis connection error:', error);
    console.warn('Falling back to memory store for rate limiting');
  }
}

/**
 * Basic rate limiter for all API routes
 */
exports.basicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'rate_limit_exceeded',
      message: 'Too many requests, please try again later.'
    }
  }
});

/**
 * Advanced rate limiter using Redis for distributed environments
 * Limits based on user role and provides different limits for different endpoints
 */
exports.advancedRateLimiter = async (req, res, next) => {
  // Skip rate limiting if Redis is not available
  if (!redisClient || !redisClient.isReady) {
    return next();
  }
  
  try {
    // Get user ID or IP address for rate limiting key
    const identifier = req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
    
    // Determine rate limit based on user role
    const { windowMs, maxRequests } = getLimits(req);
    
    // Create a unique key for this route and user/IP
    const key = `ratelimit:${req.path}:${identifier}`;
    
    // Get current count
    let current = await redisGetAsync(key);
    
    // If key doesn't exist, create it
    if (!current) {
      await redisSetAsync(key, 0);
      await redisExpireAsync(key, windowMs / 1000); // Convert ms to seconds
      current = 0;
    }
    
    // Increment and check
    current = await redisIncrAsync(key);
    
    // If over limit, return error
    if (current > maxRequests) {
      throw ApiError.tooManyRequests(
        'Rate limit exceeded. Please try again later.',
        'rate_limit_exceeded',
        { retryAfter: windowMs / 1000 }
      );
    }
    
    // Set headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
    
    next();
  } catch (error) {
    if (error.isApiError) {
      return res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
    }
    
    console.error('Rate limiting error:', error);
    next(); // Continue even if rate limiting fails
  }
};

/**
 * Determine rate limits based on user role and endpoint
 */
function getLimits(req) {
  // Default limits
  const defaults = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 requests per minute
  };
  
  // If user is authenticated, check role
  if (req.user) {
    if (req.user.role === 'admin') {
      // Higher limits for admins
      return {
        windowMs: 60 * 1000,
        maxRequests: 300
      };
    }
    
    // Regular authenticated user
    return {
      windowMs: 60 * 1000,
      maxRequests: 60
    };
  }
  
  // Unauthenticated user - stricter limits
  return defaults;
}