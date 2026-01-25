import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import type { HonoEnv } from '@/types/cloudflare';

/**
 * Consistent error response structure
 */
type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    timestamp: string;
  };
  stack?: string;
};

/**
 * Global error handler following Hono best practices
 */
export function errorHandler(err: Error | HTTPException, c: Context<HonoEnv>): Response {
  const requestId = c.get('requestId');
  const timestamp = new Date().toISOString();
  const isDev = c.env?.NODE_ENV !== 'production';

  // Log all errors
  console.error('Request failed', {
    error: err,
    requestId,
    type: err.constructor.name,
    url: c.req.url,
    method: c.req.method,
    ...(err instanceof HTTPException && { status: err.status }),
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.format(),
        requestId,
        timestamp,
      },
    };

    return c.json(response, 400);
  }

  // Handle HTTPException (thrown by routes/middleware)
  if (err instanceof HTTPException) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: (err.cause as string) ?? 'HTTP_EXCEPTION',
        message: err.message,
        requestId,
        timestamp,
      },
      ...(isDev && { stack: err.stack }),
    };

    const existingHeaders = err.res?.headers;
    return c.json(response, {
      status: err.status,
      headers: existingHeaders ? Object.fromEntries(existingHeaders) : undefined,
    });
  }

  // Handle database errors
  if (err.message?.includes('UNIQUE constraint failed')) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Resource already exists',
        requestId,
        timestamp,
      },
    };

    return c.json(response, 409);
  }

  if (err.message?.includes('FOREIGN KEY constraint failed')) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'UNPROCESSABLE_ENTITY',
        message: 'Invalid reference to related resource',
        requestId,
        timestamp,
      },
    };

    return c.json(response, 422);
  }

  // Handle D1 database errors
  if (err.message?.includes('D1_')) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        requestId,
        timestamp,
      },
    };

    return c.json(response, 500);
  }

  // Handle R2 storage errors
  if (err.message?.includes('R2') || err.message?.includes('storage')) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'STORAGE_ERROR',
        message: 'Storage operation failed',
        requestId,
        timestamp,
      },
    };

    return c.json(response, 500);
  }

  // Default to internal server error
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'An unexpected error occurred',
      requestId,
      timestamp,
    },
    ...(isDev && { stack: err.stack }),
  };

  return c.json(response, 500);
}

/**
 * Helper to create HTTPException with consistent structure
 */
export function createHttpException(
  status: ContentfulStatusCode,
  code: string,
  message: string,
): HTTPException {
  return new HTTPException(status, {
    message,
    cause: code,
  });
}

/**
 * Common error factories following Hono patterns
 */
export const ApiErrors = {
  badRequest: (message = 'Bad request') =>
    createHttpException(400, 'BAD_REQUEST', message),

  unauthorized: (message = 'Authentication required') =>
    createHttpException(401, 'UNAUTHORIZED', message),

  forbidden: (message = 'Insufficient permissions') =>
    createHttpException(403, 'FORBIDDEN', message),

  notFound: (resource: string, id?: string) =>
    createHttpException(
      404,
      'NOT_FOUND',
      id ? `${resource} with ID '${id}' not found` : `${resource} not found`,
    ),

  conflict: (message: string) =>
    createHttpException(409, 'CONFLICT', message),

  unprocessable: (message: string) =>
    createHttpException(422, 'UNPROCESSABLE_ENTITY', message),

  tooManyRequests: (retryAfter?: number) => {
    if (retryAfter) {
      return new HTTPException(429, {
        message: 'Too many requests',
        cause: 'TOO_MANY_REQUESTS',
        res: new Response(null, {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }),
      });
    }
    return createHttpException(429, 'TOO_MANY_REQUESTS', 'Too many requests');
  },

  internal: (message = 'Internal server error') =>
    createHttpException(500, 'INTERNAL_ERROR', message),

  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    createHttpException(503, 'SERVICE_UNAVAILABLE', message),
};
