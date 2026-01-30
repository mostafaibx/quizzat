import { z } from 'zod';

// ============================================================================
// Constants - Single Source of Truth
// ============================================================================

export const VIDEO_QUALITY = ['1080p', '720p', '480p', '360p', '240p'] as const;

// Human-readable quality labels for UI display
export const VIDEO_QUALITY_LABELS: Record<(typeof VIDEO_QUALITY)[number], string> = {
  '1080p': '1080p HD',
  '720p': '720p',
  '480p': '480p',
  '360p': '360p',
  '240p': '240p',
};
export const QUALITY_STATUS = ['pending', 'encoding', 'ready', 'error', 'skipped'] as const;
export const ENCODING_JOB_STATUS = ['pending', 'queued', 'processing', 'completed', 'failed', 'cancelled'] as const;
export const ENCODING_JOB_TYPE = ['encode', 'thumbnail'] as const;
export const WEBHOOK_EVENT_TYPE = [
  'job.started',
  'job.progress',
  'quality.completed',
  'job.completed',
  'job.failed',
  'thumbnail.generated',
  'audio.extracted',
] as const;

// ============================================================================
// Base Types
// ============================================================================

export type VideoQuality = (typeof VIDEO_QUALITY)[number];
export type QualityStatus = (typeof QUALITY_STATUS)[number];
export type EncodingJobStatus = (typeof ENCODING_JOB_STATUS)[number];
export type EncodingJobType = (typeof ENCODING_JOB_TYPE)[number];
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPE)[number];

// ============================================================================
// R2 Path Helpers - Single Source of Truth for path conventions
// ============================================================================

export const R2_PATHS = {
  raw: (videoId: string, filename: string) => `videos/raw/${videoId}/${filename}`,
  encoded: (videoId: string, quality: VideoQuality) => `videos/encoded/${videoId}/${quality}.mp4`,
  thumbnail: (videoId: string) => `videos/thumbnails/${videoId}.jpg`,
  audio: (videoId: string) => `videos/audio/${videoId}/audio_for_stt.wav`,
  transcript: (videoId: string) => `videos/transcripts/${videoId}/transcript.json`,
} as const;

// ============================================================================
// Quality Configuration
// ============================================================================

export interface QualityConfig {
  quality: VideoQuality;
  width: number;
  height: number;
  bitrate: number; // kbps
  audioBitrate: number; // kbps
}

export const DEFAULT_QUALITY_CONFIGS: QualityConfig[] = [
  { quality: '1080p', width: 1920, height: 1080, bitrate: 5000, audioBitrate: 192 },
  { quality: '720p', width: 1280, height: 720, bitrate: 2500, audioBitrate: 128 },
  { quality: '480p', width: 854, height: 480, bitrate: 1000, audioBitrate: 96 },
  { quality: '360p', width: 640, height: 360, bitrate: 600, audioBitrate: 64 },
  { quality: '240p', width: 426, height: 240, bitrate: 300, audioBitrate: 48 },
];

// ============================================================================
// Pub/Sub Message Contract (App → GCP)
// ============================================================================

export interface EncodingJobSource {
  bucket: string;
  path: string;
  filename: string;
}

export interface EncodingJobOutput {
  bucket: string;
  basePath: string;
}

export interface EncodingJobThumbnail {
  enabled: boolean;
  timestampPercent: number; // 0-100, where to capture thumbnail
  path: string;
}

export interface EncodingJobCallback {
  webhookUrl: string;
  webhookSecret: string;
}

export interface EncodingJobAudioForStt {
  enabled: boolean;
}

export interface EncodingJobMetadata {
  userId: string;
  title?: string;
  createdAt: string;
}

export interface EncodingJobMessage {
  jobId: string;
  videoId: string;
  source: EncodingJobSource;
  output: EncodingJobOutput;
  qualities: QualityConfig[];
  thumbnail: EncodingJobThumbnail;
  audioForStt: EncodingJobAudioForStt;
  callback: EncodingJobCallback;
  metadata: EncodingJobMetadata;
}

// ============================================================================
// Webhook Contract (GCP → App)
// ============================================================================

interface WebhookBase {
  jobId: string;
  videoId: string;
  timestamp: string;
}

export interface WebhookJobStarted extends WebhookBase {
  event: 'job.started';
  data: {
    sourceWidth: number;
    sourceHeight: number;
    duration: number;
    codec: string;
    bitrate: number;
    fps: number;
  };
}

export interface WebhookJobProgress extends WebhookBase {
  event: 'job.progress';
  data: {
    progress: number; // 0-100
    quality?: VideoQuality;
    message?: string;
  };
}

export interface WebhookQualityCompleted extends WebhookBase {
  event: 'quality.completed';
  data: {
    quality: VideoQuality;
    width: number;
    height: number;
    bitrate: number;
    fileSize: number;
    r2Path: string;
  };
}

export interface WebhookJobCompleted extends WebhookBase {
  event: 'job.completed';
  data: {
    duration: number;
    qualities: Array<{
      quality: VideoQuality;
      r2Path: string;
      fileSize: number;
    }>;
  };
}

export interface WebhookJobFailed extends WebhookBase {
  event: 'job.failed';
  data: {
    errorCode: string;
    errorMessage: string;
    errorDetails?: string;
    quality?: VideoQuality; // If failed on specific quality
  };
}

export interface WebhookThumbnailGenerated extends WebhookBase {
  event: 'thumbnail.generated';
  data: {
    r2Path: string;
    width: number;
    height: number;
  };
}

export interface WebhookAudioExtracted extends WebhookBase {
  event: 'audio.extracted';
  data: {
    outputPath: string;
    fileSizeBytes: number;
    durationSeconds: number;
    format: string;
    sampleRate: number;
    channels: number;
    bitDepth: number;
  };
}

export type WebhookPayload =
  | WebhookJobStarted
  | WebhookJobProgress
  | WebhookQualityCompleted
  | WebhookJobCompleted
  | WebhookJobFailed
  | WebhookThumbnailGenerated
  | WebhookAudioExtracted;

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const webhookPayloadSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('job.started'),
    jobId: z.string(),
    videoId: z.string(),
    timestamp: z.string(),
    data: z.object({
      sourceWidth: z.number(),
      sourceHeight: z.number(),
      duration: z.number(),
      codec: z.string(),
      bitrate: z.number(),
      fps: z.number(),
    }),
  }),
  z.object({
    event: z.literal('job.progress'),
    jobId: z.string(),
    videoId: z.string(),
    timestamp: z.string(),
    data: z.object({
      progress: z.number().min(0).max(100),
      quality: z.enum(VIDEO_QUALITY).optional(),
      message: z.string().optional(),
    }),
  }),
  z.object({
    event: z.literal('quality.completed'),
    jobId: z.string(),
    videoId: z.string(),
    timestamp: z.string(),
    data: z.object({
      quality: z.enum(VIDEO_QUALITY),
      width: z.number(),
      height: z.number(),
      bitrate: z.number(),
      fileSize: z.number(),
      r2Path: z.string(),
    }),
  }),
  z.object({
    event: z.literal('job.completed'),
    jobId: z.string(),
    videoId: z.string(),
    timestamp: z.string(),
    data: z.object({
      duration: z.number(),
      qualities: z.array(z.object({
        quality: z.enum(VIDEO_QUALITY),
        r2Path: z.string(),
        fileSize: z.number(),
      })),
    }),
  }),
  z.object({
    event: z.literal('job.failed'),
    jobId: z.string(),
    videoId: z.string(),
    timestamp: z.string(),
    data: z.object({
      errorCode: z.string(),
      errorMessage: z.string(),
      errorDetails: z.string().optional(),
      quality: z.enum(VIDEO_QUALITY).optional(),
    }),
  }),
  z.object({
    event: z.literal('thumbnail.generated'),
    jobId: z.string(),
    videoId: z.string(),
    timestamp: z.string(),
    data: z.object({
      r2Path: z.string(),
      width: z.number(),
      height: z.number(),
    }),
  }),
  z.object({
    event: z.literal('audio.extracted'),
    jobId: z.string(),
    videoId: z.string(),
    timestamp: z.string(),
    data: z.object({
      outputPath: z.string(),
      fileSizeBytes: z.number(),
      durationSeconds: z.number(),
      format: z.string(),
      sampleRate: z.number(),
      channels: z.number(),
      bitDepth: z.number(),
    }),
  }),
]);

// ============================================================================
// Encoding Status Response Types
// ============================================================================

export interface EncodingStatusVariant {
  quality: VideoQuality;
  status: QualityStatus;
  progress?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  playbackUrl?: string;
}

export interface EncodingStatusResponse {
  videoId: string;
  status: 'uploading' | 'encoding' | 'ready' | 'error';
  overallProgress: number;
  variants: EncodingStatusVariant[];
  thumbnailUrl?: string;
  error?: string;
}
