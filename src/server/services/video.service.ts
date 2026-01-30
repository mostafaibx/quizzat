/**
 * Video Service - R2 Storage + GCP Encoding
 *
 * Pure functions that receive dependencies as arguments.
 * Handles video upload to R2 and triggers encoding via GCP Pub/Sub.
 */

import { eq, desc, and, or, sql, type SQL } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { videos, videoVariants, encodingJobs } from '@/db/schema';
import type { Video, VideoVariant } from '@/db/schema';
import type { AuthenticatedUser } from '@/types/auth.types';
import { AUTH_ROLES } from '@/types/auth.types';
import {
  generateUploadPath,
  generatePublicUrl,
  deleteVideoObjects,
  checkRawVideoExists,
  type R2Config,
} from '@/lib/r2-storage';
import { type PubSubConfig } from '@/lib/pubsub';
import {
  createEncodingJobs,
  getVariantsForVideo,
  getEncodingProgress,
  type EncodingServiceDepsWithPubSub,
} from './encoding-job.service';
import type {
  CreateUploadInput,
  UpdateVideoInput,
  ListVideosQuery,
  CreateUploadResult,
  ConfirmUploadInput,
  ConfirmUploadResult,
  VideoPlayback,
  VideoStatus,
  VideoPlaybackVariant,
} from '@/types/video.types';
import { R2_PATHS, VIDEO_QUALITY, type VideoQuality } from '@/types/encoding.types';

// ============================================================================
// Types
// ============================================================================

export type VideoWithPlayback = Video & {
  playback: VideoPlayback | null;
  variants?: VideoVariant[];
  encodingProgress?: number;
};

export interface ServiceDeps {
  db: DrizzleD1Database;
}

export interface ServiceDepsWithR2 extends ServiceDeps {
  r2Config: R2Config;
}

export interface ServiceDepsWithEncoding extends ServiceDepsWithR2 {
  pubsubConfig: PubSubConfig;
  webhookUrl: string;
  webhookSecret: string;
  r2BucketName: string;
}

// ============================================================================
// ID Generation
// ============================================================================

export function generateVideoId(): string {
  return `vid_${crypto.randomUUID().replace(/-/g, '')}`;
}

// ============================================================================
// Authorization Helpers
// ============================================================================

export function canAccessVideo(video: Video, user: AuthenticatedUser): boolean {
  const isOwner = video.userId === user.id;
  const isAdmin = user.role === AUTH_ROLES.ADMIN;
  const isPublic = video.visibility === 'public';
  const isUnlisted = video.visibility === 'unlisted';

  return isOwner || isAdmin || isPublic || isUnlisted;
}

export function canModifyVideo(video: Video, user: AuthenticatedUser): boolean {
  const isOwner = video.userId === user.id;
  const isAdmin = user.role === AUTH_ROLES.ADMIN;

  return isOwner || isAdmin;
}

// ============================================================================
// Read Operations
// ============================================================================

export async function findVideoById(
  deps: ServiceDeps,
  id: string
): Promise<Video | null> {
  const [video] = await deps.db
    .select()
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);

  return video ?? null;
}

export async function listVideos(
  deps: ServiceDeps,
  query: ListVideosQuery,
  user: AuthenticatedUser
): Promise<{ videos: Video[]; hasMore: boolean }> {
  const conditions: SQL[] = [];

  // Non-admins can only see their own videos or public videos
  if (user.role !== AUTH_ROLES.ADMIN) {
    const accessCondition = or(
      eq(videos.userId, user.id),
      eq(videos.visibility, 'public')
    );
    if (accessCondition) {
      conditions.push(accessCondition);
    }
  }

  if (query.visibility) {
    conditions.push(eq(videos.visibility, query.visibility));
  }

  if (query.status) {
    conditions.push(eq(videos.status, query.status));
  }

  const whereClause =
    conditions.length > 0
      ? conditions.length === 1
        ? conditions[0]
        : and(...conditions)
      : undefined;

  const videoList = await deps.db
    .select()
    .from(videos)
    .where(whereClause)
    .orderBy(desc(videos.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  return {
    videos: videoList,
    hasMore: videoList.length === query.limit,
  };
}

/**
 * Lists videos that are not assigned to any lesson.
 * Can be filtered by moduleId to show unassigned videos for a specific module.
 * Teachers see their own unassigned videos, admins see all.
 */
export async function listUnassignedVideos(
  deps: ServiceDeps,
  user: AuthenticatedUser,
  query: { limit?: number; offset?: number; moduleId?: string } = {}
): Promise<{ videos: Video[]; hasMore: boolean }> {
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;
  const conditions: SQL[] = [];

  // Videos where lessonId is null (unassigned to lesson)
  conditions.push(sql`${videos.lessonId} IS NULL`);

  // Filter by moduleId if provided
  if (query.moduleId) {
    conditions.push(eq(videos.moduleId, query.moduleId));
  }

  // Non-admins can only see their own videos
  if (user.role !== AUTH_ROLES.ADMIN) {
    conditions.push(eq(videos.userId, user.id));
  }

  const videoList = await deps.db
    .select()
    .from(videos)
    .where(and(...conditions))
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    videos: videoList,
    hasMore: videoList.length === limit,
  };
}

/**
 * Lists videos assigned to a specific lesson.
 */
export async function getVideosForLesson(
  deps: ServiceDeps,
  lessonId: string
): Promise<Video[]> {
  return deps.db
    .select()
    .from(videos)
    .where(eq(videos.lessonId, lessonId))
    .orderBy(desc(videos.createdAt));
}

/**
 * Assigns a video to a lesson, or unassigns if lessonId is null.
 */
export async function assignVideoToLesson(
  deps: ServiceDeps,
  videoId: string,
  lessonId: string | null,
  availableDays?: number
): Promise<Video> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const updateData: Record<string, unknown> = {
    lessonId,
    updatedAt: now,
  };

  // Update availableDays if provided
  if (availableDays !== undefined) {
    updateData.availableDays = availableDays;
  }

  await deps.db.update(videos).set(updateData).where(eq(videos.id, videoId));

  const [updatedVideo] = await deps.db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  return updatedVideo;
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Creates a video upload record and returns a presigned R2 URL.
 * The client will use this URL to upload the video directly to R2.
 * Video must be assigned to a module (required).
 */
export async function createVideoUpload(
  deps: ServiceDepsWithR2,
  input: CreateUploadInput,
  userId: string
): Promise<CreateUploadResult> {
  const videoId = generateVideoId();
  const r2Path = generateUploadPath(videoId, input.filename);

  // Create video record in database with uploading status
  await deps.db.insert(videos).values({
    id: videoId,
    userId,
    moduleId: input.moduleId, // Required: video belongs to a module
    title: input.title,
    description: input.description,
    r2RawPath: r2Path,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    status: 'uploading',
    visibility: input.visibility,
  });

  // Generate the presigned upload URL
  // Note: For Cloudflare Workers, we'll use a worker endpoint to handle the upload
  // The uploadUrl will be an API endpoint that proxies to R2
  const uploadUrl = `/api/videos/${videoId}/upload`;

  return {
    videoId,
    uploadUrl,
    r2Path,
  };
}

/**
 * Confirms that the upload is complete and triggers encoding.
 */
export async function confirmUpload(
  deps: ServiceDepsWithEncoding,
  videoId: string,
  input: ConfirmUploadInput
): Promise<ConfirmUploadResult> {
  // Get the video
  const video = await findVideoById(deps, videoId);
  if (!video) {
    throw new Error('Video not found');
  }

  if (video.status !== 'uploading') {
    throw new Error('Video is not in uploading state');
  }

  // Extract filename from r2RawPath
  const filename = video.r2RawPath?.split('/').pop() || 'video.mp4';

  // Verify the file exists in R2
  const exists = await checkRawVideoExists(deps.r2Config, videoId, filename);
  if (!exists) {
    throw new Error('Upload not found in R2');
  }

  // Update video with source metadata
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  await deps.db
    .update(videos)
    .set({
      sourceWidth: input.sourceWidth,
      sourceHeight: input.sourceHeight,
      duration: input.duration,
      status: 'encoding',
      updatedAt: now,
    })
    .where(eq(videos.id, videoId));

  // Get the updated video
  const updatedVideo = await findVideoById(deps, videoId);
  if (!updatedVideo) {
    throw new Error('Video not found after update');
  }

  // Create encoding jobs and publish to Pub/Sub
  const encodingDeps: EncodingServiceDepsWithPubSub = {
    db: deps.db,
    pubsubConfig: deps.pubsubConfig,
    webhookUrl: deps.webhookUrl,
    webhookSecret: deps.webhookSecret,
    r2BucketName: deps.r2BucketName,
  };

  const { jobId } = await createEncodingJobs(
    encodingDeps,
    updatedVideo,
    input.sourceWidth,
    input.sourceHeight,
    {
      qualities: input.qualities,
      useAI: input.useAI ?? true, // Default to true if not specified
    }
  );

  return {
    videoId,
    status: 'encoding',
    encodingJobId: jobId,
  };
}

export async function updateVideo(
  deps: ServiceDeps,
  videoId: string,
  input: UpdateVideoInput
): Promise<Video> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.visibility !== undefined) updateData.visibility = input.visibility;

  await deps.db.update(videos).set(updateData).where(eq(videos.id, videoId));

  const [updatedVideo] = await deps.db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  return updatedVideo;
}

export async function updateVideoStatus(
  deps: ServiceDeps,
  videoId: string,
  status: VideoStatus,
  meta?: { duration?: number; r2ThumbnailPath?: string; errorMessage?: string }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  if (meta?.duration !== undefined) updateData.duration = meta.duration;
  if (meta?.r2ThumbnailPath !== undefined) updateData.r2ThumbnailPath = meta.r2ThumbnailPath;
  if (meta?.errorMessage !== undefined) updateData.errorMessage = meta.errorMessage;

  await deps.db.update(videos).set(updateData).where(eq(videos.id, videoId));
}

export async function deleteVideo(
  deps: ServiceDepsWithR2,
  video: Video
): Promise<void> {
  // Delete from R2 (raw + encoded + thumbnail)
  if (video.r2RawPath) {
    const filename = video.r2RawPath.split('/').pop() || 'video.mp4';
    try {
      await deleteVideoObjects(deps.r2Config, video.id, filename);
    } catch (error) {
      // Log but don't fail - files might already be deleted
      console.error('Failed to delete video files from R2:', error);
    }
  }

  // Delete encoding jobs
  await deps.db.delete(encodingJobs).where(eq(encodingJobs.videoId, video.id));

  // Delete video variants
  await deps.db.delete(videoVariants).where(eq(videoVariants.videoId, video.id));

  // Delete from database
  await deps.db.delete(videos).where(eq(videos.id, video.id));
}

// ============================================================================
// Playback URL Generation
// ============================================================================

/**
 * Generates playback URLs for a video's encoded variants.
 */
export async function getPlaybackUrls(
  deps: ServiceDepsWithR2,
  video: Video
): Promise<VideoPlayback | null> {
  if (video.status !== 'ready') {
    return null;
  }

  // Get ready variants
  const variants = await getVariantsForVideo(deps, video.id);
  const readyVariants = variants.filter((v) => v.status === 'ready');

  if (readyVariants.length === 0) {
    return null;
  }

  // Generate CDN URLs for each variant
  const playbackVariants: VideoPlaybackVariant[] = readyVariants.map((v) => ({
    quality: v.quality as VideoQuality,
    url: v.r2Path ? generatePublicUrl(deps.r2Config, v.r2Path) : '',
    width: v.width || 0,
    height: v.height || 0,
    bitrate: v.bitrate || 0,
  }));

  // Determine default quality (prefer 720p, fallback to highest available)
  const qualityOrder: VideoQuality[] = ['720p', '1080p', '480p'];
  let defaultQuality: VideoQuality = playbackVariants[0].quality;
  for (const q of qualityOrder) {
    if (playbackVariants.some((v) => v.quality === q)) {
      defaultQuality = q;
      break;
    }
  }

  // Generate thumbnail URL
  const thumbnail = video.r2ThumbnailPath
    ? generatePublicUrl(deps.r2Config, video.r2ThumbnailPath)
    : undefined;

  return {
    variants: playbackVariants,
    thumbnail,
    defaultQuality,
  };
}

/**
 * Attaches playback information to a video.
 */
export async function attachPlayback(
  deps: ServiceDepsWithR2,
  video: Video
): Promise<VideoWithPlayback> {
  const playback = await getPlaybackUrls(deps, video);
  const variants = await getVariantsForVideo(deps, video.id);
  const encodingProgress =
    video.status === 'encoding' ? await getEncodingProgress(deps, video.id) : undefined;

  return {
    ...video,
    playback,
    variants,
    encodingProgress,
  };
}

// ============================================================================
// Encoding Status
// ============================================================================

/**
 * Gets the encoding status for a video including per-quality progress.
 */
export async function getEncodingStatus(
  deps: ServiceDepsWithR2,
  videoId: string
): Promise<{
  status: VideoStatus;
  overallProgress: number;
  variants: Array<{
    quality: VideoQuality;
    status: string;
    playbackUrl?: string;
  }>;
  thumbnailUrl?: string;
  error?: string;
} | null> {
  const video = await findVideoById(deps, videoId);
  if (!video) {
    return null;
  }

  const variants = await getVariantsForVideo(deps, video.id);
  const progress = await getEncodingProgress(deps, video.id);

  const variantStatus = variants.map((v) => ({
    quality: v.quality as VideoQuality,
    status: v.status,
    playbackUrl:
      v.status === 'ready' && v.r2Path
        ? generatePublicUrl(deps.r2Config, v.r2Path)
        : undefined,
  }));

  const thumbnailUrl = video.r2ThumbnailPath
    ? generatePublicUrl(deps.r2Config, video.r2ThumbnailPath)
    : undefined;

  return {
    status: video.status as VideoStatus,
    overallProgress: progress,
    variants: variantStatus,
    thumbnailUrl,
    error: video.errorMessage ?? undefined,
  };
}
