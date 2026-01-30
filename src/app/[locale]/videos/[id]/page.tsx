"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2, AlertCircle, Clock, Eye, Calendar, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { videosRpc, type Video } from '@/lib/rpc';
import { VIDEO_FAILED_STATUSES, type VideoFailedStatus } from '@/types/video.types';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('videos');
  const tCommon = useTranslations('common');

  const videoId = params.id as string;
  const locale = params.locale as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideo() {
      try {
        const data = await videosRpc.getVideo(videoId);
        setVideo(data.video);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setLoading(false);
      }
    }

    fetchVideo();
  }, [videoId]);

  const getStatusBadge = (status: Video['status']) => {
    const variants: Record<Video['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'outline', label: 'Pending' },
      processing: { variant: 'secondary', label: 'Processing' },
      ready: { variant: 'default', label: 'Ready' },
      error: { variant: 'destructive', label: 'Error' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getVisibilityBadge = (visibility: Video['visibility']) => {
    const labels: Record<Video['visibility'], string> = {
      private: t('form.visibilityPrivate'),
      unlisted: t('form.visibilityUnlisted'),
      public: t('form.visibilityPublic'),
    };
    return <Badge variant="outline">{labels[visibility]}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Video not found'}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/${locale}/videos`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold truncate">{video.title}</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Video player area */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                {video.status === 'ready' && video.playback ? (
                  <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                    <iframe
                      src={video.playback.iframe}
                      className="h-full w-full"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-t-lg flex flex-col items-center justify-center gap-3">
                    {['encoding', 'transcribing', 'indexing'].includes(video.status) ? (
                      <>
                        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground">{t('progress.processing')}</p>
                      </>
                    ) : VIDEO_FAILED_STATUSES.includes(video.status as VideoFailedStatus) ? (
                      <>
                        <AlertCircle className="h-12 w-12 text-destructive" />
                        <p className="text-destructive">{t('progress.error')}</p>
                      </>
                    ) : (
                      <>
                        <Play className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">{t('progress.preparing')}</p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video info */}
            <Card className="mt-4">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(video.status)}
                  {getVisibilityBadge(video.visibility)}
                </div>
                <CardTitle className="mt-2">{video.title}</CardTitle>
                {video.description && (
                  <CardDescription className="whitespace-pre-wrap">
                    {video.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Video Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {video.duration && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{t('dropzone.duration')}: {formatDuration(video.duration)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span>{t('form.visibility')}: {
                    video.visibility === 'private' ? t('form.visibilityPrivate') :
                    video.visibility === 'unlisted' ? t('form.visibilityUnlisted') :
                    t('form.visibilityPublic')
                  }</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Uploaded: {formatDate(video.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/${locale}/videos/upload`)}
            >
              {t('uploadTitle')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
