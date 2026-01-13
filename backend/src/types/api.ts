/**
 * Common API and middleware types
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Extended Express Request with user session
 */
export interface AuthRequest extends Partial<Request> {
  user?: {
    id: number;
    username: string;
    email: string;
  };
  sessionID?: string;
}

/**
 * API Response envelope
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Error response with details
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

/**
 * Pagination query
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Session configuration
 */
export interface SessionConfig {
  secret: string;
  resave: boolean;
  saveUninitialized: boolean;
  cookie?: {
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    sameSite?: boolean | 'strict' | 'lax' | 'none';
  };
}

/**
 * Redis client type for typing redis connection
 */
export interface RedisClient {
  on(event: string, listener: (...args: any[]) => void): void;
  connect?(): Promise<void>;
  ping?(): Promise<string>;
  quit?(): Promise<void>;
  [key: string]: any;
}

/**
 * Route handler type
 */
export type RouteHandler = (
  req: AuthRequest,
  res: Response,
  next?: NextFunction
) => Promise<void> | void;

/**
 * Error handler type
 */
export type ErrorHandler = (
  err: Error,
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => void;
