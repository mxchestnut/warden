import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchGoogle } from '../../services/webSearch';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock logger
vi.mock('../../utils/logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logDebug: vi.fn()
}));

describe('WebSearch Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchGoogle', () => {
    it('should return search result when successful', async () => {
      const mockHtml = `
        <div class="g">
          <h3>Test Title</h3>
          <div class="VwiC3b">This is a test snippet with enough content to be valid.</div>
          <a href="https://example.com">Link</a>
        </div>
      `;

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: mockHtml
      });

      const result = await searchGoogle('test query');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('snippet');
      expect(result).toHaveProperty('url');
    });

    it('should return null when no results found', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: '<html><body>No results</body></html>'
      });

      const result = await searchGoogle('test query');

      expect(result).toBeNull();
    });

    it('should return null when snippet is too short', async () => {
      const mockHtml = `
        <div class="g">
          <h3>Test Title</h3>
          <div class="VwiC3b">Short</div>
          <a href="https://example.com">Link</a>
        </div>
      `;

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: mockHtml
      });

      const result = await searchGoogle('test query');

      expect(result).toBeNull();
    });

    it('should throw error when request fails', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(searchGoogle('test query')).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      
      vi.mocked(axios.get).mockRejectedValueOnce(timeoutError);

      await expect(searchGoogle('test query')).rejects.toThrow('Timeout');
    });

    it('should encode query properly', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: '<html><body></body></html>'
      });

      await searchGoogle('test query with spaces');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('test%20query%20with%20spaces'),
        expect.any(Object)
      );
    });

    it('should use proper user agent', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: '<html><body></body></html>'
      });

      await searchGoogle('test');

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla')
          })
        })
      );
    });
  });
});
