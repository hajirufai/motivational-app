import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../renderer/App';
import { ThemeProvider } from '../renderer/contexts/ThemeContext';
import { AuthProvider } from '../renderer/contexts/AuthContext';
import { QuoteProvider } from '../renderer/contexts/QuoteContext';

// Mock the electron API that would be exposed by preload.js
const mockElectronAPI = {
  getUserData: jest.fn(),
  setUserData: jest.fn(),
  clearUserData: jest.fn(),
  getAppVersion: jest.fn(),
  checkForUpdates: jest.fn(),
  quitApp: jest.fn(),
  openExternalLink: jest.fn(),
  onUpdateAvailable: jest.fn(),
  onUpdateDownloaded: jest.fn(),
  onUserDataChanged: jest.fn()
};

// Mock the window.electronAPI object
window.electronAPI = mockElectronAPI;

// Mock API service
jest.mock('../renderer/services/api', () => ({
  api: {
    init: jest.fn(),
    getRandomQuote: jest.fn(),
    getFavorites: jest.fn(),
    addToFavorites: jest.fn(),
    removeFromFavorite: jest.fn(),
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    getDashboardStats: jest.fn(),
    getUserActivity: jest.fn()
  }
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

describe('Renderer Process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockElectronAPI.getUserData.mockImplementation((key) => {
      if (key === 'user') {
        return Promise.resolve({
          id: 'user123',
          email: 'user@example.com',
          displayName: 'Test User',
          role: 'user'
        });
      }
      if (key === 'theme') {
        return Promise.resolve('dark');
      }
      if (key === 'token') {
        return Promise.resolve('mock-token');
      }
      return Promise.resolve(null);
    });
    
    mockElectronAPI.getAppVersion.mockResolvedValue('1.0.0');
    mockElectronAPI.onUpdateAvailable.mockReturnValue(() => {});
    mockElectronAPI.onUpdateDownloaded.mockReturnValue(() => {});
    mockElectronAPI.onUserDataChanged.mockReturnValue(() => {});
  });

  const renderApp = () => {
    return render(
      <ThemeProvider>
        <AuthProvider>
          <QuoteProvider>
            <App />
          </QuoteProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  };

  test('renders loading screen initially', () => {
    renderApp();
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
  });

  test('loads user data from electron store on startup', async () => {
    renderApp();
    
    // Wait for the app to finish loading
    await waitFor(() => {
      expect(mockElectronAPI.getUserData).toHaveBeenCalledWith('user');
    });
    
    expect(mockElectronAPI.getUserData).toHaveBeenCalledWith('theme');
    expect(mockElectronAPI.getUserData).toHaveBeenCalledWith('token');
  });

  test('renders login screen when no user is stored', async () => {
    // Mock getUserData to return null for user
    mockElectronAPI.getUserData.mockImplementation((key) => {
      if (key === 'user') {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });
    
    renderApp();
    
    // Wait for the login screen to appear
    await waitFor(() => {
      expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
  });

  test('renders dashboard when user is authenticated', async () => {
    renderApp();
    
    // Wait for the dashboard to appear
    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
  });

  test('handles theme switching', async () => {
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });
    
    // Find and click the theme toggle button
    const themeToggle = screen.getByLabelText(/toggle theme/i);
    fireEvent.click(themeToggle);
    
    // Check that setUserData was called to save the new theme
    expect(mockElectronAPI.setUserData).toHaveBeenCalledWith('theme', 'light');
  });

  test('handles logout', async () => {
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });
    
    // Find and click the user menu
    const userMenu = screen.getByLabelText(/user menu/i);
    fireEvent.click(userMenu);
    
    // Find and click the logout button
    const logoutButton = screen.getByText(/Logout/i);
    fireEvent.click(logoutButton);
    
    // Check that clearUserData was called
    expect(mockElectronAPI.clearUserData).toHaveBeenCalledWith('user');
    expect(mockElectronAPI.clearUserData).toHaveBeenCalledWith('token');
  });

  test('checks for updates on startup', async () => {
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });
    
    // Check that checkForUpdates was called
    expect(mockElectronAPI.checkForUpdates).toHaveBeenCalled();
  });

  test('displays update notification when update is available', async () => {
    // Set up the onUpdateAvailable handler
    mockElectronAPI.onUpdateAvailable.mockImplementation((callback) => {
      // Store the callback to trigger it later
      setTimeout(() => callback({ version: '1.1.0' }), 100);
      return jest.fn(); // Return a mock cleanup function
    });
    
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });
    
    // Wait for the update notification to appear
    await waitFor(() => {
      expect(screen.getByText(/Update Available/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Version 1.1.0 is available/i)).toBeInTheDocument();
  });

  test('displays install prompt when update is downloaded', async () => {
    // Set up the onUpdateDownloaded handler
    mockElectronAPI.onUpdateDownloaded.mockImplementation((callback) => {
      // Store the callback to trigger it later
      setTimeout(() => callback({ version: '1.1.0', releaseNotes: 'Bug fixes' }), 100);
      return jest.fn(); // Return a mock cleanup function
    });
    
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });
    
    // Wait for the install prompt to appear
    await waitFor(() => {
      expect(screen.getByText(/Update Downloaded/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Version 1.1.0 has been downloaded/i)).toBeInTheDocument();
    expect(screen.getByText(/Restart Now/i)).toBeInTheDocument();
  });

  test('opens external links through the electron API', async () => {
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });
    
    // Find and click an external link
    const externalLink = screen.getByText(/Visit Website/i);
    fireEvent.click(externalLink);
    
    // Check that openExternalLink was called
    expect(mockElectronAPI.openExternalLink).toHaveBeenCalledWith(expect.any(String));
  });

  test('handles user data changes from main process', async () => {
    // Set up the onUserDataChanged handler
    let storedCallback;
    mockElectronAPI.onUserDataChanged.mockImplementation((callback) => {
      storedCallback = callback;
      return jest.fn(); // Return a mock cleanup function
    });
    
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });
    
    // Simulate a user data change from the main process
    const updatedUser = {
      id: 'user123',
      email: 'user@example.com',
      displayName: 'Updated User Name',
      role: 'user'
    };
    
    storedCallback('user', updatedUser);
    
    // Wait for the UI to update with the new user name
    await waitFor(() => {
      expect(screen.getByText(/Updated User Name/i)).toBeInTheDocument();
    });
  });

  test('handles offline mode gracefully', async () => {
    // Mock API error to simulate offline mode
    const { api } = require('../renderer/services/api');
    api.getRandomQuote.mockRejectedValue(new Error('Network Error'));
    
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });
    
    // Navigate to the quotes page
    const quotesLink = screen.getByText(/Quotes/i);
    fireEvent.click(quotesLink);
    
    // Wait for the offline message to appear
    await waitFor(() => {
      expect(screen.getByText(/You are currently offline/i)).toBeInTheDocument();
    });
    
    // Check that cached quotes are displayed if available
    mockElectronAPI.getUserData.mockImplementation((key) => {
      if (key === 'cachedQuotes') {
        return Promise.resolve([
          { id: 'quote1', text: 'Cached quote 1', author: 'Author 1' }
        ]);
      }
      return Promise.resolve(null);
    });
    
    // Refresh the quotes
    const refreshButton = screen.getByLabelText(/refresh/i);
    fireEvent.click(refreshButton);
    
    // Wait for cached quotes to appear
    await waitFor(() => {
      expect(screen.getByText(/Cached quote 1/i)).toBeInTheDocument();
    });
  });

  test('syncs favorites between online and offline mode', async () => {
    // Mock API for favorites
    const { api } = require('../renderer/services/api');
    api.getFavorites.mockResolvedValue({
      data: {
        favorites: [
          { _id: 'quote1', text: 'Favorite quote 1', author: 'Author 1' }
        ]
      }
    });
    
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });
    
    // Navigate to the favorites page
    const favoritesLink = screen.getByText(/Favorites/i);
    fireEvent.click(favoritesLink);
    
    // Wait for favorites to load
    await waitFor(() => {
      expect(screen.getByText(/Favorite quote 1/i)).toBeInTheDocument();
    });
    
    // Check that favorites are stored locally
    expect(mockElectronAPI.setUserData).toHaveBeenCalledWith('favorites', expect.any(Array));
  });

  test('displays app version from electron API', async () => {
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });
    
    // Navigate to the settings page
    const userMenu = screen.getByLabelText(/user menu/i);
    fireEvent.click(userMenu);
    
    const settingsLink = screen.getByText(/Settings/i);
    fireEvent.click(settingsLink);
    
    // Check that the app version is displayed
    expect(screen.getByText(/App Version: 1.0.0/i)).toBeInTheDocument();
  });
});