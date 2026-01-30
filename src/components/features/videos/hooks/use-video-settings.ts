'use client';

import { useState, useCallback } from 'react';
import { videosRpc, type Video } from '@/lib/rpc/videos';
import type { VideoSettingsData } from '@/components/features/videos/types';

interface UseVideoSettingsReturn {
  /** Save video settings */
  saveSettings: (videoId: string, data: VideoSettingsData) => Promise<Video>;
  /** Whether a save operation is in progress */
  isLoading: boolean;
  /** Error message if save failed */
  error: string | null;
  /** Clear the error */
  clearError: () => void;
}

/**
 * Hook for managing video settings mutations
 */
export function useVideoSettings(): UseVideoSettingsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveSettings = useCallback(async (videoId: string, data: VideoSettingsData): Promise<Video> => {
    setIsLoading(true);
    setError(null);

    try {
      // Update video metadata (title, description, visibility)
      const { video: updatedVideo } = await videosRpc.updateVideo(videoId, {
        title: data.title,
        description: data.description,
        visibility: data.visibility,
      });

      // Update lesson assignment
      await videosRpc.assignVideoToLesson(videoId, {
        lessonId: data.lessonId,
        availableDays: data.availableDays,
      });

      return updatedVideo;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save video settings';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    saveSettings,
    isLoading,
    error,
    clearError,
  };
}
