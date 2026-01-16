import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askGemini, summarizeSession, learnFromUrl } from '../../services/gemini';

// Mock axios
vi.mock('axios', () => {
  return {
    default: {
      get: vi.fn()
    }
  };
});

// Mock cheerio
vi.mock('cheerio', () => {
  return {
    load: vi.fn()
  };
});

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => 'Mocked Gemini response'
    }
  });

  const mockGetGenerativeModel = vi.fn().mockReturnValue({
    generateContent: mockGenerateContent
  });

  class MockGoogleGenerativeAI {
    getGenerativeModel = mockGetGenerativeModel;
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
    },
    HarmBlockThreshold: {
      BLOCK_NONE: 'BLOCK_NONE'
    }
  };
});

// Mock logger to prevent console output during tests
vi.mock('../../utils/logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logDebug: vi.fn()
}));

describe('Gemini Service', () => {
  beforeEach(() => {
    // Set API key for tests
    process.env.GEMINI_API_KEY = 'test-api-key';
    vi.clearAllMocks();
  });

  describe('askGemini', () => {
    it('should return a response for a simple question', async () => {
      const result = await askGemini('What is a wizard?');
      
      expect(result).toBe('Mocked Gemini response');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle questions with context', async () => {
      const question = 'How does this spell work?';
      const context = 'Fireball is a 3rd level evocation spell';
      
      const result = await askGemini(question, context);
      
      expect(result).toBe('Mocked Gemini response');
      expect(typeof result).toBe('string');
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      
      await expect(askGemini('test question')).rejects.toThrow('Gemini API key not configured');
    });

    it('should handle empty questions gracefully', async () => {
      const result = await askGemini('');
      
      expect(result).toBe('Mocked Gemini response');
    });
  });

  describe('summarizeSession', () => {
    it('should summarize a session with multiple messages', async () => {
      const messages = [
        'The party entered the dungeon',
        'They fought a dragon',
        'They found treasure'
      ];
      
      const result = await summarizeSession(messages);
      
      expect(result).toBe('Mocked Gemini response');
      expect(typeof result).toBe('string');
    });

    it('should handle empty message array', async () => {
      const result = await summarizeSession([]);
      
      expect(result).toBe('Mocked Gemini response');
    });

    it('should handle single message', async () => {
      const result = await summarizeSession(['Single event happened']);
      
      expect(result).toBe('Mocked Gemini response');
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      
      await expect(summarizeSession(['test'])).rejects.toThrow('Gemini API key not configured');
    });
  });
});

