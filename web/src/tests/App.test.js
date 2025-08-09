import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { getAuth } from 'firebase/auth';

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({}))
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null
  })),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null); // Simulate no user logged in
    return jest.fn(); // Return unsubscribe function
  })
}));

// Mock API service
jest.mock('../services/api', () => ({
  initApi: jest.fn()
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }) => <div data-testid="browser-router">{children}</div>,
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ path, element }) => <div data-testid={`route-${path}`}>{element}</div>,
  Navigate: ({ to }) => <div data-testid={`navigate-to-${to}`} />,
}));

// Mock components
jest.mock('../pages/Home', () => () => <div data-testid="home-page">Home Page</div>);
jest.mock('../pages/Login', () => () => <div data-testid="login-page">Login Page</div>);
jest.mock('../pages/Register', () => () => <div data-testid="register-page">Register Page</div>);
jest.mock('../pages/Dashboard', () => () => <div data-testid="dashboard-page">Dashboard Page</div>);
jest.mock('../pages/Profile', () => () => <div data-testid="profile-page">Profile Page</div>);
jest.mock('../pages/NotFound', () => () => <div data-testid="not-found-page">Not Found Page</div>);
jest.mock('../pages/Admin', () => () => <div data-testid="admin-page">Admin Page</div>);
jest.mock('../components/Layout', () => ({ children }) => <div data-testid="layout">{children}</div>);
jest.mock('../components/LoadingScreen', () => () => <div data-testid="loading-screen">Loading...</div>);

describe('App Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders loading screen initially', () => {
    render(<App />);
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
  });

  test('renders routes after loading', async () => {
    render(<App />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    // Check if routes are rendered
    expect(screen.getByTestId('browser-router')).toBeInTheDocument();
    expect(screen.getByTestId('routes')).toBeInTheDocument();
    expect(screen.getByTestId('route-/')).toBeInTheDocument();
    expect(screen.getByTestId('route-/login')).toBeInTheDocument();
    expect(screen.getByTestId('route-/register')).toBeInTheDocument();
  });

  test('redirects authenticated routes to login when user is not logged in', async () => {
    render(<App />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    // Check if dashboard route has Navigate component to redirect to login
    const dashboardRoute = screen.getByTestId('route-/dashboard');
    expect(dashboardRoute).toContainElement(screen.getByTestId('navigate-to-/login'));
  });

  test('renders home page', async () => {
    render(<App />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    // Check if home page is rendered
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });
});