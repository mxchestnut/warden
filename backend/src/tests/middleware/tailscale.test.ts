import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireTailscale } from '../../middleware/tailscale';

describe('Tailscale Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      ip: '',
      socket: { remoteAddress: '' } as any,
    };
    
    mockRes = {
      status: statusMock as any,
      json: jsonMock as any,
    };
    
    nextFn = vi.fn();
  });

  describe('Localhost Access', () => {
    it('should allow IPv4 localhost', () => {
      Object.defineProperty(mockReq, 'ip', { value: '127.0.0.1', writable: true });
      
      requireTailscale(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow IPv6 localhost', () => {
      Object.defineProperty(mockReq, 'ip', { value: '::1', writable: true });
      
      requireTailscale(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow IPv6-mapped IPv4 localhost', () => {
      Object.defineProperty(mockReq, 'ip', { value: '::ffff:127.0.0.1', writable: true });
      
      requireTailscale(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Tailscale IP Range', () => {
    it('should allow Tailscale IPv4 addresses (100.x.x.x)', () => {
      Object.defineProperty(mockReq, 'ip', { value: '100.64.1.5', writable: true });
      
      requireTailscale(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow IPv6-mapped Tailscale addresses', () => {
      Object.defineProperty(mockReq, 'ip', { value: '::ffff:100.64.1.5', writable: true });
      
      requireTailscale(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow any 100.x.x.x address', () => {
      const tailscaleIPs = ['100.64.0.1', '100.100.100.100', '100.127.255.254'];
      
      tailscaleIPs.forEach(ip => {
        Object.defineProperty(mockReq, 'ip', { value: ip, writable: true });
        nextFn = vi.fn();
        
        requireTailscale(mockReq as Request, mockRes as Response, nextFn);
        
        expect(nextFn).toHaveBeenCalled();
      });
    });
  });

  describe('Access Denied', () => {
    it('should deny access from public IP', () => {
      Object.defineProperty(mockReq, 'ip', { value: '8.8.8.8', writable: true });
      
      requireTailscale(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. Admin panel requires Tailscale connection.'
      });
    });

    it('should deny access from private network IP', () => {
      Object.defineProperty(mockReq, 'ip', { value: '192.168.1.1', writable: true });
      
      requireTailscale(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should deny access from other private ranges', () => {
      const deniedIPs = ['10.0.0.1', '172.16.0.1', '192.168.0.1'];
      
      deniedIPs.forEach(ip => {
        Object.defineProperty(mockReq, 'ip', { value: ip, writable: true });
        statusMock = vi.fn(() => ({ json: jsonMock }));
        mockRes.status = statusMock as any;
        nextFn = vi.fn();
        
        requireTailscale(mockReq as Request, mockRes as Response, nextFn);
        
        expect(nextFn).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(403);
      });
    });

    it('should handle missing IP gracefully', () => {
      Object.defineProperty(mockReq, 'ip', { value: undefined, writable: true });
      mockReq.socket = { remoteAddress: undefined } as any;
      
      requireTailscale(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('IP Fallback', () => {
    it('should use socket.remoteAddress if req.ip is empty', () => {
      Object.defineProperty(mockReq, 'ip', { value: '', writable: true });
      mockReq.socket = { remoteAddress: '100.64.1.5' } as any;
      
      requireTailscale(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).toHaveBeenCalled();
    });

    it('should deny if socket.remoteAddress is not Tailscale', () => {
      Object.defineProperty(mockReq, 'ip', { value: '', writable: true });
      mockReq.socket = { remoteAddress: '8.8.8.8' } as any;
      
      requireTailscale(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});
