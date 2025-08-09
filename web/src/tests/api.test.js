import axios from 'axios';
import { initApi, api } from '../services/api';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }))
}));

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: {
      getIdToken: jest.fn(() => Promise.resolve('mock-token'))
    }
  }))
}));

describe('API Service', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock axios instance
    mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    };
    
    axios.create.mockReturnValue(mockAxiosInstance);
    
    // Initialize API
    initApi('https://api.example.com');
  });

  test('initializes with correct base URL', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://api.example.com'
    });
  });

  test('sets up request interceptor', () => {
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
  });

  test('sets up response interceptor', () => {
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });

  describe('API Methods', () => {
    beforeEach(() => {
      // Setup mock responses
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });
      mockAxiosInstance.put.mockResolvedValue({ data: { success: true } });
      mockAxiosInstance.delete.mockResolvedValue({ data: { success: true } });
    });

    test('getRandomQuote calls correct endpoint', async () => {
      await api.getRandomQuote();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/quotes/random');
    });

    test('getQuoteById calls correct endpoint with ID', async () => {
      await api.getQuoteById('123');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/quotes/123');
    });

    test('getQuotesByTag calls correct endpoint with tag', async () => {
      await api.getQuotesByTag('inspiration');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/quotes/tag/inspiration');
    });

    test('getAllQuotes calls correct endpoint with pagination', async () => {
      await api.getAllQuotes(2, 20);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/quotes?page=2&limit=20');
    });

    test('createQuote calls correct endpoint with data', async () => {
      const quoteData = { text: 'Test quote', author: 'Test Author' };
      await api.createQuote(quoteData);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/quotes', quoteData);
    });

    test('updateQuote calls correct endpoint with ID and data', async () => {
      const quoteData = { text: 'Updated quote', author: 'Test Author' };
      await api.updateQuote('123', quoteData);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/quotes/123', quoteData);
    });

    test('deleteQuote calls correct endpoint with ID', async () => {
      await api.deleteQuote('123');
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/quotes/123');
    });

    test('getUserProfile calls correct endpoint', async () => {
      await api.getUserProfile();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/profile');
    });

    test('updateUserProfile calls correct endpoint with data', async () => {
      const profileData = { displayName: 'Test User' };
      await api.updateUserProfile(profileData);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/users/profile', profileData);
    });

    test('getUserActivity calls correct endpoint with pagination', async () => {
      await api.getUserActivity(2, 10);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/activity?page=2&limit=10');
    });

    test('getFavorites calls correct endpoint', async () => {
      await api.getFavorites();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/favorites');
    });

    test('addToFavorites calls correct endpoint with quote ID', async () => {
      await api.addToFavorites('123');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/users/favorites', { quoteId: '123' });
    });

    test('removeFromFavorites calls correct endpoint with quote ID', async () => {
      await api.removeFromFavorites('123');
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/users/favorites/123');
    });

    test('checkFavorite calls correct endpoint with quote ID', async () => {
      await api.checkFavorite('123');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/favorites/check/123');
    });

    test('getDashboardStats calls correct endpoint', async () => {
      await api.getDashboardStats();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/admin/stats');
    });

    test('getAllUsers calls correct endpoint with pagination and search', async () => {
      await api.getAllUsers(2, 20, 'test');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/admin/users?page=2&limit=20&search=test');
    });

    test('deleteUser calls correct endpoint with user ID', async () => {
      await api.deleteUser('user123');
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/admin/users/user123');
    });

    test('updateUserRole calls correct endpoint with user ID and role', async () => {
      await api.updateUserRole('user123', 'admin');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/admin/users/user123/role', { role: 'admin' });
    });
  });

  describe('Error Handling', () => {
    test('handles 401 errors correctly', async () => {
      // Mock the response interceptor to simulate a 401 error
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      const errorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      
      const error = {
        response: {
          status: 401,
          data: { error: { message: 'Unauthorized' } }
        }
      };
      
      // Mock window.location.href
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };
      
      try {
        await errorHandler(error);
      } catch (e) {
        expect(window.location.href).toBe('/login');
      }
      
      // Restore window.location
      window.location = originalLocation;
    });

    test('handles 403 errors correctly', async () => {
      // Mock the response interceptor to simulate a 403 error
      const errorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      
      const error = {
        response: {
          status: 403,
          data: { error: { message: 'Forbidden' } }
        }
      };
      
      try {
        await errorHandler(error);
      } catch (e) {
        expect(e).toEqual(error);
      }
    });

    test('passes through other errors', async () => {
      // Mock the response interceptor
      const errorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      
      const error = {
        response: {
          status: 500,
          data: { error: { message: 'Server Error' } }
        }
      };
      
      try {
        await errorHandler(error);
      } catch (e) {
        expect(e).toEqual(error);
      }
    });
  });
});