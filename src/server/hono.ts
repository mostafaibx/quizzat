import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { NextRequest } from 'next/server';
import { errorHandler, ApiErrors } from './middleware/error';
import type { HonoEnv } from '@/types/cloudflare';
import videosRoutes from './routes/videos';
import modulesRoutes from './routes/modules';
import enrollmentsRoutes from './routes/enrollments';
import encodingRoutes from './routes/encoding';

const app = new Hono<HonoEnv>().basePath('/api')

// Request ID middleware - should be first
app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);
  await next();
});

// Global middleware
app.use('*', logger());

// CORS configuration
app.use('/api/*', cors({
  origin: (origin) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Mount routes and capture for type inference
const routes = app
  .route('/', videosRoutes)
  .route('/', modulesRoutes)
  .route('/', enrollmentsRoutes)
  .route('/', encodingRoutes);

// 404 handler
app.notFound(() => {
  throw ApiErrors.notFound('Endpoint');
});

// Global error handler
app.onError(errorHandler);

export default app;

// Export AppType for RPC client type inference
export type AppType = typeof routes;

// Export error utilities for use in routes
export { ApiErrors } from './middleware/error';

// Custom Next.js API route handler for Hono
export async function honoHandler(req: NextRequest) {
  // Get Cloudflare context for bindings
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const cfContext = await getCloudflareContext();

  // Pass the request with Cloudflare bindings
  return app.fetch(req, cfContext?.env);
}
