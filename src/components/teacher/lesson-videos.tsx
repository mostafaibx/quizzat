'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Eye,
  MoreVertical,
  Settings2,
  Trash2,
  ExternalLink,
  Film,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VideoSettingsDialog } from '@/components/video-settings';
import { VideoThumbnail } from './video-thumbnail';
import { videosRpc, type Video } from '@/lib/rpc/videos';
import type { VideoStatus } from '@/types/video.types';

interface LessonVideosProps {
  lessonId: string;
  moduleId: string;
  onVideoCountChange?: (count: number) => void;
}

const statusConfig: Record<VideoStatus, { label: string; color: string; icon?: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  uploading: { label: 'Uploading', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  encoding: { label: 'Encoding', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  transcribing: { label: 'Transcribing', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  indexing: { label: 'Indexing', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  failed_encoding: { label: 'Encoding Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: <AlertCircle className="h-3 w-3" /> },
  failed_transcription: { label: 'Transcription Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: <AlertCircle className="h-3 w-3" /> },
  failed_indexing: { label: 'Indexing Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: <AlertCircle className="h-3 w-3" /> },
};

export function LessonVideos({ lessonId, moduleId, onVideoCountChange }: LessonVideosProps) {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await videosRpc.getVideosForLesson(lessonId);
      setVideos(result.videos);
      onVideoCountChange?.(result.videos.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, onVideoCountChange]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Poll for processing status updates (encoding, transcribing, indexing)
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const processingStatuses = ['uploading', 'encoding', 'transcribing', 'indexing'];
    const hasProcessingVideos = videos.some((v) => processingStatuses.includes(v.status));

    if (hasProcessingVideos && !pollingRef.current) {
      pollingRef.current = setInterval(() => {
        fetchVideos();
      }, 5000); // Poll every 5 seconds
    } else if (!hasProcessingVideos && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [videos, fetchVideos]);

  const handleOpenSettings = (video: Video) => {
    setSelectedVideo(video);
    setSettingsOpen(true);
  };

  const handleSettingsSave = async () => {
    await fetchVideos();
  };

  const handleUnassignVideo = async (videoId: string) => {
    try {
      await videosRpc.assignVideoToLesson(videoId, { lessonId: null });
      await fetchVideos();
    } catch (err) {
      console.error('Failed to unassign video:', err);
    }
  };

  const handleViewVideo = (videoId: string) => {
    router.push(`/videos/${videoId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Film className="h-4 w-4" />
            Videos
          </h3>
        </div>
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchVideos} className="mt-2">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Film className="h-4 w-4" />
          Videos
          {videos.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {videos.length}
            </Badge>
          )}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/videos/upload?lessonId=${lessonId}&moduleId=${moduleId}`)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Video
        </Button>
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Film className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No videos assigned to this lesson yet.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/videos/upload?lessonId=${lessonId}&moduleId=${moduleId}`)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Upload Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {videos.map((video) => {
            const status = statusConfig[video.status as VideoStatus] || statusConfig.pending;

            return (
              <Card key={video.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail with encoding status */}
                    <VideoThumbnail
                      status={video.status as VideoStatus}
                      thumbnailUrl={video.playback?.thumbnail}
                      title={video.title}
                      duration={video.duration}
                      encodingProgress={video.encodingProgress}
                      size="md"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{video.title}</h4>
                          {video.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {video.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {video.status === 'ready' && (
                              <DropdownMenuItem onClick={() => handleViewVideo(video.id)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Video
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleOpenSettings(video)}>
                              <Settings2 className="h-4 w-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleUnassignVideo(video.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove from Lesson
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <Badge className={cn('text-xs', status.color)}>
                          {status.icon}
                          {status.label}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {video.availableDays} days
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          <Eye className="h-3 w-3" />
                          {video.visibility}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Settings Dialog */}
      <VideoSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        video={selectedVideo}
        onSave={handleSettingsSave}
      />
    </div>
  );
}
