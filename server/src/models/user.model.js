const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  displayName: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    }
  },
  quotesViewed: [
    {
      quoteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quote'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  favorites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote'
    }
  ]
}, {
  timestamps: true
});

// Create index on email for faster lookups
userSchema.index({ email: 1 });

// Create index on role for admin queries
userSchema.index({ role: 1 });

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = Date.now();
  return this.save();
};

// Method to add a viewed quote
userSchema.methods.addViewedQuote = function(quoteId) {
  this.quotesViewed.push({
    quoteId,
    viewedAt: Date.now()
  });
  
  // Keep only the last 100 viewed quotes
  if (this.quotesViewed.length > 100) {
    this.quotesViewed = this.quotesViewed.slice(-100);
  }
  
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;