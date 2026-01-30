import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Video as DBVideo } from '@/db/schema';
import type {
  VideoVisibility,
  VideoStatus,
  VideoPlayback,
  CreateUploadInput,
  UpdateVideoInput,
  CreateUploadResult,
  ConfirmUploadInput,
  ConfirmUploadResult,
  VideoListResult,
  DeleteVideoResult,
  AssignVideoInput,
} from '@/types/video.types';
import type { VideoQuality } from '@/types/encoding.types';

// Re-export types for convenience
export type {
  VideoVisibility,
  VideoStatus,
  VideoPlayback,
  CreateUploadInput,
  UpdateVideoInput,
  CreateUploadResult,
  ConfirmUploadResult,
  DeleteVideoResult,
};

// ============================================================================
// Types
// ============================================================================

export interface Video extends DBVideo {
  playback?: VideoPlayback | null;
  encodingProgress?: number;
  variants?: Array<{
    quality: string;
    status: string;
    width?: number | null;
    height?: number | null;
    bitrate?: number | null;
    fileSize?: number | null;
  }>;
}

export type CreateUploadUrlRequest = CreateUploadInput;
export type CreateUploadUrlResponse = CreateUploadResult;

export type VideoListResponse = VideoListResult<Video>;

export interface VideoDetailResponse {
  video: Video;
}

export type UpdateVideoRequest = UpdateVideoInput;

export interface EncodingStatusResponse {
  status: VideoStatus;
  overallProgress: number;
  variants: Array<{
    quality: VideoQuality;
    status: string;
    playbackUrl?: string;
  }>;
  thumbnailUrl?: string;
  error?: string;
}

export interface ListVideosOptions {
  limit?: number;
  offset?: number;
  visibility?: VideoVisibility;
  status?: VideoStatus;
}

// ============================================================================
// RPC Methods
// ============================================================================

/**
 * Create a presigned upload URL for uploading videos to R2
 * Requires teacher or admin role
 */
async function createUploadUrl(
  request: CreateUploadUrlRequest
): Promise<CreateUploadUrlResponse> {
  return apiPost<CreateUploadUrlResponse, CreateUploadUrlRequest>(
    '/api/videos/upload-url',
    request
  );
}

/**
 * Upload a video file directly to R2 via our API
 */
async function uploadToR2(
  videoId: string,
  file: File,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    signal?.addEventListener('abort', () => {
      xhr.abort();
    });

    xhr.open('PUT', `/api/videos/${videoId}/upload`);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.send(file);
  });
}

/**
 * Confirm upload completion and trigger encoding
 */
async function confirmUpload(
  videoId: string,
  input: ConfirmUploadInput
): Promise<ConfirmUploadResult> {
  return apiPost<ConfirmUploadResult, ConfirmUploadInput>(
    `/api/videos/${videoId}/upload-complete`,
    input
  );
}

/**
 * Get encoding status for a video
 */
async function getEncodingStatus(videoId: string): Promise<EncodingStatusResponse | null> {
  return apiGet<EncodingStatusResponse | null>(`/api/videos/${videoId}/encoding-status`);
}

/**
 * List videos for the current user
 * Admins see all videos, others see their own and public videos
 */
async function listVideos(
  options: ListVideosOptions = {}
): Promise<VideoListResponse> {
  const query: Record<string, string> = {};

  if (options.limit) query.limit = options.limit.toString();
  if (options.offset) query.offset = options.offset.toString();
  if (options.visibility) query.visibility = options.visibility;
  if (options.status) query.status = options.status;

  return apiGet<VideoListResponse>('/api/videos', query);
}

/**
 * Get video details by ID
 * Includes playback URLs if video is ready
 */
async function getVideo(videoId: string): Promise<VideoDetailResponse> {
  return apiGet<VideoDetailResponse>(`/api/videos/${videoId}`);
}

/**
 * Update video metadata
 * Only owner or admin can update
 */
async function updateVideo(
  videoId: string,
  updates: UpdateVideoRequest
): Promise<VideoDetailResponse> {
  return apiPatch<VideoDetailResponse, UpdateVideoRequest>(
    `/api/videos/${videoId}`,
    updates
  );
}

/**
 * Delete a video
 * Only owner or admin can delete
 * Also deletes from R2 storage
 */
async function deleteVideo(videoId: string): Promise<DeleteVideoResult> {
  return apiDelete<DeleteVideoResult>(`/api/videos/${videoId}`);
}

/**
 * List videos not assigned to any lesson
 * Can be filtered by moduleId to show unassigned videos for a specific module
 * Teachers see their own, admins see all
 */
async function listUnassignedVideos(
  options: { limit?: number; offset?: number; moduleId?: string } = {}
): Promise<VideoListResponse> {
  const query: Record<string, string> = {};

  if (options.limit) query.limit = options.limit.toString();
  if (options.offset) query.offset = options.offset.toString();
  if (options.moduleId) query.moduleId = options.moduleId;

  return apiGet<VideoListResponse>('/api/videos/unassigned', query);
}

/**
 * Assign a video to a lesson or unassign it
 * Only owner or admin can assign
 */
async function assignVideoToLesson(
  videoId: string,
  input: AssignVideoInput
): Promise<VideoDetailResponse> {
  return apiPatch<VideoDetailResponse, AssignVideoInput>(
    `/api/videos/${videoId}/assign`,
    input
  );
}

/**
 * List videos assigned to a specific lesson
 */
async function getVideosForLesson(
  lessonId: string
): Promise<{ videos: Video[]; lessonId: string }> {
  return apiGet<{ videos: Video[]; lessonId: string }>(`/api/lessons/${lessonId}/videos`);
}

/**
 * Complete upload flow: create upload URL, upload file, confirm, and return video ID
 */
async function uploadVideo(
  file: File,
  metadata: Omit<CreateUploadUrlRequest, 'filename' | 'fileSize' | 'mimeType'>,
  options: {
    onProgress?: (progress: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<string> {
  const { videoId } = await createUploadUrl({
    ...metadata,
    filename: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });

  await uploadToR2(videoId, file, options.onProgress, options.signal);
  await confirmUpload(videoId, {});

  return videoId;
}

/**
 * Poll video status until it reaches a terminal state
 */
async function pollVideoStatus(
  videoId: string,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    onStatusChange?: (status: EncodingStatusResponse) => void;
  } = {}
): Promise<Video> {
  const { maxAttempts = 60, intervalMs = 3000, onStatusChange } = options;

  let attempts = 0;
  const terminalStates = ['ready', 'failed_encoding', 'failed_transcription', 'failed_indexing'];

  while (attempts < maxAttempts) {
    const status = await getEncodingStatus(videoId);

    if (status && onStatusChange) {
      onStatusChange(status);
    }

    if (status && terminalStates.includes(status.status)) {
      const { video } = await getVideo(videoId);
      return video;
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Polling timeout for video ${videoId}`);
}

// ============================================================================
// Retry Methods
// ============================================================================

interface RetryEncodingResponse {
  videoId: string;
  jobId: string;
  messageId?: string;
}

interface RetryTranscriptionResponse {
  videoId: string;
  status: VideoStatus;
  transcriptPath?: string;
  error?: string;
}

interface RetryIndexingResponse {
  videoId: string;
  status: 'ready' | 'failed_indexing';
  chunksCreated: number;
  embeddingsStored: number;
  error?: string;
}

/**
 * Retry a failed encoding job
 */
async function retryEncoding(videoId: string): Promise<RetryEncodingResponse> {
  return apiPost<RetryEncodingResponse>(`/api/videos/${videoId}/retry-encoding`, {});
}

/**
 * Retry a failed transcription
 */
async function retryTranscription(videoId: string): Promise<RetryTranscriptionResponse> {
  return apiPost<RetryTranscriptionResponse>(`/api/videos/${videoId}/transcribe`, {});
}

/**
 * Retry failed RAG indexing
 */
async function retryIndexing(videoId: string): Promise<RetryIndexingResponse> {
  return apiPost<RetryIndexingResponse>(`/api/videos/${videoId}/retry-indexing`, {});
}

/**
 * Upload a video and wait for encoding to complete
 */
async function uploadAndWait(
  file: File,
  metadata: Omit<CreateUploadUrlRequest, 'filename' | 'fileSize' | 'mimeType'>,
  options: {
    onUploadProgress?: (progress: number) => void;
    onEncodingProgress?: (status: EncodingStatusResponse) => void;
    signal?: AbortSignal;
    maxAttempts?: number;
    intervalMs?: number;
  } = {}
): Promise<Video> {
  const { onUploadProgress, onEncodingProgress, signal, ...pollOptions } = options;

  const videoId = await uploadVideo(file, metadata, {
    onProgress: onUploadProgress,
    signal,
  });

  return pollVideoStatus(videoId, {
    ...pollOptions,
    onStatusChange: onEncodingProgress,
  });
}

// ============================================================================
// Export RPC client
// ============================================================================

export const videosRpc = {
  createUploadUrl,
  uploadToR2,
  confirmUpload,
  getEncodingStatus,
  listVideos,
  listUnassignedVideos,
  getVideosForLesson,
  getVideo,
  updateVideo,
  deleteVideo,
  assignVideoToLesson,
  uploadVideo,
  pollVideoStatus,
  uploadAndWait,
  retryEncoding,
  retryTranscription,
  retryIndexing,
};
