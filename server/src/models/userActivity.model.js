const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'quote_viewed', 'profile_updated', 'password_changed']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Create compound index for userId and timestamp for efficient queries
userActivitySchema.index({ userId: 1, timestamp: -1 });

// Create index on action for filtering
userActivitySchema.index({ action: 1 });

// Static method to log activity
userActivitySchema.statics.logActivity = async function(userId, action, details = {}, req = null) {
  const activityData = {
    userId,
    action,
    details
  };
  
  // Add request metadata if available
  if (req) {
    activityData.ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    activityData.userAgent = req.headers['user-agent'] || 'unknown';
  }
  
  return this.create(activityData);
};

// Static method to get recent activities for a user
userActivitySchema.statics.getRecentForUser = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get activity statistics
userActivitySchema.statics.getStats = async function(action, timeframe) {
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case 'daily':
      startDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case 'weekly':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'monthly':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    default:
      startDate = new Date(now.setDate(now.getDate() - 1)); // Default to daily
  }
  
  const query = { timestamp: { $gte: startDate } };
  
  if (action) {
    query.action = action;
  }
  
  return this.countDocuments(query);
};

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

module.exports = UserActivity;