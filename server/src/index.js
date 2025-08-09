require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { rateLimit } = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth.routes');
const quoteRoutes = require('./routes/quote.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');

// Initialize Express app
const app = express();

// Set up middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Request logging

// Rate limiting
const apiLimiter = rateLimit({
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

// Apply rate limiting to all requests
app.use(apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: 'The requested resource was not found'
    }
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.warn('Continuing without MongoDB connection. Some features may not work.');
    return false;
  }
};

// Start the server
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  const dbConnected = await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (!dbConnected) {
      console.log('Server is running in limited mode without database connection');
    }
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't crash the server, just log the error
});

module.exports = app; // Export for testing