'use client';

import { Play, AlertCircle, Clock, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoStatus } from '@/types/video.types';

interface VideoThumbnailProps {
  status: VideoStatus;
  thumbnailUrl?: string | null;
  title?: string;
  duration?: number | null;
  encodingProgress?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-12 w-20',
  md: 'h-20 w-32',
  lg: 'h-32 w-52',
};

const spinnerSizes = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function VideoThumbnail({
  status,
  thumbnailUrl,
  title,
  duration,
  encodingProgress,
  className,
  size = 'md',
}: VideoThumbnailProps) {
  const isProcessing = ['uploading', 'encoding', 'transcribing', 'indexing'].includes(status);
  const isError = ['failed_encoding', 'failed_transcription', 'failed_indexing'].includes(status);
  const isPending = status === 'pending';

  const getProcessingText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'encoding':
        return 'Encoding...';
      case 'transcribing':
        return 'Transcribing...';
      case 'indexing':
        return 'Indexing...';
      default:
        return 'Processing...';
    }
  };

  const getErrorText = () => {
    switch (status) {
      case 'failed_encoding':
        return 'Encoding failed';
      case 'failed_transcription':
        return 'Transcription failed';
      case 'failed_indexing':
        return 'Indexing failed';
      default:
        return 'Error';
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden bg-black flex items-center justify-center shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {/* Thumbnail or gradient background */}
      {/* Show thumbnail if available (encoding completed) regardless of transcription/indexing status */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title || 'Video thumbnail'}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className={cn(
          'absolute inset-0',
          isProcessing
            ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
            : 'bg-gradient-to-br from-gray-800 to-gray-900'
        )} />
      )}

      {/* Processing state - prominent spinner and text */}
      {isProcessing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Pulsing background ring */}
          <div className={cn(
            'absolute rounded-full bg-white/5 animate-ping',
            size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-14 w-14' : 'h-20 w-20'
          )} />

          {/* Spinner container */}
          <div className={cn(
            'relative flex items-center justify-center',
            spinnerSizes[size]
          )}>
            {/* Outer spinning ring */}
            <div className={cn(
              'absolute inset-0 rounded-full border-2 border-white/20'
            )} />
            <div className={cn(
              'absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin'
            )} style={{ animationDuration: '1s' }} />

            {/* Inner icon or progress */}
            <div className="relative z-10 flex items-center justify-center">
              {encodingProgress !== undefined && encodingProgress > 0 ? (
                <span className={cn(
                  'font-bold text-white',
                  size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-xs' : 'text-sm'
                )}>
                  {Math.round(encodingProgress)}%
                </span>
              ) : (
                <Film className={cn(
                  'text-white/70',
                  size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
                )} />
              )}
            </div>
          </div>

          {/* Status text */}
          {size !== 'sm' && (
            <div className="mt-2 text-center">
              <p className={cn(
                'font-medium text-white',
                size === 'md' ? 'text-[10px]' : 'text-xs'
              )}>
                {getProcessingText()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pending state */}
      {isPending && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
          <Clock className={cn('text-white/70', iconSizes[size])} />
          {size !== 'sm' && (
            <p className={cn(
              'mt-1 font-medium text-white/70',
              size === 'md' ? 'text-[10px]' : 'text-xs'
            )}>
              Pending
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/40">
          <AlertCircle className={cn('text-red-400', iconSizes[size])} />
          {size !== 'sm' && (
            <p className={cn(
              'mt-1 font-medium text-red-400 text-center px-1',
              size === 'md' ? 'text-[10px]' : 'text-xs'
            )}>
              {getErrorText()}
            </p>
          )}
        </div>
      )}

      {/* Play button overlay for ready videos */}
      {status === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group cursor-pointer">
          <div className={cn(
            'rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg',
            size === 'sm' ? 'h-6 w-6' : size === 'md' ? 'h-10 w-10' : 'h-14 w-14'
          )}>
            <Play className={cn(
              'text-gray-900 ml-0.5',
              size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-5 w-5' : 'h-7 w-7'
            )} fill="currentColor" />
          </div>
        </div>
      )}

      {/* Duration badge for ready videos */}
      {status === 'ready' && duration && (
        <div className={cn(
          'absolute bottom-1 right-1 bg-black/80 text-white rounded px-1.5 py-0.5 font-medium',
          size === 'sm' ? 'text-[9px]' : 'text-[10px]'
        )}>
          {formatDuration(duration)}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
