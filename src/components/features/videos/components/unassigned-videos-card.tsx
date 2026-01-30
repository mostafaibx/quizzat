'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Check, Film, Video, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VideoThumbnail } from './video-thumbnail';
import { videosRpc } from '@/lib/rpc';
import type { Module, Lesson, Video as VideoType } from '@/lib/rpc';
import { VIDEO_FAILED_STATUSES, type VideoStatus, type VideoFailedStatus } from '@/types/video.types';

interface UnassignedVideosCardProps {
  module: Module;
  onVideoAssigned?: () => void;
}

export function UnassignedVideosCard({ module, onVideoAssigned }: UnassignedVideosCardProps) {
  const t = useTranslations('teacher');
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch unassigned videos for this module
  const fetchVideos = useCallback(async () => {
    try {
      const response = await videosRpc.listUnassignedVideos({
        limit: 50,
        moduleId: module.id, // Filter by current module
      });
      setVideos(response.videos);
    } catch (error) {
      console.error('Failed to fetch unassigned videos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [module.id]);

  useEffect(() => {
    setIsLoading(true);
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

  const assignVideo = async (videoId: string, lessonId: string) => {
    setIsAssigning(true);
    try {
      await videosRpc.assignVideoToLesson(videoId, { lessonId });
      // Remove the assigned video from the list
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      onVideoAssigned?.();
    } catch (error) {
      console.error('Failed to assign video:', error);
      throw error;
    } finally {
      setIsAssigning(false);
    }
  };

  const retryVideo = async (videoId: string, failedStatus: VideoFailedStatus) => {
    try {
      if (failedStatus === 'failed_encoding') {
        await videosRpc.retryEncoding(videoId);
      } else if (failedStatus === 'failed_transcription') {
        await videosRpc.retryTranscription(videoId);
      } else if (failedStatus === 'failed_indexing') {
        await videosRpc.retryIndexing(videoId);
      }
      // Refresh the list to get updated status
      fetchVideos();
    } catch (error) {
      console.error('Failed to retry video processing:', error);
      throw error;
    }
  };

  // Build flat list of lessons from module units
  const lessons = (module.units || []).flatMap((unit) =>
    (unit.lessons || []).map((lesson) => ({
      ...lesson,
      unitTitle: unit.title,
    }))
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Film className="h-4 w-4" />
            {t('unassignedVideos')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (videos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Film className="h-4 w-4" />
            {t('unassignedVideos')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Video className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('noUnassignedVideos')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Film className="h-4 w-4" />
          {t('unassignedVideos')}
          <Badge variant="secondary" className="ml-auto">
            {videos.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {videos.map((video) => (
            <UnassignedVideoItem
              key={video.id}
              video={video}
              lessons={lessons}
              onAssign={(lessonId) => assignVideo(video.id, lessonId)}
              onRetry={(status) => retryVideo(video.id, status)}
              isAssigning={isAssigning}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface LessonOption extends Lesson {
  unitTitle: string;
}

interface UnassignedVideoItemProps {
  video: VideoType;
  lessons: LessonOption[];
  onAssign: (lessonId: string) => Promise<void>;
  onRetry: (status: VideoFailedStatus) => Promise<void>;
  isAssigning: boolean;
}

function UnassignedVideoItem({ video, lessons, onAssign, onRetry, isAssigning }: UnassignedVideoItemProps) {
  const t = useTranslations('teacher');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [isAssigningThis, setIsAssigningThis] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const isFailedStatus = VIDEO_FAILED_STATUSES.includes(video.status as VideoFailedStatus);

  const handleAssign = async () => {
    if (!selectedLessonId) return;
    setIsAssigningThis(true);
    try {
      await onAssign(selectedLessonId);
    } finally {
      setIsAssigningThis(false);
    }
  };

  const handleRetry = async () => {
    if (!isFailedStatus) return;
    setIsRetrying(true);
    try {
      await onRetry(video.status as VideoFailedStatus);
    } finally {
      setIsRetrying(false);
    }
  };

  const getRetryButtonText = () => {
    switch (video.status) {
      case 'failed_encoding':
        return t('retryEncoding');
      case 'failed_transcription':
        return t('retryTranscription');
      case 'failed_indexing':
        return t('retryIndexing');
      default:
        return t('retry');
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-background">
      {/* Video thumbnail with encoding status */}
      <VideoThumbnail
        status={video.status as VideoStatus}
        thumbnailUrl={video.playback?.thumbnail}
        title={video.title}
        duration={video.duration}
        encodingProgress={video.encodingProgress}
        size="sm"
      />

      {/* Video info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{video.title}</p>
        {video.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {video.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isFailedStatus ? (
          /* Retry button for failed videos */
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-1" />
            )}
            {getRetryButtonText()}
          </Button>
        ) : (
          /* Lesson selector for ready videos */
          <>
            <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('selectLesson')} />
              </SelectTrigger>
              <SelectContent>
                {lessons.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    {t('noLessonsAvailable')}
                  </div>
                ) : (
                  lessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      <span className="truncate">
                        {lesson.unitTitle} / {lesson.title}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={handleAssign}
              disabled={!selectedLessonId || isAssigningThis || isAssigning || video.status !== 'ready'}
            >
              {isAssigningThis ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
