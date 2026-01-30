import { z } from 'zod';
import { VIDEO_QUALITY, type VideoQuality, type EncodingStatusVariant } from './encoding.types';

// ============================================================================
// Constants
// ============================================================================

export const VIDEO_VISIBILITY = ['private', 'unlisted', 'public'] as const;
export const VIDEO_STATUS = ['pending', 'uploading', 'encoding', 'ready', 'error'] as const;

// ============================================================================
// Base Types
// ============================================================================

export type VideoVisibility = (typeof VIDEO_VISIBILITY)[number];
export type VideoStatus = (typeof VIDEO_STATUS)[number];

export interface VideoPlaybackVariant {
  quality: VideoQuality;
  url: string;
  width: number;
  height: number;
  bitrate: number;
}

export interface VideoPlayback {
  variants: VideoPlaybackVariant[];
  thumbnail?: string;
  defaultQuality: VideoQuality;
  iframe?: string;
}

// ============================================================================
// Zod Schemas (shared between server and client)
// ============================================================================

export const createUploadSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  visibility: z.enum(VIDEO_VISIBILITY).default('private'),
  moduleId: z.string().min(1), // Required: video must belong to a module
  filename: z.string().min(1), // Original filename for R2 path
  fileSize: z.number().min(1).max(200 * 1024 * 1024 * 1024), // Max 200GB
  mimeType: z.string().min(1),
});

export const updateVideoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: z.enum(VIDEO_VISIBILITY).optional(),
});

export const listVideosQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  visibility: z.enum(VIDEO_VISIBILITY).optional(),
  status: z.enum(VIDEO_STATUS).optional(),
});

export const confirmUploadSchema = z.object({
  sourceWidth: z.number().optional(),
  sourceHeight: z.number().optional(),
  duration: z.number().optional(),
  /** Selected video qualities to encode */
  qualities: z.array(z.enum(VIDEO_QUALITY)).min(1).optional(),
  /** Enable AI features (audio extraction for transcription) */
  useAI: z.boolean().optional(),
});

export const assignVideoSchema = z.object({
  /** Lesson ID to assign video to, or null to unassign */
  lessonId: z.string().nullable(),
  /** Number of days the video is available to students */
  availableDays: z.number().min(1).max(365).optional(),
});

export const listUnassignedVideosQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  moduleId: z.string().optional(), // Filter by module
});

// ============================================================================
// Input Types (derived from Zod schemas)
// ============================================================================

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type ListVideosQuery = z.infer<typeof listVideosQuerySchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type AssignVideoInput = z.infer<typeof assignVideoSchema>;
export type ListUnassignedVideosQuery = z.infer<typeof listUnassignedVideosQuerySchema>;

// ============================================================================
// Response Types (for RPC and API responses)
// ============================================================================

export interface CreateUploadResult {
  videoId: string;
  uploadUrl: string; // R2 presigned PUT URL
  r2Path: string;    // Path where file will be stored
}

export interface ConfirmUploadResult {
  videoId: string;
  status: VideoStatus;
  encodingJobId: string;
}

export interface VideoListResult<T> {
  videos: T[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface DeleteVideoResult {
  deleted: boolean;
  videoId: string;
}

export interface VideoWithEncodingStatus {
  id: string;
  title: string;
  description?: string | null;
  status: VideoStatus;
  visibility: VideoVisibility;
  duration?: number | null;
  playback: VideoPlayback | null;
  encodingProgress?: number;
  variants?: EncodingStatusVariant[];
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}
