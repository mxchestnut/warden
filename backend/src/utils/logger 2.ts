import pino from 'pino';

/**
 * Pino Logger Configuration
 * 
 * Production: JSON structured logs for easy parsing by log aggregators
 * Development: Pretty-printed human-readable logs
 */

// Import after env is validated
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Pretty print in development for readability
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: false,
    },
  } : undefined,
  
  // Disable logging in test environment
  enabled: !isTest,
  
  // Base configuration
  base: {
    env: process.env.NODE_ENV,
    app: 'warden-backend',
  },
  
  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
  
  // Redact sensitive information from logs
  redact: {
    paths: [
      'password',
      'req.headers.authorization',
      'req.headers.cookie',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
    ],
    remove: true,
  },
  
  // Serializers for common objects
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

export default logger;

// Convenience functions for different log levels
export const logInfo = (message: string, data?: object) => {
  logger.info(data, message);
};

export const logError = (message: string, error?: Error | unknown, data?: object) => {
  if (error instanceof Error) {
    logger.error({ ...data, err: error }, message);
  } else {
    logger.error({ ...data, error }, message);
  }
};

export const logWarn = (message: string, data?: object) => {
  logger.warn(data, message);
};

export const logDebug = (message: string, data?: object) => {
  logger.debug(data, message);
};

// Child logger for specific contexts
export const createLogger = (context: string) => {
  return logger.child({ context });
};
