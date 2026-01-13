import pinoHttp from 'pino-http';
import logger from '../utils/logger';
import { Request, Response } from 'express';

/**
 * HTTP Request Logging Middleware using Pino-HTTP
 * 
 * Logs all HTTP requests with:
 * - Request method, URL, headers
 * - Response status, time
 * - User information (if authenticated)
 */

export const httpLogger = pinoHttp({
  logger,
  
  // Custom log level based on response status
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    if (res.statusCode >= 300) {
      return 'info';
    }
    return 'debug';
  },
  
  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },
  
  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  },
  
  // Add custom attributes to logs
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration',
  },
  
  // Add user information to logs if available
  customProps: (req: Request) => {
    const user = (req as any).user;
    return user ? {
      userId: user.id,
      username: user.username,
    } : {};
  },
  
  // Redact sensitive headers
  redact: {
    paths: [
      'request.headers.authorization',
      'request.headers.cookie',
      'response.headers["set-cookie"]',
    ],
    remove: true,
  },
  
  // Don't log health check endpoints (reduces noise)
  autoLogging: {
    ignore: (req) => {
      const ignoredPaths = ['/health', '/ping', '/metrics'];
      return ignoredPaths.includes(req.url || '');
    },
  },
});
