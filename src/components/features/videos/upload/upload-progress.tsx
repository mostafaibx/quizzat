"use client";

import { Loader2, CheckCircle2, XCircle, CloudUpload, Cog, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { UploadState, EncodingVariantStatus } from '@/components/features/videos/types';

interface UploadProgressProps {
  state: UploadState;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
  showVariants?: boolean;
  labels?: {
    preparing?: string;
    uploading?: string;
    encoding?: string;
    complete?: string;
    error?: string;
    cancel?: string;
    retry?: string;
  };
}

function VariantStatusBadge({ variant }: { variant: EncodingVariantStatus }) {
  const getStatusColor = () => {
    switch (variant.status) {
      case 'ready':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'encoding':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'skipped':
        return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (variant.status) {
      case 'ready':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'encoding':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'error':
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        getStatusColor()
      )}
    >
      {getStatusIcon()}
      {variant.quality}
    </span>
  );
}

export function UploadProgress({
  state,
  onCancel,
  onRetry,
  className,
  showVariants = true,
  labels = {},
}: UploadProgressProps) {
  const {
    preparing = 'Preparing upload...',
    uploading = 'Uploading',
    encoding = 'Encoding video',
    complete = 'Upload complete!',
    error = 'Upload failed',
    cancel = 'Cancel',
    retry = 'Try again',
  } = labels;

  if (state.status === 'idle') {
    return null;
  }

  const getStatusConfig = () => {
    switch (state.status) {
      case 'preparing':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
          title: preparing,
          showProgress: false,
          showCancel: true,
        };
      case 'uploading':
        return {
          icon: <CloudUpload className="h-5 w-5 text-primary" />,
          title: `${uploading}... ${state.progress}%`,
          showProgress: true,
          progressValue: state.progress,
          showCancel: true,
        };
      case 'encoding':
        return {
          icon: <Cog className="h-5 w-5 animate-spin text-primary" />,
          title: `${encoding}... ${state.encodingProgress ?? 0}%`,
          showProgress: true,
          progressValue: state.encodingProgress ?? 0,
          showCancel: false,
          showVariants: showVariants && state.variants && state.variants.length > 0,
        };
      case 'complete':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          title: complete,
          showProgress: true,
          progressValue: 100,
          showCancel: false,
          showVariants: showVariants && state.variants && state.variants.length > 0,
        };
      case 'error':
        return {
          icon: <XCircle className="h-5 w-5 text-destructive" />,
          title: state.error || error,
          showProgress: false,
          showCancel: false,
          showRetry: true,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4",
        state.status === 'error' && "border-destructive/50 bg-destructive/5",
        state.status === 'complete' && "border-green-500/50 bg-green-500/5",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-medium",
              state.status === 'error' && "text-destructive",
              state.status === 'complete' && "text-green-600 dark:text-green-400"
            )}
          >
            {config.title}
          </p>
          {config.showProgress && (
            <Progress
              value={config.progressValue}
              className={cn(
                "mt-2 h-1.5",
                state.status === 'complete' && "[&_[data-slot=progress-indicator]]:bg-green-500"
              )}
            />
          )}
        </div>
        {config.showCancel && onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="shrink-0"
          >
            {cancel}
          </Button>
        )}
        {config.showRetry && onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="shrink-0"
          >
            {retry}
          </Button>
        )}
      </div>

      {/* Variant status badges */}
      {config.showVariants && state.variants && (
        <div className="mt-3 flex flex-wrap gap-2">
          {state.variants
            .filter((v) => v.status !== 'skipped')
            .map((variant) => (
              <VariantStatusBadge key={variant.quality} variant={variant} />
            ))}
        </div>
      )}

      {/* Thumbnail preview */}
      {state.status === 'complete' && state.thumbnailUrl && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Film className="h-4 w-4" />
            <span>Thumbnail generated</span>
          </div>
          <img
            src={state.thumbnailUrl}
            alt="Video thumbnail"
            className="rounded-md w-full max-w-xs h-auto"
          />
        </div>
      )}
    </div>
  );
}
