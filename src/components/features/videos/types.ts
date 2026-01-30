import type { VideoQuality } from '@/types/encoding.types';
import type { Video } from '@/lib/rpc/videos';
import type { VideoVisibility } from '@/types/video.types';

// Upload Types
export type { VideoVisibility };

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

// Settings Types
/**
 * Data structure for video settings form
 */
export interface VideoSettingsData {
  title: string;
  description?: string;
  visibility: VideoVisibility;
  lessonId: string | null;
  availableDays: number;
}

/**
 * Props for the VideoSettingsDialog component
 */
export interface VideoSettingsDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The video to edit */
  video: Video | null;
  /** Callback when settings are saved successfully */
  onSave: (videoId: string, data: VideoSettingsData) => Promise<void>;
  /** Whether the save operation is in progress */
  isLoading?: boolean;
}

/**
 * Props for the VideoSettingsForm component
 */
export interface VideoSettingsFormProps {
  /** Initial values from the video */
  video: Video;
  /** Callback when form is submitted */
  onSubmit: (data: VideoSettingsData) => Promise<void>;
  /** Callback to close the dialog */
  onCancel: () => void;
  /** Whether the form is submitting */
  isLoading?: boolean;
  /** Custom labels for localization */
  labels?: VideoSettingsLabels;
}

/**
 * Labels for localization
 */
export interface VideoSettingsLabels {
  dialogTitle?: string;
  dialogDescription?: string;
  titleLabel?: string;
  titlePlaceholder?: string;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  visibilityLabel?: string;
  visibilityPrivate?: string;
  visibilityPrivateDesc?: string;
  visibilityUnlisted?: string;
  visibilityUnlistedDesc?: string;
  visibilityPublic?: string;
  visibilityPublicDesc?: string;
  assignmentLabel?: string;
  assignmentHint?: string;
  availableDaysLabel?: string;
  availableDaysHint?: string;
  moduleLabel?: string;
  modulePlaceholder?: string;
  unitLabel?: string;
  unitPlaceholder?: string;
  lessonLabel?: string;
  lessonPlaceholder?: string;
  unassignLabel?: string;
  cancel?: string;
  save?: string;
  saving?: string;
}
