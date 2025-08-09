import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Admin from '../pages/Admin';
import { api } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

// Mock the API service
jest.mock('../services/api', () => ({
  api: {
    getDashboardStats: jest.fn(),
    getAllUsers: jest.fn(),
    deleteUser: jest.fn(),
    updateUserRole: jest.fn(),
    getAllQuotes: jest.fn(),
    createQuote: jest.fn(),
    updateQuote: jest.fn(),
    deleteQuote: jest.fn()
  }
}));

// Mock confirm dialog
window.confirm = jest.fn();

describe('Admin Component', () => {
  const mockAdminUser = {
    uid: 'admin123',
    email: 'admin@example.com',
    displayName: 'Admin User'
  };

  const mockStats = {
    totalUsers: 150,
    newUsersThisWeek: 25,
    totalQuotes: 500,
    newQuotesThisWeek: 30,
    activeUsersToday: 45,
    quotesViewedToday: 320,
    usersByDay: [
      { day: 'Monday', count: 30 },
      { day: 'Tuesday', count: 35 },
      { day: 'Wednesday', count: 40 },
      { day: 'Thursday', count: 38 },
      { day: 'Friday', count: 42 },
      { day: 'Saturday', count: 25 },
      { day: 'Sunday', count: 20 }
    ],
    quotesByCategory: [
      { category: 'inspiration', count: 150 },
      { category: 'success', count: 120 },
      { category: 'motivation', count: 100 },
      { category: 'life', count: 80 },
      { category: 'happiness', count: 50 }
    ]
  };

  const mockUsers = {
    users: [
      { _id: 'user1', email: 'user1@example.com', displayName: 'User One', role: 'user', createdAt: '2023-01-01T00:00:00.000Z' },
      { _id: 'user2', email: 'user2@example.com', displayName: 'User Two', role: 'user', createdAt: '2023-01-02T00:00:00.000Z' },
      { _id: 'admin1', email: 'admin1@example.com', displayName: 'Admin One', role: 'admin', createdAt: '2023-01-03T00:00:00.000Z' }
    ],
    pagination: {
      total: 3,
      page: 1,
      limit: 10,
      pages: 1
    }
  };

  const mockQuotes = {
    quotes: [
      { _id: 'quote1', text: 'Quote One', author: 'Author One', tags: ['inspiration'], addedBy: { displayName: 'User One' }, createdAt: '2023-01-01T00:00:00.000Z' },
      { _id: 'quote2', text: 'Quote Two', author: 'Author Two', tags: ['success'], addedBy: { displayName: 'User Two' }, createdAt: '2023-01-02T00:00:00.000Z' }
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
    api.getAllUsers.mockResolvedValue({ data: mockUsers });
    api.getAllQuotes.mockResolvedValue({ data: mockQuotes });
    api.deleteUser.mockResolvedValue({ data: { success: true } });
    api.updateUserRole.mockResolvedValue({ data: { success: true } });
    api.deleteQuote.mockResolvedValue({ data: { success: true } });
    
    // Mock confirm to return true by default
    window.confirm.mockReturnValue(true);
  });

  const renderWithAuth = (ui, { user = mockAdminUser, role = 'admin' } = {}) => {
    return render(
      <AuthContext.Provider value={{ user, loading: false, role }}>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </AuthContext.Provider>
    );
  };

  test('renders loading state initially', () => {
    renderWithAuth(<Admin />);
    expect(screen.getByText(/Loading admin dashboard.../i)).toBeInTheDocument();
  });

  test('renders admin dashboard with stats after loading', async () => {
    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Check if stats are displayed
    expect(screen.getByText(/150/)).toBeInTheDocument(); // Total users
    expect(screen.getByText(/25/)).toBeInTheDocument(); // New users this week
    expect(screen.getByText(/500/)).toBeInTheDocument(); // Total quotes
    expect(screen.getByText(/30/)).toBeInTheDocument(); // New quotes this week
    
    // Check if tabs are displayed
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Quote Management/i)).toBeInTheDocument();
  });

  test('switches to User Management tab when clicked', async () => {
    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on User Management tab
    fireEvent.click(screen.getByText(/User Management/i));

    // Check if user table is displayed
    expect(screen.getByText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText(/Display Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Role/i)).toBeInTheDocument();
    expect(screen.getByText(/Actions/i)).toBeInTheDocument();
    
    // Check if user data is displayed
    mockUsers.users.forEach(user => {
      expect(screen.getByText(user.email)).toBeInTheDocument();
      expect(screen.getByText(user.displayName)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(user.role, 'i'))).toBeInTheDocument();
    });
  });

  test('switches to Quote Management tab when clicked', async () => {
    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on Quote Management tab
    fireEvent.click(screen.getByText(/Quote Management/i));

    // Check if quote table is displayed
    expect(screen.getByText(/Quote Text/i)).toBeInTheDocument();
    expect(screen.getByText(/Author/i)).toBeInTheDocument();
    expect(screen.getByText(/Tags/i)).toBeInTheDocument();
    expect(screen.getByText(/Added By/i)).toBeInTheDocument();
    
    // Check if quote data is displayed
    mockQuotes.quotes.forEach(quote => {
      expect(screen.getByText(quote.text)).toBeInTheDocument();
      expect(screen.getByText(quote.author)).toBeInTheDocument();
      expect(screen.getByText(quote.tags[0])).toBeInTheDocument();
      expect(screen.getByText(quote.addedBy.displayName)).toBeInTheDocument();
    });
  });

  test('handles user deletion', async () => {
    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on User Management tab
    fireEvent.click(screen.getByText(/User Management/i));

    // Find and click delete button for first user
    const deleteButtons = screen.getAllByLabelText(/delete user/i);
    fireEvent.click(deleteButtons[0]);

    // Confirm should have been called
    expect(window.confirm).toHaveBeenCalled();
    
    // API should have been called with correct user ID
    expect(api.deleteUser).toHaveBeenCalledWith(mockUsers.users[0]._id);
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/User deleted successfully/i)).toBeInTheDocument();
    });
  });

  test('handles user role update', async () => {
    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on User Management tab
    fireEvent.click(screen.getByText(/User Management/i));

    // Find and click role toggle for first user
    const roleToggles = screen.getAllByLabelText(/change role/i);
    fireEvent.click(roleToggles[0]);

    // Confirm should have been called
    expect(window.confirm).toHaveBeenCalled();
    
    // API should have been called with correct user ID and new role
    expect(api.updateUserRole).toHaveBeenCalledWith(
      mockUsers.users[0]._id,
      mockUsers.users[0].role === 'user' ? 'admin' : 'user'
    );
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/User role updated successfully/i)).toBeInTheDocument();
    });
  });

  test('handles quote deletion', async () => {
    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on Quote Management tab
    fireEvent.click(screen.getByText(/Quote Management/i));

    // Find and click delete button for first quote
    const deleteButtons = screen.getAllByLabelText(/delete quote/i);
    fireEvent.click(deleteButtons[0]);

    // Confirm should have been called
    expect(window.confirm).toHaveBeenCalled();
    
    // API should have been called with correct quote ID
    expect(api.deleteQuote).toHaveBeenCalledWith(mockQuotes.quotes[0]._id);
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/Quote deleted successfully/i)).toBeInTheDocument();
    });
  });

  test('handles quote creation', async () => {
    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on Quote Management tab
    fireEvent.click(screen.getByText(/Quote Management/i));

    // Click on Add New Quote button
    fireEvent.click(screen.getByText(/Add New Quote/i));

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/quote text/i), {
      target: { value: 'New test quote' }
    });
    fireEvent.change(screen.getByLabelText(/author/i), {
      target: { value: 'Test Author' }
    });
    fireEvent.change(screen.getByLabelText(/tags/i), {
      target: { value: 'test,new' }
    });

    // Mock successful quote creation
    api.createQuote.mockResolvedValue({
      data: {
        success: true,
        quote: {
          _id: 'new-quote-id',
          text: 'New test quote',
          author: 'Test Author',
          tags: ['test', 'new']
        }
      }
    });

    // Submit the form
    fireEvent.click(screen.getByText(/Submit/i));

    // API should have been called with correct data
    expect(api.createQuote).toHaveBeenCalledWith({
      text: 'New test quote',
      author: 'Test Author',
      tags: ['test', 'new']
    });

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/Quote created successfully/i)).toBeInTheDocument();
    });
  });

  test('handles quote editing', async () => {
    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on Quote Management tab
    fireEvent.click(screen.getByText(/Quote Management/i));

    // Find and click edit button for first quote
    const editButtons = screen.getAllByLabelText(/edit quote/i);
    fireEvent.click(editButtons[0]);

    // Form should be pre-filled with quote data
    expect(screen.getByLabelText(/quote text/i).value).toBe(mockQuotes.quotes[0].text);
    expect(screen.getByLabelText(/author/i).value).toBe(mockQuotes.quotes[0].author);
    expect(screen.getByLabelText(/tags/i).value).toBe(mockQuotes.quotes[0].tags.join(','));

    // Change the quote text
    fireEvent.change(screen.getByLabelText(/quote text/i), {
      target: { value: 'Updated quote text' }
    });

    // Mock successful quote update
    api.updateQuote.mockResolvedValue({
      data: {
        success: true,
        quote: {
          ...mockQuotes.quotes[0],
          text: 'Updated quote text'
        }
      }
    });

    // Submit the form
    fireEvent.click(screen.getByText(/Update/i));

    // API should have been called with correct data
    expect(api.updateQuote).toHaveBeenCalledWith(
      mockQuotes.quotes[0]._id,
      {
        text: 'Updated quote text',
        author: mockQuotes.quotes[0].author,
        tags: mockQuotes.quotes[0].tags
      }
    );

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/Quote updated successfully/i)).toBeInTheDocument();
    });
  });

  test('handles user search', async () => {
    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on User Management tab
    fireEvent.click(screen.getByText(/User Management/i));

    // Type in search field
    fireEvent.change(screen.getByPlaceholderText(/Search users.../i), {
      target: { value: 'admin' }
    });

    // Press Enter to search
    fireEvent.keyDown(screen.getByPlaceholderText(/Search users.../i), { key: 'Enter', code: 'Enter' });

    // API should have been called with search term
    expect(api.getAllUsers).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'admin');
  });

  test('handles quote search', async () => {
    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on Quote Management tab
    fireEvent.click(screen.getByText(/Quote Management/i));

    // Type in search field
    fireEvent.change(screen.getByPlaceholderText(/Search quotes.../i), {
      target: { value: 'inspiration' }
    });

    // Press Enter to search
    fireEvent.keyDown(screen.getByPlaceholderText(/Search quotes.../i), { key: 'Enter', code: 'Enter' });

    // API should have been called with search term
    expect(api.getAllQuotes).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'inspiration');
  });

  test('handles pagination for users', async () => {
    // Mock paginated response
    api.getAllUsers.mockResolvedValue({
      data: {
        ...mockUsers,
        pagination: {
          total: 30,
          page: 1,
          limit: 10,
          pages: 3
        }
      }
    });

    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on User Management tab
    fireEvent.click(screen.getByText(/User Management/i));

    // Pagination should be displayed
    expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();

    // Click next page button
    fireEvent.click(screen.getByLabelText(/next page/i));

    // API should have been called with page 2
    expect(api.getAllUsers).toHaveBeenCalledWith(2, 10, '');
  });

  test('handles pagination for quotes', async () => {
    // Mock paginated response
    api.getAllQuotes.mockResolvedValue({
      data: {
        ...mockQuotes,
        pagination: {
          total: 30,
          page: 1,
          limit: 10,
          pages: 3
        }
      }
    });

    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on Quote Management tab
    fireEvent.click(screen.getByText(/Quote Management/i));

    // Pagination should be displayed
    expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();

    // Click next page button
    fireEvent.click(screen.getByLabelText(/next page/i));

    // API should have been called with page 2
    expect(api.getAllQuotes).toHaveBeenCalledWith(2, 10, '');
  });

  test('handles API error for stats gracefully', async () => {
    // Mock API error
    api.getDashboardStats.mockRejectedValue(new Error('Failed to fetch stats'));

    renderWithAuth(<Admin />);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Error loading admin dashboard/i)).toBeInTheDocument();
    });
  });

  test('handles API error for users gracefully', async () => {
    // Mock successful stats but failed users
    api.getDashboardStats.mockResolvedValue({ data: { stats: mockStats } });
    api.getAllUsers.mockRejectedValue(new Error('Failed to fetch users'));

    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on User Management tab
    fireEvent.click(screen.getByText(/User Management/i));

    // Error message should be displayed
    expect(screen.getByText(/Error loading users/i)).toBeInTheDocument();
  });

  test('handles API error for quotes gracefully', async () => {
    // Mock successful stats but failed quotes
    api.getDashboardStats.mockResolvedValue({ data: { stats: mockStats } });
    api.getAllQuotes.mockRejectedValue(new Error('Failed to fetch quotes'));

    renderWithAuth(<Admin />);

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading admin dashboard.../i)).not.toBeInTheDocument();
    });

    // Click on Quote Management tab
    fireEvent.click(screen.getByText(/Quote Management/i));

    // Error message should be displayed
    expect(screen.getByText(/Error loading quotes/i)).toBeInTheDocument();
  });
});