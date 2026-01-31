'use client';

import { Settings } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VIDEO_QUALITY_LABELS, type VideoQuality } from '@/types/encoding.types';
import type { VideoPlaybackVariant } from '@/types/video.types';
import { cn } from '@/lib/utils';

interface QualitySelectorProps {
  variants: VideoPlaybackVariant[];
  currentQuality: VideoQuality;
  onQualityChange: (quality: VideoQuality) => void;
  className?: string;
}

// Sort qualities by resolution (highest first)
const qualityOrder: VideoQuality[] = ['1080p', '720p', '480p', '360p', '240p'];

export function QualitySelector({
  variants,
  currentQuality,
  onQualityChange,
  className,
}: QualitySelectorProps) {
  // Sort variants by quality order
  const sortedVariants = [...variants].sort(
    (a, b) => qualityOrder.indexOf(a.quality) - qualityOrder.indexOf(b.quality)
  );

  return (
    <Select value={currentQuality} onValueChange={(value) => onQualityChange(value as VideoQuality)}>
      <SelectTrigger
        className={cn(
          'h-8 w-auto gap-1 border-none bg-black/50 text-white hover:bg-black/70 focus:ring-0 focus:ring-offset-0',
          className
        )}
      >
        <Settings className="h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[120px]">
        {sortedVariants.map((variant) => (
          <SelectItem key={variant.quality} value={variant.quality}>
            <div className="flex items-center justify-between gap-4">
              <span>{VIDEO_QUALITY_LABELS[variant.quality]}</span>
              {variant.quality === '1080p' && (
                <span className="text-xs text-muted-foreground">HD</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
