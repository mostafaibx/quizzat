'use client';

import { useState, useCallback, useEffect } from 'react';
import { Loader2, AlertCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVideoPlayer } from './use-video-player';
import { VideoControls } from './video-controls';
import type { VideoPlayerProps } from './video-player.types';

const CONTROLS_HIDE_DELAY = 3000; // Hide controls after 3 seconds of inactivity

export function VideoPlayer({
  variants,
  defaultQuality,
  thumbnail,
  autoPlay = false,
  className,
  onQualityChange,
  onProgress,
  onEnded,
}: VideoPlayerProps) {
  const [showControls, setShowControls] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const {
    videoRef,
    containerRef,
    state,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setQuality,
    toggleFullscreen,
    currentVariant,
  } = useVideoPlayer({
    variants,
    defaultQuality,
    onQualityChange,
    onProgress,
    onEnded,
  });

  // Hide controls on inactivity
  useEffect(() => {
    if (!state.isPlaying) {
      setShowControls(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowControls(false);
    }, CONTROLS_HIDE_DELAY);

    return () => clearTimeout(timer);
  }, [state.isPlaying, showControls]);

  // Show controls on mouse movement
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (state.isPlaying) {
      setShowControls(false);
    }
  }, [state.isPlaying]);

  // Handle click to play/pause
  const handleVideoClick = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
    }
    togglePlay();
  }, [hasStarted, togglePlay]);

  // Start playing on first click if not autoplay
  const handleInitialPlay = useCallback(() => {
    setHasStarted(true);
    togglePlay();
  }, [togglePlay]);

  if (!currentVariant) {
    return (
      <div className={cn('aspect-video bg-black flex items-center justify-center', className)}>
        <div className="text-center text-white">
          <AlertCircle className="mx-auto h-12 w-12 mb-2" />
          <p>No video available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-video bg-black overflow-hidden group focus:outline-none',
        className
      )}
      tabIndex={0}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="h-full w-full"
        src={currentVariant.url}
        poster={thumbnail}
        autoPlay={autoPlay}
        playsInline
        onClick={handleVideoClick}
      />

      {/* Initial play overlay (before first play) */}
      {!hasStarted && !autoPlay && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={handleInitialPlay}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-110">
            <Play className="h-8 w-8 ml-1" />
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {state.isLoading && hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      )}

      {/* Error state */}
      {state.hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center text-white">
            <AlertCircle className="mx-auto h-12 w-12 mb-2 text-destructive" />
            <p>Failed to load video</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      {hasStarted && (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-300',
            showControls || !state.isPlaying ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Clickable area for play/pause */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={handleVideoClick}
          />

          {/* Center play/pause indicator (brief flash on toggle) */}
          {!state.isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </div>
          )}

          {/* Bottom controls */}
          <VideoControls
            state={state}
            variants={variants}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onVolumeChange={setVolume}
            onToggleMute={toggleMute}
            onQualityChange={setQuality}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      )}
    </div>
  );
}
