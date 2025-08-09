import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { api } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

// Mock the API service
jest.mock('../services/api', () => ({
  api: {
    getDashboardStats: jest.fn(),
    getUserActivity: jest.fn(),
    getFavorites: jest.fn()
  }
}));

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => children,
    LineChart: () => <div data-testid="line-chart" />,
    BarChart: () => <div data-testid="bar-chart" />,
    PieChart: () => <div data-testid="pie-chart" />
  };
});

describe('Dashboard Component', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User'
  };

  const mockStats = {
    quotesViewed: 42,
    favoriteQuotes: 15,
    streakDays: 7,
    topCategories: [
      { category: 'inspiration', count: 10 },
      { category: 'success', count: 8 },
      { category: 'motivation', count: 5 }
    ],
    activityByDay: [
      { day: 'Monday', count: 5 },
      { day: 'Tuesday', count: 8 },
      { day: 'Wednesday', count: 6 },
      { day: 'Thursday', count: 10 },
      { day: 'Friday', count: 7 },
      { day: 'Saturday', count: 3 },
      { day: 'Sunday', count: 4 }
    ]
  };

  const mockActivity = {
    activities: [
      { _id: 'act1', type: 'view', quote: { text: 'Quote 1', author: 'Author 1' }, timestamp: '2023-06-01T10:00:00.000Z' },
      { _id: 'act2', type: 'favorite', quote: { text: 'Quote 2', author: 'Author 2' }, timestamp: '2023-06-01T11:00:00.000Z' },
      { _id: 'act3', type: 'share', quote: { text: 'Quote 3', author: 'Author 3' }, timestamp: '2023-06-01T12:00:00.000Z' }
    ],
    pagination: {
      total: 10,
      page: 1,
      limit: 3,
      pages: 4
    }
  };

  const mockFavorites = {
    quotes: [
      { _id: 'quote1', text: 'Favorite Quote 1', author: 'Author 1', tags: ['inspiration'] },
      { _id: 'quote2', text: 'Favorite Quote 2', author: 'Author 2', tags: ['success'] }
    ],
    pagination: {
      total: 2,
      page: 1,
      limit: 10,
      pages: 1
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API responses
    api.getDashboardStats.mockResolvedValue({ data: { stats: mockStats } });
    api.getUserActivity.mockResolvedValue({ data: mockActivity });
    api.getFavorites.mockResolvedValue({ data: mockFavorites });
  });

  const renderWithAuth = (ui, { user = mockUser, role = 'user' } = {}) => {
    return render(
      <AuthContext.Provider value={{ user, loading: false, role }}>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </AuthContext.Provider>
    );
  };

  test('renders loading state initially', () => {
    renderWithAuth(<Dashboard />);
    expect(screen.getByText(/Loading dashboard.../i)).toBeInTheDocument();
  });

  test('renders dashboard with stats after loading', async () => {
    renderWithAuth(<Dashboard />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Check if stats are displayed
    expect(screen.getByText(/42/)).toBeInTheDocument(); // Quotes viewed
    expect(screen.getByText(/15/)).toBeInTheDocument(); // Favorite quotes
    expect(screen.getByText(/7/)).toBeInTheDocument(); // Streak days
    
    // Check if charts are rendered
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    
    // Check if activity section is displayed
    expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
    mockActivity.activities.forEach(activity => {
      expect(screen.getByText(new RegExp(activity.quote.text))).toBeInTheDocument();
    });
    
    // Check if favorites section is displayed
    expect(screen.getByText(/Favorite Quotes/i)).toBeInTheDocument();
    mockFavorites.quotes.forEach(quote => {
      expect(screen.getByText(new RegExp(quote.text))).toBeInTheDocument();
    });
  });

  test('renders admin stats for admin users', async () => {
    // Mock admin-specific stats
    const adminStats = {
      ...mockStats,
      totalUsers: 150,
      newUsersThisWeek: 25,
      totalQuotes: 500,
      newQuotesThisWeek: 30
    };
    api.getDashboardStats.mockResolvedValue({ data: { stats: adminStats } });
    
    renderWithAuth(<Dashboard />, { role: 'admin' });

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Check if admin-specific stats are displayed
    expect(screen.getByText(/150/)).toBeInTheDocument(); // Total users
    expect(screen.getByText(/25/)).toBeInTheDocument(); // New users this week
    expect(screen.getByText(/500/)).toBeInTheDocument(); // Total quotes
    expect(screen.getByText(/30/)).toBeInTheDocument(); // New quotes this week
  });

  test('handles API error for stats gracefully', async () => {
    // Mock API error
    api.getDashboardStats.mockRejectedValue(new Error('Failed to fetch stats'));

    renderWithAuth(<Dashboard />);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Error loading dashboard stats/i)).toBeInTheDocument();
    });
  });

  test('handles API error for activity gracefully', async () => {
    // Mock successful stats but failed activity
    api.getDashboardStats.mockResolvedValue({ data: { stats: mockStats } });
    api.getUserActivity.mockRejectedValue(new Error('Failed to fetch activity'));

    renderWithAuth(<Dashboard />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Stats should be displayed
    expect(screen.getByText(/42/)).toBeInTheDocument(); // Quotes viewed
    
    // Activity error should be displayed
    expect(screen.getByText(/Error loading activity/i)).toBeInTheDocument();
  });

  test('handles API error for favorites gracefully', async () => {
    // Mock successful stats and activity but failed favorites
    api.getDashboardStats.mockResolvedValue({ data: { stats: mockStats } });
    api.getUserActivity.mockResolvedValue({ data: mockActivity });
    api.getFavorites.mockRejectedValue(new Error('Failed to fetch favorites'));

    renderWithAuth(<Dashboard />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Stats and activity should be displayed
    expect(screen.getByText(/42/)).toBeInTheDocument(); // Quotes viewed
    expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
    
    // Favorites error should be displayed
    expect(screen.getByText(/Error loading favorites/i)).toBeInTheDocument();
  });

  test('renders empty state for no activity', async () => {
    // Mock empty activity
    api.getUserActivity.mockResolvedValue({ 
      data: { 
        activities: [], 
        pagination: { total: 0, page: 1, limit: 10, pages: 0 } 
      } 
    });

    renderWithAuth(<Dashboard />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Empty state message should be displayed
    expect(screen.getByText(/No recent activity/i)).toBeInTheDocument();
  });

  test('renders empty state for no favorites', async () => {
    // Mock empty favorites
    api.getFavorites.mockResolvedValue({ 
      data: { 
        quotes: [], 
        pagination: { total: 0, page: 1, limit: 10, pages: 0 } 
      } 
    });

    renderWithAuth(<Dashboard />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Empty state message should be displayed
    expect(screen.getByText(/No favorite quotes/i)).toBeInTheDocument();
  });

  test('renders pagination for activity when there are multiple pages', async () => {
    renderWithAuth(<Dashboard />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Pagination should be displayed
    expect(screen.getByText(/Page 1 of 4/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
  });

  test('renders streak information correctly', async () => {
    renderWithAuth(<Dashboard />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Streak information should be displayed
    expect(screen.getByText(/Current Streak/i)).toBeInTheDocument();
    expect(screen.getByText(/7 days/i)).toBeInTheDocument();
  });

  test('renders top categories correctly', async () => {
    renderWithAuth(<Dashboard />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Top categories should be displayed
    expect(screen.getByText(/Top Categories/i)).toBeInTheDocument();
    mockStats.topCategories.forEach(category => {
      expect(screen.getByText(new RegExp(category.category, 'i'))).toBeInTheDocument();
    });
  });
});