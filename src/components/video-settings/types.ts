import type { Video } from '@/lib/rpc/videos';
import type { VideoVisibility } from '@/types/video.types';

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
