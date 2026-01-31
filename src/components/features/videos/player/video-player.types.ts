import type { VideoQuality } from '@/types/encoding.types';
import type { VideoPlaybackVariant } from '@/types/video.types';

export interface VideoPlayerProps {
  variants: VideoPlaybackVariant[];
  defaultQuality?: VideoQuality;
  thumbnail?: string;
  autoPlay?: boolean;
  className?: string;
  onQualityChange?: (quality: VideoQuality) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  currentQuality: VideoQuality;
  isLoading: boolean;
  hasError: boolean;
}

export interface UseVideoPlayerOptions {
  variants: VideoPlaybackVariant[];
  defaultQuality?: VideoQuality;
  onQualityChange?: (quality: VideoQuality) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

export interface UseVideoPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  state: PlayerState;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  seekRelative: (delta: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setQuality: (quality: VideoQuality) => void;
  toggleFullscreen: () => void;
  currentVariant: VideoPlaybackVariant | undefined;
}
