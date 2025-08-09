import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../pages/Home';
import { api } from '../services/api';

// Mock the API service
jest.mock('../services/api', () => ({
  api: {
    getRandomQuote: jest.fn()
  }
}));

// Mock copy to clipboard functionality
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve())
  }
});

// Mock window.open for share functionality
window.open = jest.fn();

describe('Home Component', () => {
  const mockQuote = {
    _id: '123',
    text: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
    tags: ['inspiration', 'work']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API response
    api.getRandomQuote.mockResolvedValue({ data: { quote: mockQuote } });
  });

  test('renders hero section with title and subtitle', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText(/Daily Motivation/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspire your day with powerful quotes/i)).toBeInTheDocument();
  });

  test('renders call-to-action buttons', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn More/i)).toBeInTheDocument();
  });

  test('renders loading state initially for quote section', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading quote.../i)).toBeInTheDocument();
  });

  test('renders quote after loading', async () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    // Wait for the quote to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading quote.../i)).not.toBeInTheDocument();
    });

    // Check if quote is displayed
    expect(screen.getByText(mockQuote.text)).toBeInTheDocument();
    expect(screen.getByText(`— ${mockQuote.author}`)).toBeInTheDocument();
  });

  test('handles copy to clipboard functionality', async () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    // Wait for the quote to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading quote.../i)).not.toBeInTheDocument();
    });

    // Find and click the copy button
    const copyButton = screen.getByLabelText(/copy quote/i);
    fireEvent.click(copyButton);

    // Check if clipboard API was called with the quote text
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `"${mockQuote.text}" — ${mockQuote.author}`
    );
  });

  test('handles share functionality', async () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    // Wait for the quote to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading quote.../i)).not.toBeInTheDocument();
    });

    // Find and click the share button
    const shareButton = screen.getByLabelText(/share quote/i);
    fireEvent.click(shareButton);

    // Check if window.open was called with the correct URL
    const encodedText = encodeURIComponent(`"${mockQuote.text}" — ${mockQuote.author}`);
    expect(window.open).toHaveBeenCalledWith(
      `https://twitter.com/intent/tweet?text=${encodedText}`,
      '_blank'
    );
  });

  test('handles API error gracefully', async () => {
    // Mock API error
    api.getRandomQuote.mockRejectedValue(new Error('Failed to fetch quote'));

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to load quote/i)).toBeInTheDocument();
    });
  });

  test('renders features section', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText(/Features/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Quotes/i)).toBeInTheDocument();
    expect(screen.getByText(/Personalized Experience/i)).toBeInTheDocument();
    expect(screen.getByText(/Cross-Platform/i)).toBeInTheDocument();
  });

  test('renders download section', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText(/Download the Desktop App/i)).toBeInTheDocument();
    expect(screen.getByText(/Available for Windows, macOS, and Linux/i)).toBeInTheDocument();
  });
});