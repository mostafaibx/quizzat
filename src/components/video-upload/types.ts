import type { VideoQuality } from '@/types/encoding.types';

export type VideoVisibility = 'private' | 'unlisted' | 'public';

export type UploadStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'encoding'
  | 'complete'
  | 'error';

export interface VideoMetadata {
  title: string;
  description?: string;
  visibility: VideoVisibility;
  moduleId: string; // Required: video must belong to a module
  unitId?: string; // Optional: needed for redirect to lesson page
  lessonId?: string; // Optional: video can be assigned to a lesson
  availableDays?: number;
  /** Selected video qualities to encode */
  qualities: VideoQuality[];
  /** Enable AI features (audio extraction for transcription) */
  useAI: boolean;
}

export interface EncodingVariantStatus {
  quality: VideoQuality;
  status: 'pending' | 'encoding' | 'ready' | 'error' | 'skipped';
  playbackUrl?: string;
}

export interface UploadState {
  status: UploadStatus;
  progress: number;
  error?: string;
  videoId?: string;
  encodingProgress?: number;
  variants?: EncodingVariantStatus[];
  thumbnailUrl?: string;
}

export interface VideoFile {
  file: File;
  preview?: string;
  duration?: number;
  width?: number;
  height?: number;
}
