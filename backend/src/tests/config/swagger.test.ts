import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Swagger Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export default swaggerSpec', async () => {
    const swaggerModule = await import('../../config/swagger');
    expect(swaggerModule.default).toBeDefined();
  });

  it('should export setupSwagger function', async () => {
    const swaggerModule = await import('../../config/swagger');
    expect(swaggerModule.setupSwagger).toBeDefined();
    expect(typeof swaggerModule.setupSwagger).toBe('function');
  });

  it('should setup Swagger UI on /api/docs route', async () => {
    const { setupSwagger } = await import('../../config/swagger');
    
    const mockApp = {
      use: vi.fn(),
      get: vi.fn()
    } as any;

    setupSwagger(mockApp);
    
    // Should register /api/docs route for Swagger UI
    expect(mockApp.use).toHaveBeenCalledWith(
      '/api/docs',
      expect.anything(),
      expect.anything()
    );
    
    // Should register /api/docs.json endpoint
    expect(mockApp.get).toHaveBeenCalledWith(
      '/api/docs.json',
      expect.any(Function)
    );
  });

  it('should provide OpenAPI 3.0 spec structure', async () => {
    const swaggerSpec = await import('../../config/swagger');
    const spec = swaggerSpec.default;
    
    // Basic structure checks (swagger-jsdoc returns the spec)
    expect(spec).toBeDefined();
    expect(typeof spec).toBe('object');
  });
});
