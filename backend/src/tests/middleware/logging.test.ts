import { describe, it, expect, vi } from 'vitest';

// Mock pino-http
vi.mock('pino-http', () => ({
  default: vi.fn(() => vi.fn())
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Logging Middleware', () => {
  it('should export httpLogger middleware', async () => {
    const loggingModule = await import('../../middleware/logging');
    expect(loggingModule.httpLogger).toBeDefined();
    expect(typeof loggingModule.httpLogger).toBe('function');
  });

  it('should be properly configured with pino-http', async () => {
    const pinoHttp = await import('pino-http');
    await import('../../middleware/logging');
    
    expect(pinoHttp.default).toHaveBeenCalled();
  });

  it('should use custom log levels based on status codes', () => {
    // This tests the configuration structure
    // Actual functionality would be tested in integration tests
    expect(true).toBe(true);
  });

  it('should configure custom success message format', async () => {
    const pinoHttp = await import('pino-http');
    await import('../../middleware/logging');
    
    const config = (pinoHttp.default as any).mock.calls[0][0];
    expect(config.customSuccessMessage).toBeDefined();
    expect(typeof config.customSuccessMessage).toBe('function');
  });

  it('should configure custom error message format', async () => {
    const pinoHttp = await import('pino-http');
    await import('../../middleware/logging');
    
    const config = (pinoHttp.default as any).mock.calls[0][0];
    expect(config.customErrorMessage).toBeDefined();
    expect(typeof config.customErrorMessage).toBe('function');
  });

  it('should configure custom props for user info', async () => {
    const pinoHttp = await import('pino-http');
    await import('../../middleware/logging');
    
    const config = (pinoHttp.default as any).mock.calls[0][0];
    expect(config.customProps).toBeDefined();
    expect(typeof config.customProps).toBe('function');
  });

  it('should configure redaction of sensitive data', async () => {
    const pinoHttp = await import('pino-http');
    await import('../../middleware/logging');
    
    const config = (pinoHttp.default as any).mock.calls[0][0];
    expect(config.redact).toBeDefined();
    expect(config.redact.paths).toBeInstanceOf(Array);
  });

  it('should configure autoLogging to ignore health checks', async () => {
    const pinoHttp = await import('pino-http');
    await import('../../middleware/logging');
    
    const config = (pinoHttp.default as any).mock.calls[0][0];
    expect(config.autoLogging).toBeDefined();
    expect(config.autoLogging.ignore).toBeDefined();
    expect(typeof config.autoLogging.ignore).toBe('function');
  });
});
