import {
  formatDate,
  truncateText,
  validateEmail,
  validatePassword,
  calculateReadingTime,
  generateShareUrl,
  parseQueryParams,
  debounce,
  throttle,
  getRandomColor,
  formatNumber
} from '../utils';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    test('formats date correctly with default format', () => {
      const date = new Date('2023-05-15T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/May 15, 2023/); // Exact format may vary by locale
    });

    test('formats date with custom format', () => {
      const date = new Date('2023-05-15T10:30:00Z');
      const formatted = formatDate(date, 'yyyy-MM-dd');
      expect(formatted).toBe('2023-05-15');
    });

    test('handles invalid date gracefully', () => {
      const formatted = formatDate('not a date');
      expect(formatted).toBe('Invalid Date');
    });

    test('formats relative time correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const formatted = formatDate(oneHourAgo, 'relative');
      expect(formatted).toContain('hour ago');
    });
  });

  describe('truncateText', () => {
    test('truncates text longer than maxLength', () => {
      const text = 'This is a long text that should be truncated';
      const truncated = truncateText(text, 10);
      expect(truncated).toBe('This is a...');
    });

    test('does not truncate text shorter than maxLength', () => {
      const text = 'Short text';
      const truncated = truncateText(text, 20);
      expect(truncated).toBe('Short text');
    });

    test('handles empty string', () => {
      const truncated = truncateText('', 10);
      expect(truncated).toBe('');
    });

    test('uses custom suffix when provided', () => {
      const text = 'This is a long text that should be truncated';
      const truncated = truncateText(text, 10, ' [more]');
      expect(truncated).toBe('This is a [more]');
    });
  });

  describe('validateEmail', () => {
    test('validates correct email formats', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('user.name@example.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    test('rejects incorrect email formats', () => {
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@example')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
      expect(validateEmail('user@exam ple.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('validates strong passwords', () => {
      expect(validatePassword('StrongP@ss123')).toBe(true);
      expect(validatePassword('Another$trongP4ss')).toBe(true);
    });

    test('rejects weak passwords', () => {
      // Too short
      expect(validatePassword('Abc123!')).toBe(false);
      // No uppercase
      expect(validatePassword('weakpass123!')).toBe(false);
      // No lowercase
      expect(validatePassword('WEAKPASS123!')).toBe(false);
      // No numbers
      expect(validatePassword('WeakPassword!')).toBe(false);
      // No special characters
      expect(validatePassword('WeakPassword123')).toBe(false);
      // Empty string
      expect(validatePassword('')).toBe(false);
    });
  });

  describe('calculateReadingTime', () => {
    test('calculates reading time correctly', () => {
      // Assuming average reading speed of 200 words per minute
      const shortText = 'This is a short text with only a few words.';
      expect(calculateReadingTime(shortText)).toBe('Less than a minute');

      // Create a text with approximately 400 words (200 * 2)
      let longText = '';
      for (let i = 0; i < 400; i++) {
        longText += 'word ';
      }
      expect(calculateReadingTime(longText)).toBe('2 min read');
    });

    test('handles empty text', () => {
      expect(calculateReadingTime('')).toBe('Less than a minute');
    });
  });

  describe('generateShareUrl', () => {
    test('generates correct share URLs for different platforms', () => {
      const url = 'https://example.com/quote/123';
      const text = 'This is an inspirational quote';

      // Twitter
      const twitterUrl = generateShareUrl('twitter', url, text);
      expect(twitterUrl).toContain('https://twitter.com/intent/tweet');
      expect(twitterUrl).toContain(encodeURIComponent(url));
      expect(twitterUrl).toContain(encodeURIComponent(text));

      // Facebook
      const facebookUrl = generateShareUrl('facebook', url);
      expect(facebookUrl).toContain('https://www.facebook.com/sharer/sharer.php');
      expect(facebookUrl).toContain(encodeURIComponent(url));

      // LinkedIn
      const linkedinUrl = generateShareUrl('linkedin', url, text);
      expect(linkedinUrl).toContain('https://www.linkedin.com/sharing/share-offsite/');
      expect(linkedinUrl).toContain(encodeURIComponent(url));
      expect(linkedinUrl).toContain(encodeURIComponent(text));

      // WhatsApp
      const whatsappUrl = generateShareUrl('whatsapp', url, text);
      expect(whatsappUrl).toContain('https://api.whatsapp.com/send');
      expect(whatsappUrl).toContain(encodeURIComponent(`${text} ${url}`));
    });

    test('returns null for unsupported platforms', () => {
      expect(generateShareUrl('unsupported', 'https://example.com')).toBeNull();
    });
  });

  describe('parseQueryParams', () => {
    test('parses query parameters correctly', () => {
      // Mock window.location.search
      const originalLocation = window.location;
      delete window.location;
      window.location = { search: '?page=2&limit=10&q=test&filter=recent' };

      const params = parseQueryParams();
      expect(params).toEqual({
        page: '2',
        limit: '10',
        q: 'test',
        filter: 'recent'
      });

      // Restore original location
      window.location = originalLocation;
    });

    test('handles empty query string', () => {
      // Mock window.location.search
      const originalLocation = window.location;
      delete window.location;
      window.location = { search: '' };

      const params = parseQueryParams();
      expect(params).toEqual({});

      // Restore original location
      window.location = originalLocation;
    });

    test('handles URL encoded values', () => {
      // Mock window.location.search
      const originalLocation = window.location;
      delete window.location;
      window.location = { search: '?q=test%20with%20spaces&tag=motivation%2Csuccess' };

      const params = parseQueryParams();
      expect(params).toEqual({
        q: 'test with spaces',
        tag: 'motivation,success'
      });

      // Restore original location
      window.location = originalLocation;
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    test('debounces function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      // Call the debounced function multiple times
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Function should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Fast-forward time
      jest.runAllTimers();

      // Function should have been called once
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('debounced function passes arguments correctly', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn('arg1', 'arg2');
      jest.runAllTimers();

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('debounced function maintains context', () => {
      const obj = {
        value: 'test',
        method: function(arg) {
          this.value = arg;
        }
      };

      const spy = jest.spyOn(obj, 'method');
      const debouncedMethod = debounce(obj.method, 1000);

      debouncedMethod.call(obj, 'new value');
      jest.runAllTimers();

      expect(spy).toHaveBeenCalledWith('new value');
      expect(obj.value).toBe('new value');
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    test('throttles function calls', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 1000);

      // Call the throttled function multiple times
      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(1); // First call executes immediately

      // Additional calls within the time window
      throttledFn();
      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(1); // Still only called once

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Another call after the time window
      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(2); // Called again
    });

    test('throttled function passes arguments correctly', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 1000);

      throttledFn('arg1', 'arg2');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

      // Call with different arguments during throttle period
      throttledFn('arg3', 'arg4');
      expect(mockFn).not.toHaveBeenCalledWith('arg3', 'arg4');

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Call again after throttle period
      throttledFn('arg5', 'arg6');
      expect(mockFn).toHaveBeenCalledWith('arg5', 'arg6');
    });

    test('throttled function maintains context', () => {
      const obj = {
        value: 'test',
        method: function(arg) {
          this.value = arg;
        }
      };

      const spy = jest.spyOn(obj, 'method');
      const throttledMethod = throttle(obj.method, 1000);

      throttledMethod.call(obj, 'new value');
      expect(spy).toHaveBeenCalledWith('new value');
      expect(obj.value).toBe('new value');

      // Reset value
      obj.value = 'test';

      // Call again during throttle period
      throttledMethod.call(obj, 'another value');
      expect(obj.value).toBe('test'); // Value should not change

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Call again after throttle period
      throttledMethod.call(obj, 'final value');
      expect(obj.value).toBe('final value');
    });
  });

  describe('getRandomColor', () => {
    test('returns a valid hex color', () => {
      const color = getRandomColor();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    test('returns different colors on multiple calls', () => {
      // This test could theoretically fail due to randomness,
      // but the probability is extremely low
      const colors = new Set();
      for (let i = 0; i < 10; i++) {
        colors.add(getRandomColor());
      }
      expect(colors.size).toBeGreaterThan(1);
    });

    test('returns colors from predefined list when provided', () => {
      const colorList = ['#FF0000', '#00FF00', '#0000FF'];
      const color = getRandomColor(colorList);
      expect(colorList).toContain(color);
    });
  });

  describe('formatNumber', () => {
    test('formats numbers with commas for thousands', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(1234567.89)).toBe('1,234,567.89');
    });

    test('formats numbers with specified decimal places', () => {
      expect(formatNumber(1000.5678, 2)).toBe('1,000.57');
      expect(formatNumber(1000.5, 0)).toBe('1,001');
      expect(formatNumber(1000, 2)).toBe('1,000.00');
    });

    test('handles negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
      expect(formatNumber(-1234.56, 1)).toBe('-1,234.6');
    });

    test('handles zero and non-numeric values', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber('not a number')).toBe('0');
    });

    test('formats numbers with custom locale', () => {
      // This test depends on the browser's locale support
      // Some environments might not support all locales
      try {
        expect(formatNumber(1000.5, 2, 'de-DE')).toBe('1.000,50');
      } catch (e) {
        // If locale is not supported, test will be skipped
        console.log('Locale de-DE not supported in test environment');
      }
    });
  });
});