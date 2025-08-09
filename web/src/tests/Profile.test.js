import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Profile from '../pages/Profile';
import { api } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

// Mock the API service
jest.mock('../services/api', () => ({
  api: {
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn()
  }
}));

describe('Profile Component', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User'
  };

  const mockProfileData = {
    displayName: 'Test User',
    email: 'test@example.com',
    bio: 'This is a test bio',
    location: 'Test City',
    joinDate: '2023-01-01T00:00:00.000Z',
    favoriteCategories: ['inspiration', 'success']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API response
    api.getUserProfile.mockResolvedValue({ data: { user: mockProfileData } });
    api.updateUserProfile.mockResolvedValue({ data: { success: true, user: mockProfileData } });
  });

  const renderWithAuth = (ui, { user = mockUser } = {}) => {
    return render(
      <AuthContext.Provider value={{ user, loading: false }}>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </AuthContext.Provider>
    );
  };

  test('renders loading state initially', () => {
    renderWithAuth(<Profile />);
    expect(screen.getByText(/Loading profile.../i)).toBeInTheDocument();
  });

  test('renders profile data after loading', async () => {
    renderWithAuth(<Profile />);

    // Wait for the profile to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile.../i)).not.toBeInTheDocument();
    });

    // Check if profile data is displayed
    expect(screen.getByDisplayValue(mockProfileData.displayName)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockProfileData.email)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockProfileData.bio)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockProfileData.location)).toBeInTheDocument();
    
    // Check if join date is formatted and displayed
    const formattedDate = new Date(mockProfileData.joinDate).toLocaleDateString();
    expect(screen.getByText(new RegExp(formattedDate))).toBeInTheDocument();
    
    // Check if favorite categories are displayed
    mockProfileData.favoriteCategories.forEach(category => {
      expect(screen.getByText(new RegExp(category, 'i'))).toBeInTheDocument();
    });
  });

  test('handles form submission correctly', async () => {
    renderWithAuth(<Profile />);

    // Wait for the profile to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile.../i)).not.toBeInTheDocument();
    });

    // Update form fields
    const displayNameInput = screen.getByLabelText(/display name/i);
    const bioInput = screen.getByLabelText(/bio/i);
    const locationInput = screen.getByLabelText(/location/i);
    
    fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });
    fireEvent.change(bioInput, { target: { value: 'Updated bio information' } });
    fireEvent.change(locationInput, { target: { value: 'New City' } });

    // Submit the form
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    // Check if API was called with updated data
    await waitFor(() => {
      expect(api.updateUserProfile).toHaveBeenCalledWith({
        displayName: 'Updated Name',
        bio: 'Updated bio information',
        location: 'New City',
        favoriteCategories: mockProfileData.favoriteCategories
      });
    });

    // Check for success message
    expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
  });

  test('handles API error during profile fetch', async () => {
    // Mock API error
    api.getUserProfile.mockRejectedValue(new Error('Failed to fetch profile'));

    renderWithAuth(<Profile />);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/error loading profile/i)).toBeInTheDocument();
    });
  });

  test('handles API error during profile update', async () => {
    // Mock successful get but failed update
    api.getUserProfile.mockResolvedValue({ data: { user: mockProfileData } });
    api.updateUserProfile.mockRejectedValue(new Error('Failed to update profile'));

    renderWithAuth(<Profile />);

    // Wait for the profile to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile.../i)).not.toBeInTheDocument();
    });

    // Submit the form
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/error updating profile/i)).toBeInTheDocument();
    });
  });

  test('disables form fields when loading', async () => {
    renderWithAuth(<Profile />);

    // Initially loading
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toBeDisabled();
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile.../i)).not.toBeInTheDocument();
    });

    // Inputs should be enabled after loading
    inputs.forEach(input => {
      expect(input).not.toBeDisabled();
    });
  });

  test('renders avatar and allows changing it', async () => {
    renderWithAuth(<Profile />);

    // Wait for the profile to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile.../i)).not.toBeInTheDocument();
    });

    // Check if avatar is displayed
    expect(screen.getByAltText(/user avatar/i)).toBeInTheDocument();

    // Check if change avatar button exists
    expect(screen.getByText(/change avatar/i)).toBeInTheDocument();

    // Mock file input change
    const fileInput = screen.getByLabelText(/upload avatar/i);
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });
    
    fireEvent.change(fileInput);

    // Check if preview is updated
    await waitFor(() => {
      expect(screen.getByAltText(/avatar preview/i)).toBeInTheDocument();
    });
  });
});