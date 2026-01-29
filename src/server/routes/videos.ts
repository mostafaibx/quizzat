import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { HonoEnv } from '@/types/cloudflare';
import { ApiErrors } from '../middleware/error';
import { authMiddleware, requireTeacher, getAuthenticatedUser } from '../middleware/auth';
import { createR2Config, putObject } from '@/lib/r2-storage';
import { createPubSubConfig, verifyWebhookSignature, parseWebhookPayload } from '@/lib/pubsub';
import { processWebhook as processEncodingWebhook } from '../services/encoding-job.service';
import {
  createUploadSchema,
  updateVideoSchema,
  listVideosQuerySchema,
  confirmUploadSchema,
} from '@/types/video.types';
import {
  findVideoById,
  listVideos,
  createVideoUpload,
  confirmUpload,
  updateVideo,
  deleteVideo,
  canAccessVideo,
  canModifyVideo,
  attachPlayback,
  getEncodingStatus,
  type ServiceDeps,
  type ServiceDepsWithR2,
  type ServiceDepsWithEncoding,
} from '../services/video.service';

const videosRoutes = new Hono<HonoEnv>();

// ============================================================================
// Helpers
// ============================================================================

function getDeps(env: HonoEnv['Bindings']): ServiceDeps {
  return { db: drizzle(env.DB) };
}

function getDepsWithR2(env: HonoEnv['Bindings']): ServiceDepsWithR2 {
  return {
    db: drizzle(env.DB),
    r2Config: createR2Config(env),
  };
}

function getDepsWithEncoding(env: HonoEnv['Bindings']): ServiceDepsWithEncoding {
  const pubsubConfig = createPubSubConfig(env);
  if (!pubsubConfig) {
    throw ApiErrors.internal('GCP Pub/Sub is not configured');
  }

  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/encoding/webhook`;
  const webhookSecret = env.ENCODING_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw ApiErrors.internal('Encoding webhook secret is not configured');
  }

  const r2BucketName = env.R2_BUCKET_NAME;
  if (!r2BucketName) {
    throw ApiErrors.internal('R2 bucket name is not configured');
  }

  return {
    db: drizzle(env.DB),
    r2Config: createR2Config(env),
    pubsubConfig,
    webhookUrl,
    webhookSecret,
    r2BucketName,
  };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /videos/upload-url
 * Generate a presigned URL for uploading videos to R2.
 * Requires teacher or admin role.
 */
videosRoutes.post('/videos/upload-url', requireTeacher, async (c) => {
  const user = getAuthenticatedUser(c);
  const body = await c.req.json();
  const input = createUploadSchema.parse(body);

  const result = await createVideoUpload(getDepsWithR2(c.env), input, user.id);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * PUT /videos/:id/upload
 * Direct upload endpoint - proxies the upload to R2.
 * This is used when presigned URLs aren't available.
 */
videosRoutes.put('/videos/:id/upload', requireTeacher, async (c) => {
  const user = getAuthenticatedUser(c);
  const videoId = c.req.param('id');

  const video = await findVideoById(getDeps(c.env), videoId);

  if (!video) {
    throw ApiErrors.notFound('Video', videoId);
  }

  if (!canModifyVideo(video, user)) {
    throw ApiErrors.forbidden('You do not have permission to upload to this video');
  }

  if (video.status !== 'uploading') {
    throw ApiErrors.badRequest('Video is not in uploading state');
  }

  if (!video.r2RawPath) {
    throw ApiErrors.badRequest('Video has no upload path configured');
  }

  // Get the request body as a stream
  const body = c.req.raw.body;
  if (!body) {
    throw ApiErrors.badRequest('No file provided');
  }

  const contentType = c.req.header('Content-Type') || video.mimeType || 'video/mp4';

  // Upload to R2
  const r2Config = createR2Config(c.env);
  await putObject(r2Config, video.r2RawPath, body, {
    httpMetadata: {
      contentType,
    },
    customMetadata: {
      videoId,
      userId: user.id,
    },
  });

  return c.json({
    success: true,
    data: {
      videoId,
      uploaded: true,
    },
  });
});

/**
 * POST /videos/:id/upload-complete
 * Confirms upload completion and triggers encoding.
 */
videosRoutes.post('/videos/:id/upload-complete', requireTeacher, async (c) => {
  const user = getAuthenticatedUser(c);
  const videoId = c.req.param('id');
  const body = await c.req.json();
  const input = confirmUploadSchema.parse(body);

  const video = await findVideoById(getDeps(c.env), videoId);

  if (!video) {
    throw ApiErrors.notFound('Video', videoId);
  }

  if (!canModifyVideo(video, user)) {
    throw ApiErrors.forbidden('You do not have permission to modify this video');
  }

  const result = await confirmUpload(getDepsWithEncoding(c.env), videoId, input);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /videos
 * List videos. Returns only user's videos unless admin.
 */
videosRoutes.get('/videos', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const query = listVideosQuerySchema.parse({
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
    visibility: c.req.query('visibility'),
    status: c.req.query('status'),
  });

  const result = await listVideos(getDeps(c.env), query, user);

  return c.json({
    success: true,
    data: {
      videos: result.videos,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: result.hasMore,
      },
    },
  });
});

/**
 * GET /videos/:id
 * Get video details including playback URLs.
 */
videosRoutes.get('/videos/:id', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const videoId = c.req.param('id');

  const video = await findVideoById(getDeps(c.env), videoId);

  if (!video) {
    throw ApiErrors.notFound('Video', videoId);
  }

  if (!canAccessVideo(video, user)) {
    throw ApiErrors.forbidden('You do not have access to this video');
  }

  const videoWithPlayback = await attachPlayback(getDepsWithR2(c.env), video);

  return c.json({
    success: true,
    data: {
      video: videoWithPlayback,
    },
  });
});

/**
 * GET /videos/:id/encoding-status
 * Get detailed encoding status including per-quality progress.
 */
videosRoutes.get('/videos/:id/encoding-status', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const videoId = c.req.param('id');

  const video = await findVideoById(getDeps(c.env), videoId);

  if (!video) {
    throw ApiErrors.notFound('Video', videoId);
  }

  if (!canAccessVideo(video, user)) {
    throw ApiErrors.forbidden('You do not have access to this video');
  }

  const status = await getEncodingStatus(getDepsWithR2(c.env), videoId);

  return c.json({
    success: true,
    data: status,
  });
});

/**
 * PATCH /videos/:id
 * Update video metadata. Only owner or admin.
 */
videosRoutes.patch('/videos/:id', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const videoId = c.req.param('id');
  const body = await c.req.json();
  const input = updateVideoSchema.parse(body);

  const video = await findVideoById(getDeps(c.env), videoId);

  if (!video) {
    throw ApiErrors.notFound('Video', videoId);
  }

  if (!canModifyVideo(video, user)) {
    throw ApiErrors.forbidden('You do not have permission to update this video');
  }

  const updatedVideo = await updateVideo(getDeps(c.env), videoId, input);

  return c.json({
    success: true,
    data: {
      video: updatedVideo,
    },
  });
});

/**
 * DELETE /videos/:id
 * Delete a video. Only owner or admin.
 */
videosRoutes.delete('/videos/:id', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const videoId = c.req.param('id');

  const video = await findVideoById(getDeps(c.env), videoId);

  if (!video) {
    throw ApiErrors.notFound('Video', videoId);
  }

  if (!canModifyVideo(video, user)) {
    throw ApiErrors.forbidden('You do not have permission to delete this video');
  }

  await deleteVideo(getDepsWithR2(c.env), video);

  return c.json({
    success: true,
    data: {
      deleted: true,
      videoId,
    },
  });
});

export default videosRoutes;
