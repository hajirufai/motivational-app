import axios from 'axios';
import { getAuth } from 'firebase/auth';

let API_BASE_URL = '';

// Initialize the API with the base URL
export const initApi = (baseUrl) => {
  API_BASE_URL = baseUrl;
};

// Create axios instance
const api = axios.create({
  timeout: 10000, // 10 seconds timeout
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  async (config) => {
    // Set the base URL for each request
    config.baseURL = API_BASE_URL;
    
    // Get the current user from Firebase Auth
    const auth = getAuth();
    const user = auth.currentUser;
    
    // If user is logged in, add the token to the request headers
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

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      // Server responded with a status code outside of 2xx range
      console.error('API Error Response:', error.response.data);
      
      // Handle authentication errors
      if (error.response.status === 401) {
        // Redirect to login page or refresh token
        console.error('Authentication error: User not authenticated');
      }
      
      // Handle forbidden errors
      if (error.response.status === 403) {
        console.error('Authorization error: User not authorized');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Request Error: No response received', error.request);
    } else {
      // Something happened in setting up the request
      console.error('API Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API functions

// Authentication
export const verifyToken = async () => {
  const response = await api.get('/auth/verify');
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

// Quotes
export const fetchRandomQuote = async () => {
  const response = await api.get('/quotes/random');
  return response.data;
};

export const fetchQuoteById = async (quoteId) => {
  const response = await api.get(`/quotes/${quoteId}`);
  return response.data;
};

export const fetchQuotesByTag = async (tag, page = 1, limit = 10) => {
  const response = await api.get(`/quotes/tag/${tag}`, {
    params: { page, limit },
  });
  return response.data;
};

export const fetchAllQuotes = async (page = 1, limit = 10) => {
  const response = await api.get('/quotes', {
    params: { page, limit },
  });
  return response.data;
};

// User Profile
export const fetchUserProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

export const updateUserProfile = async (profileData) => {
  const response = await api.put('/users/profile', profileData);
  return response.data;
};

// User Activity
export const fetchUserActivity = async (page = 1, limit = 20) => {
  const response = await api.get('/users/activity', {
    params: { page, limit },
  });
  return response.data;
};

// Favorites
export const fetchUserFavorites = async (page = 1, limit = 20) => {
  const response = await api.get('/users/favorites', {
    params: { page, limit },
  });
  return response.data;
};

export const toggleFavorite = async (quoteId, isFavorite) => {
  if (isFavorite) {
    const response = await api.post(`/users/favorites/${quoteId}`);
    return response.data;
  } else {
    const response = await api.delete(`/users/favorites/${quoteId}`);
    return response.data;
  }
};

export default api;