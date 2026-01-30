"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Plus,
  Video,
  Loader2,
  Film,
  Lock,
  Users,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { videosRpc, type Video as VideoType } from '@/lib/rpc';
import { VIDEO_FAILED_STATUSES, type VideoStatus, type VideoFailedStatus } from '@/types/video.types';

type VideoItem = VideoType;

const PROCESSING_STATUSES: VideoStatus[] = ['uploading', 'encoding', 'transcribing', 'indexing'];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const VisibilityIcon = ({ visibility }: { visibility: VideoItem['visibility'] }) => {
  switch (visibility) {
    case 'private':
      return <Lock className="h-3.5 w-3.5" />;
    case 'unlisted':
      return <Users className="h-3.5 w-3.5" />;
    case 'public':
      return <Globe className="h-3.5 w-3.5" />;
  }
};

function VideoCard({ video, locale }: { video: VideoItem; locale: string }) {
  const t = useTranslations('videos');

  const getStatusBadge = () => {
    if (video.status === 'ready') return null;

    // Processing statuses
    if (PROCESSING_STATUSES.includes(video.status as VideoStatus)) {
      const labels: Record<string, string> = {
        uploading: 'Uploading',
        encoding: 'Encoding',
        transcribing: 'Transcribing',
        indexing: 'Indexing',
      };
      return <Badge variant="secondary" className="absolute top-2 start-2">{labels[video.status] || 'Processing'}</Badge>;
    }

    // Failed statuses
    if (VIDEO_FAILED_STATUSES.includes(video.status as VideoFailedStatus)) {
      const labels: Record<string, string> = {
        failed_encoding: 'Encoding Failed',
        failed_transcription: 'Transcription Failed',
        failed_indexing: 'Indexing Failed',
      };
      return <Badge variant="destructive" className="absolute top-2 start-2">{labels[video.status] || 'Error'}</Badge>;
    }

    // Pending
    if (video.status === 'pending') {
      return <Badge variant="outline" className="absolute top-2 start-2">Pending</Badge>;
    }

    return null;
  };

  return (
    <Link href={`/${locale}/videos/${video.id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer group">
        {/* Thumbnail */}
        <div className="aspect-video bg-muted relative">
          {video.playback?.thumbnail ? (
            <img
              src={video.playback.thumbnail}
              alt={video.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Film className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          {getStatusBadge()}
          {video.duration && video.status === 'ready' && (
            <div className="absolute bottom-2 end-2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded">
              {formatDuration(video.duration)}
            </div>
          )}
          {PROCESSING_STATUSES.includes(video.status as VideoStatus) && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <CardContent className="p-3">
          <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <VisibilityIcon visibility={video.visibility} />
              {video.visibility === 'private' ? t('form.visibilityPrivate') :
               video.visibility === 'unlisted' ? t('form.visibilityUnlisted') :
               t('form.visibilityPublic')}
            </span>
            <span>{formatRelativeTime(video.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ locale }: { locale: string }) {
  const t = useTranslations('videos');

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Video className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">{t('list.empty')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('list.emptyDescription')}</p>
        <Button asChild>
          <Link href={`/${locale}/videos/upload`}>
            <Plus className="h-4 w-4" />
            {t('uploadTitle')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function VideosListPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('videos');
  const locale = params.locale as string;

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const data = await videosRpc.listVideos();
        setVideos(data.videos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">{t('list.title')}</h1>
            </div>
            <Button asChild>
              <Link href={`/${locale}/videos/upload`}>
                <Plus className="h-4 w-4" />
                {t('uploadTitle')}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : videos.length === 0 ? (
          <EmptyState locale={locale} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} locale={locale} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
