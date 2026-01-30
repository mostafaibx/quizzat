'use client';

import { useState, useEffect, useCallback } from 'react';
import { videosRpc, type Video } from '@/lib/rpc';

interface UseUnassignedVideosReturn {
  videos: Video[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  assignVideo: (videoId: string, lessonId: string) => Promise<void>;
  isAssigning: boolean;
}

export function useUnassignedVideos(): UseUnassignedVideosReturn {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await videosRpc.listUnassignedVideos({ limit: 50 });
      setVideos(response.videos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch unassigned videos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const assignVideo = useCallback(async (videoId: string, lessonId: string) => {
    setIsAssigning(true);
    setError(null);
    try {
      await videosRpc.assignVideoToLesson(videoId, { lessonId });
      // Remove the assigned video from the list
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign video');
      throw err;
    } finally {
      setIsAssigning(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return { videos, isLoading, error, refetch: fetchVideos, assignVideo, isAssigning };
}
