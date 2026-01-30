'use client';

import { useCallback } from 'react';
import { Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { VideoSettingsForm } from './video-settings-form';
import { useVideoSettings } from '@/components/features/videos/hooks/use-video-settings';
import type { VideoSettingsDialogProps, VideoSettingsData, VideoSettingsLabels } from '@/components/features/videos/types';

interface VideoSettingsDialogWithLabelsProps extends VideoSettingsDialogProps {
  /** Custom labels for localization */
  labels?: VideoSettingsLabels;
}

/**
 * Dialog component for editing video settings.
 * Handles video metadata, visibility, and lesson assignment.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
 *
 * return (
 *   <VideoSettingsDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     video={selectedVideo}
 *     onSave={async (videoId, data) => {
 *       console.log('Saved:', videoId, data);
 *       setOpen(false);
 *     }}
 *   />
 * );
 * ```
 */
export function VideoSettingsDialog({
  open,
  onOpenChange,
  video,
  onSave,
  isLoading: externalLoading = false,
  labels = {},
}: VideoSettingsDialogWithLabelsProps) {
  const { saveSettings, isLoading: internalLoading, error, clearError } = useVideoSettings();

  const isLoading = externalLoading || internalLoading;

  const handleSubmit = useCallback(
    async (data: VideoSettingsData) => {
      if (!video) return;

      try {
        await saveSettings(video.id, data);
        await onSave(video.id, data);
        onOpenChange(false);
      } catch {
        // Error is handled by the hook
      }
    },
    [video, saveSettings, onSave, onOpenChange]
  );

  const handleCancel = useCallback(() => {
    clearError();
    onOpenChange(false);
  }, [clearError, onOpenChange]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        clearError();
      }
      onOpenChange(newOpen);
    },
    [clearError, onOpenChange]
  );

  // Don't render if no video
  if (!video) return null;

  const dialogTitle = labels.dialogTitle ?? 'Video Settings';
  const dialogDescription = labels.dialogDescription ?? 'Update your video details and organization';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        <VideoSettingsForm
          key={video.id}
          video={video}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          labels={labels}
        />
      </DialogContent>
    </Dialog>
  );
}
