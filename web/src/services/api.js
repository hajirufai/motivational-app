import axios from 'axios';
import { getAuth } from 'firebase/auth';

let api = axios.create();

/**
 * Initialize the API service with the base URL
 * @param {string} baseURL - The base URL for API requests
 */
export const initApi = (baseURL) => {
  api = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  api.interceptors.request.use(
    async (config) => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors
  api.interceptors.response.use(
    (response) => response.data,
    (error) => {
      // Handle specific error codes
      if (error.response) {
        const { status } = error.response;
        
        // Handle unauthorized errors
        if (status === 401) {
          // Force refresh the token or redirect to login
          const auth = getAuth();
          auth.currentUser?.getIdToken(true).catch(() => {
            window.location.href = '/login';
          });
        }
        
        // Handle forbidden errors
        if (status === 403) {
          console.error('Permission denied:', error.response.data);
        }
      }
      
      return Promise.reject(error);
    }
  );
};

// Auth related API calls
const auth = {
  /**
   * Create a new user profile after registration
   * @param {Object} userData - User data to create profile
   */
  createUserProfile: (userData) => {
    return api.post('/api/users/profile', userData);
  },
  
  /**
   * Check if a user has admin role
   */
  checkAdminRole: () => {
    return api.get('/api/users/check-admin');
  },
};

// Quotes related API calls
const quotes = {
  /**
   * Get a random quote
   */
  getRandomQuote: () => {
    return api.get('/api/quotes/random');
  },
  
  /**
   * Get a quote by ID
   * @param {string} id - Quote ID
   */
  getQuoteById: (id) => {
    return api.get(`/api/quotes/${id}`);
  },
  
  /**
   * Get quotes by tag
   * @param {string} tag - Tag to filter quotes
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of quotes per page
   */
  getQuotesByTag: (tag, page = 1, limit = 10) => {
    return api.get(`/api/quotes/tag/${tag}`, {
      params: { page, limit },
    });
  },
  
  /**
   * Get all quotes with pagination
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of quotes per page
   */
  getAllQuotes: (page = 1, limit = 10) => {
    return api.get('/api/quotes', {
      params: { page, limit },
    });
  },
  
  /**
   * Create a new quote (admin only)
   * @param {Object} quoteData - Quote data
   */
  createQuote: (quoteData) => {
    return api.post('/api/quotes', quoteData);
  },
  
  /**
   * Update a quote (admin only)
   * @param {string} id - Quote ID
   * @param {Object} quoteData - Updated quote data
   */
  updateQuote: (id, quoteData) => {
    return api.put(`/api/quotes/${id}`, quoteData);
  },
  
  /**
   * Delete a quote (admin only)
   * @param {string} id - Quote ID
   */
  deleteQuote: (id) => {
    return api.delete(`/api/quotes/${id}`);
  },
  
  /**
   * Import quotes from file (admin only)
   * @param {FormData} formData - Form data with file
   */
  importQuotes: (formData) => {
    return api.post('/api/quotes/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// User profile related API calls
const profile = {
  /**
   * Get user profile
   */
  getUserProfile: () => {
    return api.get('/api/users/profile');
  },
  
  /**
   * Update user profile
   * @param {Object} profileData - Updated profile data
   */
  updateUserProfile: (profileData) => {
    return api.put('/api/users/profile', profileData);
  },
  
  /**
   * Update user preferences
   * @param {Object} preferences - Updated preferences
   */
  updateUserPreferences: (preferences) => {
    return api.put('/api/users/preferences', preferences);
  },
};

// User activity related API calls
const activity = {
  /**
   * Get user activity
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of activities per page
   */
  getUserActivity: (page = 1, limit = 10) => {
    return api.get('/api/users/activity', {
      params: { page, limit },
    });
  },
  
  /**
   * Get all user activity (admin only)
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of activities per page
   */
  getAllUserActivity: (page = 1, limit = 10) => {
    return api.get('/api/admin/activity', {
      params: { page, limit },
    });
  },
  
  /**
   * Log user activity
   * @param {Object} activityData - Activity data to log
   */
  logActivity: (activityData) => {
    return api.post('/api/users/activity', activityData);
  },
};

// Favorites related API calls
const favorites = {
  /**
   * Get user's favorite quotes
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of favorites per page
   */
  getFavorites: (page = 1, limit = 10) => {
    return api.get('/api/users/favorites', {
      params: { page, limit },
    });
  },
  
  /**
   * Add a quote to favorites
   * @param {string} quoteId - Quote ID to add to favorites
   */
  addToFavorites: (quoteId) => {
    return api.post(`/api/users/favorites/${quoteId}`);
  },
  
  /**
   * Remove a quote from favorites
   * @param {string} quoteId - Quote ID to remove from favorites
   */
  removeFromFavorites: (quoteId) => {
    return api.delete(`/api/users/favorites/${quoteId}`);
  },
  
  /**
   * Check if a quote is in favorites
   * @param {string} quoteId - Quote ID to check
   */
  isInFavorites: (quoteId) => {
    return api.get(`/api/users/favorites/check/${quoteId}`);
  },
};

// Admin related API calls
const admin = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats: () => {
    return api.get('/api/admin/stats');
  },
  
  /**
   * Get all users (admin only)
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of users per page
   */
  getAllUsers: (page = 1, limit = 10) => {
    return api.get('/api/admin/users', {
      params: { page, limit },
    });
  },
  
  /**
   * Delete a user (admin only)
   * @param {string} userId - User ID to delete
   */
  deleteUser: (userId) => {
    return api.delete(`/api/admin/users/${userId}`);
  },
  
  /**
   * Update a user's role (admin only)
   * @param {string} userId - User ID to update
   * @param {Object} roleData - Role data
   */
  updateUserRole: (userId, roleData) => {
    return api.put(`/api/admin/users/${userId}/role`, roleData);
  },
};

// Export all API functions
export const apiService = {
  initApi,
  getRandomQuote: quotes.getRandomQuote,
  getQuoteById: quotes.getQuoteById,
  getQuotesByTag: quotes.getQuotesByTag,
  getAllQuotes: quotes.getAllQuotes,
  createQuote: quotes.createQuote,
  updateQuote: quotes.updateQuote,
  deleteQuote: quotes.deleteQuote,
  importQuotes: quotes.importQuotes,
  getUserProfile: profile.getUserProfile,
  updateUserProfile: profile.updateUserProfile,
  updateUserPreferences: profile.updateUserPreferences,
  getUserActivity: activity.getUserActivity,
  getAllUserActivity: activity.getAllUserActivity,
  logActivity: activity.logActivity,
  getFavorites: favorites.getFavorites,
  addToFavorites: favorites.addToFavorites,
  removeFromFavorites: favorites.removeFromFavorites,
  isInFavorites: favorites.isInFavorites,
  createUserProfile: auth.createUserProfile,
  checkAdminRole: auth.checkAdminRole,
  getDashboardStats: admin.getDashboardStats,
  getAllUsers: admin.getAllUsers,
  deleteUser: admin.deleteUser,
  updateUserRole: admin.updateUserRole,
};

// For backward compatibility
export { apiService as api };