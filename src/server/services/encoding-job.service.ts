/**
 * Encoding Job Service
 *
 * Manages encoding jobs for video processing.
 * Handles job creation, status updates, webhook processing, and retries.
 */

import { eq, and, inArray, desc } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { videos, videoVariants, encodingJobs } from '@/db/schema';
import type { Video, VideoVariant, EncodingJob } from '@/db/schema';
import {
  type VideoQuality,
  type EncodingJobStatus,
  type QualityStatus,
  type WebhookPayload,
  type EncodingJobMessage,
  type QualityConfig,
  R2_PATHS,
  DEFAULT_QUALITY_CONFIGS,
  VIDEO_QUALITY,
} from '@/types/encoding.types';
import { publishEncodingJob, type PubSubConfig } from '@/lib/pubsub';
import { processVideoTranscription } from './transcription.service';

// ============================================================================
// Types
// ============================================================================

export interface EncodingServiceDeps {
  db: DrizzleD1Database;
  // Optional: for auto-triggering transcription on audio.extracted
  r2Bucket?: R2Bucket;
  geminiApiKey?: string;
  // Optional: for RAG indexing after transcription
  vectorize?: VectorizeIndex;
}

export interface EncodingServiceDepsWithPubSub extends EncodingServiceDeps {
  pubsubConfig: PubSubConfig;
  webhookUrl: string;
  webhookSecret: string;
  r2BucketName: string;
}

export interface CreateEncodingJobsResult {
  jobId: string;
  variantIds: string[];
  messageId?: string;
}

// ============================================================================
// ID Generation
// ============================================================================

export function generateJobId(): string {
  return `job_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function generateVariantId(): string {
  return `var_${crypto.randomUUID().replace(/-/g, '')}`;
}

// ============================================================================
// Job Creation
// ============================================================================

/**
 * Determines which quality levels to encode based on source video dimensions.
 * Skips qualities higher than the source.
 */
export function determineQualities(
  sourceWidth: number,
  sourceHeight: number
): QualityConfig[] {
  const configs: QualityConfig[] = [];

  for (const config of DEFAULT_QUALITY_CONFIGS) {
    // Skip if source is smaller than target
    if (sourceWidth < config.width && sourceHeight < config.height) {
      continue;
    }
    configs.push(config);
  }

  // Always include at least one quality (the lowest)
  if (configs.length === 0) {
    configs.push(DEFAULT_QUALITY_CONFIGS[DEFAULT_QUALITY_CONFIGS.length - 1]);
  }

  return configs;
}

export interface EncodingOptions {
  /** User-selected qualities to encode */
  qualities?: VideoQuality[];
  /** Enable AI features (audio extraction for STT) */
  useAI?: boolean;
}

/**
 * Creates encoding jobs and video variants for a video.
 * Publishes the encoding job message to GCP Pub/Sub.
 */
export async function createEncodingJobs(
  deps: EncodingServiceDepsWithPubSub,
  video: Video,
  sourceWidth?: number,
  sourceHeight?: number,
  options?: EncodingOptions
): Promise<CreateEncodingJobsResult> {
  const jobId = generateJobId();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const useAI = options?.useAI ?? true; // Default to true

  // Determine which qualities to encode based on source dimensions
  let qualities = determineQualities(
    sourceWidth ?? 1920,
    sourceHeight ?? 1080
  );

  // Filter by user-selected qualities if provided
  if (options?.qualities && options.qualities.length > 0) {
    qualities = qualities.filter((q) => options.qualities!.includes(q.quality));
    // Ensure at least one quality is selected
    if (qualities.length === 0) {
      qualities = [determineQualities(sourceWidth ?? 1920, sourceHeight ?? 1080).pop()!];
    }
  }

  // Create video variants
  const variantIds: string[] = [];
  const allQualities = VIDEO_QUALITY as readonly VideoQuality[];

  for (const quality of allQualities) {
    const variantId = generateVariantId();
    variantIds.push(variantId);

    const isIncluded = qualities.some((q) => q.quality === quality);
    const config = qualities.find((q) => q.quality === quality);

    await deps.db.insert(videoVariants).values({
      id: variantId,
      videoId: video.id,
      quality,
      width: config?.width,
      height: config?.height,
      bitrate: config?.bitrate,
      r2Path: R2_PATHS.encoded(video.id, quality),
      status: isIncluded ? 'pending' : 'skipped',
      createdAt: now,
    });
  }

  // Create encoding job record
  await deps.db.insert(encodingJobs).values({
    id: jobId,
    videoId: video.id,
    jobType: 'encode',
    status: 'pending',
    progress: 0,
    attemptNumber: 1,
    maxAttempts: 3,
    createdAt: now,
    updatedAt: now,
  });

  // Create thumbnail job record
  const thumbnailJobId = generateJobId();
  await deps.db.insert(encodingJobs).values({
    id: thumbnailJobId,
    videoId: video.id,
    jobType: 'thumbnail',
    status: 'pending',
    progress: 0,
    attemptNumber: 1,
    maxAttempts: 3,
    createdAt: now,
    updatedAt: now,
  });

  // Parse the r2RawPath to get folder path and filename
  const rawPath = video.r2RawPath || '';
  const filename = rawPath.split('/').pop() || 'video.mp4';
  // source.path should be the folder path (without filename), per INTEGRATION.md
  const sourceFolderPath = rawPath.substring(0, rawPath.lastIndexOf('/'));

  // Build the encoding job message
  const message: EncodingJobMessage = {
    jobId,
    videoId: video.id,
    source: {
      bucket: deps.r2BucketName,
      path: sourceFolderPath,
      filename,
    },
    output: {
      bucket: deps.r2BucketName,
      basePath: `videos/encoded/${video.id}`,
    },
    qualities,
    thumbnail: {
      enabled: true,
      timestampPercent: 25, // Capture thumbnail at 25% of video
      path: R2_PATHS.thumbnail(video.id),
    },
    audioForStt: {
      enabled: useAI, // Enable audio extraction for speech-to-text when AI is enabled
    },
    callback: {
      webhookUrl: deps.webhookUrl,
      webhookSecret: deps.webhookSecret,
    },
    metadata: {
      userId: video.userId,
      title: video.title,
      createdAt: video.createdAt,
    },
  };

  // Publish to Pub/Sub
  let messageId: string | undefined;
  try {
    const result = await publishEncodingJob(deps.pubsubConfig, message);
    messageId = result.messageId;

    // Update job status to queued
    await deps.db
      .update(encodingJobs)
      .set({
        status: 'queued',
        externalJobId: messageId,
        queuedAt: now,
        updatedAt: now,
      })
      .where(eq(encodingJobs.id, jobId));
  } catch (error) {
    // Mark job as failed if publish fails
    const errorMessage = error instanceof Error ? error.message : 'Failed to publish job';
    await deps.db
      .update(encodingJobs)
      .set({
        status: 'failed',
        errorMessage,
        updatedAt: now,
      })
      .where(eq(encodingJobs.id, jobId));

    throw error;
  }

  return {
    jobId,
    variantIds,
    messageId,
  };
}

// ============================================================================
// Job Status Updates
// ============================================================================

/**
 * Updates the status of an encoding job.
 */
export async function updateJobStatus(
  deps: EncodingServiceDeps,
  jobId: string,
  status: EncodingJobStatus,
  progress?: number,
  progressMessage?: string
): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: now,
  };

  if (progress !== undefined) {
    updateData.progress = progress;
  }
  if (progressMessage !== undefined) {
    updateData.progressMessage = progressMessage;
  }

  // Set timestamps based on status
  if (status === 'processing') {
    updateData.startedAt = now;
  } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    updateData.completedAt = now;
  }

  await deps.db.update(encodingJobs).set(updateData).where(eq(encodingJobs.id, jobId));
}

/**
 * Updates the status of a video variant.
 */
export async function updateVariantStatus(
  deps: EncodingServiceDeps,
  videoId: string,
  quality: VideoQuality,
  status: QualityStatus,
  metadata?: {
    width?: number;
    height?: number;
    bitrate?: number;
    fileSize?: number;
  }
): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const updateData: Record<string, unknown> = {
    status,
  };

  if (metadata?.width) updateData.width = metadata.width;
  if (metadata?.height) updateData.height = metadata.height;
  if (metadata?.bitrate) updateData.bitrate = metadata.bitrate;
  if (metadata?.fileSize) updateData.fileSize = metadata.fileSize;

  if (status === 'ready') {
    updateData.completedAt = now;
  }

  await deps.db
    .update(videoVariants)
    .set(updateData)
    .where(and(eq(videoVariants.videoId, videoId), eq(videoVariants.quality, quality)));
}

// ============================================================================
// Webhook Processing
// ============================================================================

/**
 * Processes a webhook payload from the encoding service.
 */
export async function processWebhook(
  deps: EncodingServiceDeps,
  payload: WebhookPayload
): Promise<void> {
  const { jobId, videoId, event } = payload;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  switch (event) {
    case 'job.started': {
      // Update job status and video source metadata
      await updateJobStatus(deps, jobId, 'processing');

      await deps.db
        .update(videos)
        .set({
          sourceWidth: payload.data.sourceWidth,
          sourceHeight: payload.data.sourceHeight,
          duration: Math.round(payload.data.duration),
          sourceMetadata: JSON.stringify({
            codec: payload.data.codec,
            bitrate: payload.data.bitrate,
            fps: payload.data.fps,
          }),
          status: 'encoding',
          updatedAt: now,
        })
        .where(eq(videos.id, videoId));
      break;
    }

    case 'job.progress': {
      await updateJobStatus(
        deps,
        jobId,
        'processing',
        payload.data.progress,
        payload.data.message
      );
      break;
    }

    case 'quality.completed': {
      await updateVariantStatus(deps, videoId, payload.data.quality, 'ready', {
        width: payload.data.width,
        height: payload.data.height,
        bitrate: payload.data.bitrate,
        fileSize: payload.data.fileSize,
      });
      break;
    }

    case 'job.completed': {
      await updateJobStatus(deps, jobId, 'completed', 100);

      // Update video status to ready
      await deps.db
        .update(videos)
        .set({
          status: 'ready',
          duration: Math.round(payload.data.duration),
          updatedAt: now,
        })
        .where(eq(videos.id, videoId));
      break;
    }

    case 'job.failed': {
      // Update job with error details
      await deps.db
        .update(encodingJobs)
        .set({
          status: 'failed',
          errorCode: payload.data.errorCode,
          errorMessage: payload.data.errorMessage,
          errorDetails: payload.data.errorDetails,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(encodingJobs.id, jobId));

      // If a specific quality failed, mark it
      if (payload.data.quality) {
        await updateVariantStatus(deps, videoId, payload.data.quality, 'error');
      }

      // Update video status to error
      await deps.db
        .update(videos)
        .set({
          status: 'error',
          lastError: payload.data.errorMessage,
          updatedAt: now,
        })
        .where(eq(videos.id, videoId));
      break;
    }

    case 'thumbnail.generated': {
      // Update thumbnail job and video
      const [thumbnailJob] = await deps.db
        .select()
        .from(encodingJobs)
        .where(and(eq(encodingJobs.videoId, videoId), eq(encodingJobs.jobType, 'thumbnail')))
        .limit(1);

      if (thumbnailJob) {
        await updateJobStatus(deps, thumbnailJob.id, 'completed', 100);
      }

      await deps.db
        .update(videos)
        .set({
          r2ThumbnailPath: payload.data.r2Path,
          updatedAt: now,
        })
        .where(eq(videos.id, videoId));
      break;
    }

    case 'audio.extracted': {
      // STT audio has been extracted - store the path
      await deps.db
        .update(videos)
        .set({
          sttAudioPath: payload.data.outputPath,
          updatedAt: now,
        })
        .where(eq(videos.id, videoId));

      // Auto-trigger transcription if Gemini API key is configured
      if (deps.r2Bucket && deps.geminiApiKey) {
        console.log(`[Encoding] Auto-triggering transcription for video ${videoId}`);
        // Run transcription asynchronously (non-blocking)
        // Pass Vectorize for RAG indexing if available
        processVideoTranscription(
          {
            db: deps.db,
            r2Bucket: deps.r2Bucket,
            geminiApiKey: deps.geminiApiKey,
            vectorize: deps.vectorize,
          },
          videoId
        ).catch((err) => {
          console.error(`[Encoding] Auto-transcription failed for video ${videoId}:`, err);
        });
      } else {
        console.log(`[Encoding] Skipping auto-transcription for video ${videoId} (Gemini API key not configured)`);
      }
      break;
    }
  }
}

// ============================================================================
// Job Queries
// ============================================================================

/**
 * Gets all encoding jobs for a video.
 */
export async function getJobsForVideo(
  deps: EncodingServiceDeps,
  videoId: string
): Promise<EncodingJob[]> {
  return deps.db
    .select()
    .from(encodingJobs)
    .where(eq(encodingJobs.videoId, videoId))
    .orderBy(desc(encodingJobs.createdAt));
}

/**
 * Gets all variants for a video.
 */
export async function getVariantsForVideo(
  deps: EncodingServiceDeps,
  videoId: string
): Promise<VideoVariant[]> {
  return deps.db.select().from(videoVariants).where(eq(videoVariants.videoId, videoId));
}

/**
 * Gets the overall encoding progress for a video.
 * Returns a number between 0-100.
 */
export async function getEncodingProgress(
  deps: EncodingServiceDeps,
  videoId: string
): Promise<number> {
  const variants = await getVariantsForVideo(deps, videoId);

  if (variants.length === 0) return 0;

  const activeVariants = variants.filter((v) => v.status !== 'skipped');
  if (activeVariants.length === 0) return 100;

  const completedCount = activeVariants.filter((v) => v.status === 'ready').length;
  return Math.round((completedCount / activeVariants.length) * 100);
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Retries a failed encoding job.
 */
export async function retryFailedJob(
  deps: EncodingServiceDepsWithPubSub,
  jobId: string
): Promise<CreateEncodingJobsResult | null> {
  const [job] = await deps.db
    .select()
    .from(encodingJobs)
    .where(eq(encodingJobs.id, jobId))
    .limit(1);

  if (!job) {
    return null;
  }

  if (job.status !== 'failed') {
    throw new Error('Can only retry failed jobs');
  }

  if (job.attemptNumber >= job.maxAttempts) {
    throw new Error('Maximum retry attempts exceeded');
  }

  // Get the video
  const [video] = await deps.db
    .select()
    .from(videos)
    .where(eq(videos.id, job.videoId))
    .limit(1);

  if (!video) {
    throw new Error('Video not found');
  }

  // Update attempt number
  await deps.db
    .update(encodingJobs)
    .set({
      attemptNumber: job.attemptNumber + 1,
      status: 'pending',
      errorCode: null,
      errorMessage: null,
      errorDetails: null,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    })
    .where(eq(encodingJobs.id, jobId));

  // Reset variant statuses
  await deps.db
    .update(videoVariants)
    .set({
      status: 'pending',
      completedAt: null,
    })
    .where(and(eq(videoVariants.videoId, job.videoId), inArray(videoVariants.status, ['error'])));

  // Re-publish the job
  return createEncodingJobs(deps, video, video.sourceWidth ?? undefined, video.sourceHeight ?? undefined);
}

/**
 * Cancels an encoding job.
 */
export async function cancelJob(deps: EncodingServiceDeps, jobId: string): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  await deps.db
    .update(encodingJobs)
    .set({
      status: 'cancelled',
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(encodingJobs.id, jobId));
}
