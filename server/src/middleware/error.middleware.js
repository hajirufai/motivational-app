/**
 * Global error handling middleware
 */
exports.errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error response
  const errorResponse = {
    error: {
      code: 'internal_error',
      message: 'An unexpected error occurred'
    }
  };
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    errorResponse.error.code = 'validation_error';
    errorResponse.error.message = 'Validation failed';
    errorResponse.error.details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json(errorResponse);
  }
  
  if (err.name === 'MongoError' && err.code === 11000) {
    // Duplicate key error
    errorResponse.error.code = 'duplicate_error';
    errorResponse.error.message = 'A record with this information already exists';
    return res.status(409).json(errorResponse);
  }
  
  if (err.name === 'CastError') {
    // Invalid ID format
    errorResponse.error.code = 'invalid_id';
    errorResponse.error.message = 'Invalid ID format';
    return res.status(400).json(errorResponse);
  }
  
  if (err.name === 'JsonWebTokenError') {
    // JWT error
    errorResponse.error.code = 'invalid_token';
    errorResponse.error.message = 'Invalid authentication token';
    return res.status(401).json(errorResponse);
  }
  
  if (err.name === 'TokenExpiredError') {
    // Expired JWT
    errorResponse.error.code = 'token_expired';
    errorResponse.error.message = 'Authentication token has expired';
    return res.status(401).json(errorResponse);
  }
  
  // Custom API error
  if (err.isApiError) {
    errorResponse.error.code = err.code || 'api_error';
    errorResponse.error.message = err.message;
    if (err.details) {
      errorResponse.error.details = err.details;
    }
    return res.status(err.statusCode || 500).json(errorResponse);
  }
  
  // Default to 500 internal server error
  res.status(500).json(errorResponse);
};

/**
 * Custom API Error class
 */
exports.ApiError = class ApiError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isApiError = true;
  }
  
  static badRequest(message, code = 'bad_request', details = null) {
    return new this(message, 400, code, details);
  }
  
  static unauthorized(message, code = 'unauthorized', details = null) {
    return new this(message, 401, code, details);
  }
  
  static forbidden(message, code = 'forbidden', details = null) {
    return new this(message, 403, code, details);
  }
  
  static notFound(message, code = 'not_found', details = null) {
    return new this(message, 404, code, details);
  }
  
  static conflict(message, code = 'conflict', details = null) {
    return new this(message, 409, code, details);
  }
  
  static tooManyRequests(message, code = 'rate_limit_exceeded', details = null) {
    return new this(message, 429, code, details);
  }
  
  static internal(message, code = 'internal_error', details = null) {
    return new this(message, 500, code, details);
  }
};

/**
 * Async handler to catch errors in async route handlers
 */
exports.asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};