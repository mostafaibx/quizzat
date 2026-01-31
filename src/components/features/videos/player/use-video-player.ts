'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { VideoQuality } from '@/types/encoding.types';
import type { VideoPlaybackVariant } from '@/types/video.types';
import type {
  PlayerState,
  UseVideoPlayerOptions,
  UseVideoPlayerReturn,
} from './video-player.types';

const STORAGE_KEY = 'video-player-quality';
const PROGRESS_INTERVAL = 1000; // Report progress every second

function getStoredQuality(): VideoQuality | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ['1080p', '720p', '480p', '360p', '240p'].includes(stored)) {
      return stored as VideoQuality;
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

function storeQuality(quality: VideoQuality): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, quality);
  } catch {
    // Ignore localStorage errors
  }
}

function findBestQuality(
  variants: VideoPlaybackVariant[],
  preferred?: VideoQuality
): VideoQuality {
  if (!variants.length) return '720p';

  const availableQualities = variants.map((v) => v.quality);

  // Try preferred quality first
  if (preferred && availableQualities.includes(preferred)) {
    return preferred;
  }

  // Try stored preference
  const stored = getStoredQuality();
  if (stored && availableQualities.includes(stored)) {
    return stored;
  }

  // Default preference order
  const preferenceOrder: VideoQuality[] = ['720p', '1080p', '480p', '360p', '240p'];
  for (const q of preferenceOrder) {
    if (availableQualities.includes(q)) {
      return q;
    }
  }

  // Fallback to first available
  return variants[0].quality;
}

export function useVideoPlayer(options: UseVideoPlayerOptions): UseVideoPlayerReturn {
  const { variants, defaultQuality, onQualityChange, onProgress, onEnded } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    currentQuality: findBestQuality(variants, defaultQuality),
    isLoading: true,
    hasError: false,
  });

  const currentVariant = variants.find((v) => v.quality === state.currentQuality);

  // Update state helper
  const updateState = useCallback((updates: Partial<PlayerState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Play
  const play = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Autoplay may be blocked
      });
    }
  }, []);

  // Pause
  const pause = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  // Seek to absolute time
  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (video && isFinite(time)) {
      video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
    }
  }, []);

  // Seek relative to current time
  const seekRelative = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (video) {
        seek(video.currentTime + delta);
      }
    },
    [seek]
  );

  // Set volume (0-1)
  const setVolume = useCallback((volume: number) => {
    const video = videoRef.current;
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (video) {
      video.volume = clampedVolume;
      video.muted = clampedVolume === 0;
    }
    updateState({ volume: clampedVolume, isMuted: clampedVolume === 0 });
  }, [updateState]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      updateState({ isMuted: video.muted });
    }
  }, [updateState]);

  // Change quality
  const setQuality = useCallback(
    (quality: VideoQuality) => {
      const video = videoRef.current;
      const newVariant = variants.find((v) => v.quality === quality);

      if (!video || !newVariant || quality === state.currentQuality) return;

      // Store current state
      const currentTime = video.currentTime;
      const wasPlaying = !video.paused;

      // Update quality
      updateState({ currentQuality: quality, isLoading: true });
      storeQuality(quality);
      onQualityChange?.(quality);

      // The video source change will happen via the src attribute change
      // We need to restore position after metadata loads
      const handleLoadedMetadata = () => {
        video.currentTime = currentTime;
        if (wasPlaying) {
          video.play().catch(() => {});
        }
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    },
    [variants, state.currentQuality, updateState, onQualityChange]
  );

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen().catch(() => {});
    }
  }, []);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => updateState({ isPlaying: true });
    const handlePause = () => updateState({ isPlaying: false });
    const handleEnded = () => {
      updateState({ isPlaying: false });
      onEnded?.();
    };
    const handleLoadStart = () => updateState({ isLoading: true, hasError: false });
    const handleCanPlay = () => updateState({ isLoading: false });
    const handleWaiting = () => updateState({ isLoading: true });
    const handlePlaying = () => updateState({ isLoading: false, isPlaying: true });
    const handleError = () => updateState({ hasError: true, isLoading: false });
    const handleLoadedMetadata = () => {
      updateState({ duration: video.duration });
    };
    const handleTimeUpdate = () => {
      updateState({ currentTime: video.currentTime });
    };
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        updateState({ buffered: bufferedEnd });
      }
    };
    const handleVolumeChange = () => {
      updateState({ volume: video.volume, isMuted: video.muted });
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [updateState, onEnded]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      updateState({ isFullscreen: !!document.fullscreenElement });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [updateState]);

  // Progress reporting
  useEffect(() => {
    if (state.isPlaying && onProgress) {
      progressIntervalRef.current = setInterval(() => {
        const video = videoRef.current;
        if (video) {
          onProgress(video.currentTime, video.duration);
        }
      }, PROGRESS_INTERVAL);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [state.isPlaying, onProgress]);

  // Keyboard shortcuts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if focus is within the player or on the container
      if (!container.contains(document.activeElement) && document.activeElement !== container) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(state.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(state.volume - 0.1);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, seekRelative, setVolume, toggleMute, toggleFullscreen, state.volume]);

  return {
    videoRef,
    containerRef,
    state,
    play,
    pause,
    togglePlay,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setQuality,
    toggleFullscreen,
    currentVariant,
  };
}
