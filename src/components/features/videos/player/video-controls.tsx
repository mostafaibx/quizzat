'use client';

import { useCallback, useState, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VideoQuality } from '@/types/encoding.types';
import type { VideoPlaybackVariant } from '@/types/video.types';
import { QualitySelector } from './quality-selector';
import type { PlayerState } from './video-player.types';

interface VideoControlsProps {
  state: PlayerState;
  variants: VideoPlaybackVariant[];
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onQualityChange: (quality: VideoQuality) => void;
  onToggleFullscreen: () => void;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VolumeIcon({ volume, muted }: { volume: number; muted: boolean }) {
  if (muted || volume === 0) return <VolumeX className="h-5 w-5" />;
  if (volume < 0.5) return <Volume1 className="h-5 w-5" />;
  return <Volume2 className="h-5 w-5" />;
}

export function VideoControls({
  state,
  variants,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onQualityChange,
  onToggleFullscreen,
  className,
}: VideoControlsProps) {
  const [showVolume, setShowVolume] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const bufferedPercent = state.duration > 0 ? (state.buffered / state.duration) * 100 : 0;

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = progressRef.current?.getBoundingClientRect();
      if (!rect || state.duration === 0) return;

      const clickX = e.clientX - rect.left;
      const percent = clickX / rect.width;
      const newTime = percent * state.duration;
      onSeek(newTime);
    },
    [state.duration, onSeek]
  );

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = volumeRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clickX = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, clickX / rect.width));
      onVolumeChange(percent);
    },
    [onVolumeChange]
  );

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-8',
        className
      )}
    >
      {/* Progress bar */}
      <div
        ref={progressRef}
        className="group mb-3 h-1 cursor-pointer rounded-full bg-white/30 transition-all hover:h-1.5"
        onClick={handleProgressClick}
      >
        {/* Buffered */}
        <div
          className="absolute h-full rounded-full bg-white/50"
          style={{ width: `${bufferedPercent}%` }}
        />
        {/* Progress */}
        <div
          className="relative h-full rounded-full bg-primary"
          style={{ width: `${progressPercent}%` }}
        >
          {/* Seek handle */}
          <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 scale-0 rounded-full bg-primary shadow-md transition-transform group-hover:scale-100" />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white hover:bg-white/20 hover:text-white"
          onClick={onTogglePlay}
        >
          {state.isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Volume */}
        <div
          className="relative flex items-center"
          onMouseEnter={() => setShowVolume(true)}
          onMouseLeave={() => setShowVolume(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/20 hover:text-white"
            onClick={onToggleMute}
          >
            <VolumeIcon volume={state.volume} muted={state.isMuted} />
          </Button>

          {/* Volume slider */}
          <div
            className={cn(
              'ml-1 flex items-center overflow-hidden transition-all duration-200',
              showVolume ? 'w-20 opacity-100' : 'w-0 opacity-0'
            )}
          >
            <div
              ref={volumeRef}
              className="h-1 w-full cursor-pointer rounded-full bg-white/30"
              onClick={handleVolumeClick}
            >
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${state.isMuted ? 0 : state.volume * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Time display */}
        <span className="ml-2 text-sm text-white tabular-nums">
          {formatTime(state.currentTime)} / {formatTime(state.duration)}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Quality selector */}
        <QualitySelector
          variants={variants}
          currentQuality={state.currentQuality}
          onQualityChange={onQualityChange}
        />

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white hover:bg-white/20 hover:text-white"
          onClick={onToggleFullscreen}
        >
          {state.isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
