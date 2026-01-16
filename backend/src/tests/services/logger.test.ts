import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import logger, { logInfo, logError, logWarn, logDebug, createLogger } from '../../utils/logger';

describe('Logger', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Logger instance', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should have correct base properties', () => {
      expect(logger.bindings()).toHaveProperty('app', 'warden-backend');
    });
  });

  describe('logInfo', () => {
    it('should log info message without data', () => {
      expect(() => logInfo('Test info message')).not.toThrow();
    });

    it('should log info message with data', () => {
      expect(() => logInfo('Test info message', { userId: 123 })).not.toThrow();
    });
  });

  describe('logError', () => {
    it('should log error with Error object', () => {
      const error = new Error('Test error');
      expect(() => logError('Test error message', error)).not.toThrow();
    });

    it('should log error with data context', () => {
      const error = new Error('Test error');
      expect(() => logError('Test error message', error, { userId: 123 })).not.toThrow();
    });

    it('should log error without Error object', () => {
      expect(() => logError('Test error message')).not.toThrow();
    });

    it('should handle non-Error objects', () => {
      expect(() => logError('Test error message', 'string error')).not.toThrow();
      expect(() => logError('Test error message', { custom: 'error' })).not.toThrow();
    });
  });

  describe('logWarn', () => {
    it('should log warning message without data', () => {
      expect(() => logWarn('Test warning')).not.toThrow();
    });

    it('should log warning message with data', () => {
      expect(() => logWarn('Test warning', { code: 'WARN_001' })).not.toThrow();
    });
  });

  describe('logDebug', () => {
    it('should log debug message without data', () => {
      expect(() => logDebug('Test debug')).not.toThrow();
    });

    it('should log debug message with data', () => {
      expect(() => logDebug('Test debug', { step: 1 })).not.toThrow();
    });
  });

  describe('createLogger', () => {
    it('should create child logger with context', () => {
      const childLogger = createLogger('test-context');
      
      expect(childLogger).toBeDefined();
      expect(childLogger.bindings()).toHaveProperty('context', 'test-context');
    });

    it('should create multiple independent child loggers', () => {
      const logger1 = createLogger('context-1');
      const logger2 = createLogger('context-2');
      
      expect(logger1.bindings().context).toBe('context-1');
      expect(logger2.bindings().context).toBe('context-2');
    });
  });

  describe('Log levels in different environments', () => {
    it('should be disabled in test environment', () => {
      process.env.NODE_ENV = 'test';
      // Logger should not output in test environment
      // Just verify it doesn't throw
      expect(() => logInfo('Test in test env')).not.toThrow();
    });
  });

  describe('Sensitive data redaction', () => {
    it('should not throw when logging sensitive data fields', () => {
      // These fields should be automatically redacted by Pino
      const sensitiveData = {
        password: 'secret123',
        token: 'abc-def-ghi',
        apiKey: 'key-123-456',
        username: 'testuser' // This should NOT be redacted
      };

      expect(() => logInfo('Test with sensitive data', sensitiveData)).not.toThrow();
    });
  });
});
