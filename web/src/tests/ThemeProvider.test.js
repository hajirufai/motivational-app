import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    getAll: () => store
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation(query => ({
    matches: false, // Default to light mode
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Test component that uses the theme context
const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('provides default theme as light when no theme in localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
  });

  test('loads theme from localStorage if available', () => {
    // Set theme in localStorage
    localStorageMock.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
  });

  test('toggles theme when toggle function is called', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Initial theme should be light
    expect(screen.getByTestId('current-theme').textContent).toBe('light');

    // Toggle theme
    fireEvent.click(screen.getByTestId('toggle-theme'));

    // Theme should now be dark
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');

    // Toggle theme again
    fireEvent.click(screen.getByTestId('toggle-theme'));

    // Theme should now be light again
    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  test('uses system preference when theme is set to system', () => {
    // Mock system preference to dark
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));

    // Set theme in localStorage to system
    localStorageMock.setItem('theme', 'system');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Since system preference is dark, theme should be dark
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
  });

  test('updates theme when system preference changes', () => {
    // Initial system preference is light
    let systemPreference = false;
    const mediaQueryList = {
      matches: systemPreference,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: jest.fn((callback) => {
        mediaQueryList.callback = callback;
      }),
      removeListener: jest.fn(),
      addEventListener: jest.fn((event, callback) => {
        mediaQueryList.callback = callback;
      }),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    };

    window.matchMedia = jest.fn().mockImplementation(query => {
      if (query === '(prefers-color-scheme: dark)') {
        return mediaQueryList;
      }
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      };
    });

    // Set theme in localStorage to system
    localStorageMock.setItem('theme', 'system');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Initial theme should be light (system preference)
    expect(screen.getByTestId('current-theme').textContent).toBe('light');

    // Simulate system preference change to dark
    act(() => {
      systemPreference = true;
      mediaQueryList.matches = systemPreference;
      mediaQueryList.callback({ matches: systemPreference });
    });

    // Theme should now be dark
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
  });

  test('provides setTheme function to directly set theme', () => {
    // Create a component that uses setTheme
    const ThemeSetterComponent = () => {
      const { theme, setTheme } = useTheme();
      return (
        <div>
          <div data-testid="current-theme">{theme}</div>
          <button data-testid="set-light" onClick={() => setTheme('light')}>Set Light</button>
          <button data-testid="set-dark" onClick={() => setTheme('dark')}>Set Dark</button>
          <button data-testid="set-system" onClick={() => setTheme('system')}>Set System</button>
        </div>
      );
    };

    render(
      <ThemeProvider>
        <ThemeSetterComponent />
      </ThemeProvider>
    );

    // Initial theme should be light
    expect(screen.getByTestId('current-theme').textContent).toBe('light');

    // Set theme to dark
    fireEvent.click(screen.getByTestId('set-dark'));
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');

    // Set theme to system
    fireEvent.click(screen.getByTestId('set-system'));
    expect(screen.getByTestId('current-theme').textContent).toBe('light'); // System preference is light
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'system');

    // Set theme back to light
    fireEvent.click(screen.getByTestId('set-light'));
    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  test('applies theme-specific CSS variables to document root', () => {
    // Mock document.documentElement.style
    const originalDocumentElementStyle = document.documentElement.style;
    const mockStyle = {};
    Object.defineProperty(document.documentElement, 'style', {
      get: () => mockStyle,
      set: () => {},
      configurable: true
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Check that light theme variables are applied
    expect(mockStyle['--background-color']).toBeDefined();
    expect(mockStyle['--text-color']).toBeDefined();
    expect(mockStyle['--primary-color']).toBeDefined();

    // Toggle to dark theme
    fireEvent.click(screen.getByTestId('toggle-theme'));

    // Check that dark theme variables are applied
    expect(mockStyle['--background-color']).toBeDefined();
    expect(mockStyle['--text-color']).toBeDefined();
    expect(mockStyle['--primary-color']).toBeDefined();

    // Restore original style
    Object.defineProperty(document.documentElement, 'style', {
      value: originalDocumentElementStyle,
      configurable: true
    });
  });

  test('adds appropriate class to body based on current theme', () => {
    // Mock document.body.classList
    const originalClassList = document.body.classList;
    const mockClassList = {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn()
    };
    Object.defineProperty(document.body, 'classList', {
      get: () => mockClassList,
      configurable: true
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Check that light theme class is added
    expect(mockClassList.add).toHaveBeenCalledWith('light-theme');
    expect(mockClassList.remove).toHaveBeenCalledWith('dark-theme');

    // Reset mock
    mockClassList.add.mockClear();
    mockClassList.remove.mockClear();

    // Toggle to dark theme
    fireEvent.click(screen.getByTestId('toggle-theme'));

    // Check that dark theme class is added
    expect(mockClassList.add).toHaveBeenCalledWith('dark-theme');
    expect(mockClassList.remove).toHaveBeenCalledWith('light-theme');

    // Restore original classList
    Object.defineProperty(document.body, 'classList', {
      value: originalClassList,
      configurable: true
    });
  });

  test('handles invalid theme values in localStorage', () => {
    // Set invalid theme in localStorage
    localStorageMock.setItem('theme', 'invalid_theme');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Should default to light theme
    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    // Should correct the localStorage value
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  test('cleans up event listeners on unmount', () => {
    const mediaQueryList = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    };

    window.matchMedia = jest.fn().mockImplementation(query => {
      if (query === '(prefers-color-scheme: dark)') {
        return mediaQueryList;
      }
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      };
    });

    // Set theme to system to ensure event listeners are added
    localStorageMock.setItem('theme', 'system');

    const { unmount } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Unmount component
    unmount();

    // Check that event listeners were removed
    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});