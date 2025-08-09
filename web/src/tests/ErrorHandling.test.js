import { handleApiError, ErrorTypes, isNetworkError } from '../utils/errorHandling';
import { toast } from 'react-toastify';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }
}));

jest.mock('../firebase', () => ({
  auth: {}
}));

jest.mock('firebase/auth', () => ({
  signOut: jest.fn().mockResolvedValue(undefined)
}));

describe('Error Handling Utilities', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleApiError', () => {
    test('handles 401 Unauthorized errors', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized access' }
        }
      };

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should sign out the user
      expect(signOut).toHaveBeenCalledWith(auth);
      
      // Should navigate to login page
      expect(navigate).toHaveBeenCalledWith('/login');
      
      // Should show toast error
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('session has expired'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.AUTH_ERROR);
    });

    test('handles 403 Forbidden errors', async () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Forbidden access' }
        }
      };

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should not sign out the user
      expect(signOut).not.toHaveBeenCalled();
      
      // Should not navigate
      expect(navigate).not.toHaveBeenCalled();
      
      // Should show toast error
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('do not have permission'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.PERMISSION_ERROR);
    });

    test('handles 404 Not Found errors', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Resource not found' }
        }
      };

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should not sign out the user
      expect(signOut).not.toHaveBeenCalled();
      
      // Should not navigate
      expect(navigate).not.toHaveBeenCalled();
      
      // Should show toast warning
      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.NOT_FOUND);
    });

    test('handles 422 Validation errors', async () => {
      const error = {
        response: {
          status: 422,
          data: { 
            message: 'Validation failed',
            errors: [
              { field: 'email', message: 'Invalid email format' },
              { field: 'password', message: 'Password too short' }
            ]
          }
        }
      };

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should not sign out the user
      expect(signOut).not.toHaveBeenCalled();
      
      // Should not navigate
      expect(navigate).not.toHaveBeenCalled();
      
      // Should show toast error for each validation error
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.VALIDATION_ERROR);
      
      // Should return validation errors
      expect(result.validationErrors).toEqual([
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ]);
    });

    test('handles 429 Rate Limit errors', async () => {
      const error = {
        response: {
          status: 429,
          data: { message: 'Too many requests' }
        }
      };

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should not sign out the user
      expect(signOut).not.toHaveBeenCalled();
      
      // Should not navigate
      expect(navigate).not.toHaveBeenCalled();
      
      // Should show toast warning
      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('too many requests'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.RATE_LIMIT);
    });

    test('handles 500 Server errors', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should not sign out the user
      expect(signOut).not.toHaveBeenCalled();
      
      // Should not navigate
      expect(navigate).not.toHaveBeenCalled();
      
      // Should show toast error
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('server error'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.SERVER_ERROR);
    });

    test('handles network errors', async () => {
      const error = {
        message: 'Network Error',
        isAxiosError: true,
        request: {},
        response: undefined
      };

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should not sign out the user
      expect(signOut).not.toHaveBeenCalled();
      
      // Should not navigate
      expect(navigate).not.toHaveBeenCalled();
      
      // Should show toast warning
      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('connection issue'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.NETWORK_ERROR);
    });

    test('handles unknown errors', async () => {
      const error = new Error('Unknown error');

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should not sign out the user
      expect(signOut).not.toHaveBeenCalled();
      
      // Should not navigate
      expect(navigate).not.toHaveBeenCalled();
      
      // Should show toast error
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('unexpected error'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.UNKNOWN_ERROR);
    });

    test('handles errors with custom messages', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Custom error message' }
        }
      };

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should show toast with custom message
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Custom error message'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.CLIENT_ERROR);
    });

    test('handles errors without response data', async () => {
      const error = {
        response: {
          status: 500
          // No data property
        }
      };

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should show toast with generic message
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('server error'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.SERVER_ERROR);
    });

    test('handles errors with null response', async () => {
      const error = {
        // No response property
        message: 'Error occurred'
      };

      const navigate = jest.fn();
      const result = await handleApiError(error, navigate);

      // Should show toast with generic message
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('unexpected error'),
        expect.any(Object)
      );
      
      // Should return the correct error type
      expect(result).toBe(ErrorTypes.UNKNOWN_ERROR);
    });
  });

  describe('isNetworkError', () => {
    test('identifies Axios network errors', () => {
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
        request: {},
        response: undefined
      };

      expect(isNetworkError(networkError)).toBe(true);
    });

    test('identifies offline errors', () => {
      const offlineError = {
        isAxiosError: true,
        message: 'Failed to fetch',
        request: {},
        response: undefined
      };

      expect(isNetworkError(offlineError)).toBe(true);
    });

    test('identifies timeout errors', () => {
      const timeoutError = {
        isAxiosError: true,
        message: 'timeout of 10000ms exceeded',
        code: 'ECONNABORTED',
        request: {},
        response: undefined
      };

      expect(isNetworkError(timeoutError)).toBe(true);
    });

    test('rejects non-network errors', () => {
      const serverError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };

      expect(isNetworkError(serverError)).toBe(false);
    });

    test('rejects non-Axios errors', () => {
      const regularError = new Error('Regular error');

      expect(isNetworkError(regularError)).toBe(false);
    });
  });

  describe('ErrorTypes', () => {
    test('has all required error types', () => {
      expect(ErrorTypes).toHaveProperty('AUTH_ERROR');
      expect(ErrorTypes).toHaveProperty('PERMISSION_ERROR');
      expect(ErrorTypes).toHaveProperty('NOT_FOUND');
      expect(ErrorTypes).toHaveProperty('VALIDATION_ERROR');
      expect(ErrorTypes).toHaveProperty('RATE_LIMIT');
      expect(ErrorTypes).toHaveProperty('SERVER_ERROR');
      expect(ErrorTypes).toHaveProperty('NETWORK_ERROR');
      expect(ErrorTypes).toHaveProperty('CLIENT_ERROR');
      expect(ErrorTypes).toHaveProperty('UNKNOWN_ERROR');
    });
  });
});