const admin = require('firebase-admin');
const User = require('../models/user.model');
const UserActivity = require('../models/userActivity.model');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

/**
 * Middleware to verify Firebase authentication token
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'authentication_required',
          message: 'Authentication required. Please provide a valid token.'
        }
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get or create user in our database
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      // New user, create in our database
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email.split('@')[0],
        role: 'user' // Default role
      });
      
      // Log first login activity
      await UserActivity.logActivity(
        user._id,
        'login',
        { firstLogin: true },
        req
      );
    } else {
      // Update last login time
      user.lastLogin = new Date();
      await user.save();
      
      // Log login activity
      await UserActivity.logActivity(
        user._id,
        'login',
        {},
        req
      );
    }
    
    // Add user to request object
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    return res.status(401).json({
      error: {
        code: 'invalid_token',
        message: 'Invalid or expired authentication token.'
      }
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
exports.adminMiddleware = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'permission_denied',
        message: 'Admin privileges required for this operation.'
      }
    });
  }
  
  next();
};