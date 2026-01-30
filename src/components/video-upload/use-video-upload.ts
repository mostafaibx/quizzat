"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { videosRpc } from '@/lib/rpc';
import type { UploadState, VideoMetadata, VideoFile, EncodingVariantStatus } from './types';

const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

const MAX_FILE_SIZE = 200 * 1024 * 1024 * 1024; // 200GB

interface UseVideoUploadOptions {
  onSuccess?: (videoId: string) => void;
  onError?: (error: string) => void;
  pollInterval?: number; // ms, default 3000
}

export function useVideoUpload(options: UseVideoUploadOptions = {}) {
  const { pollInterval = 3000 } = options;

  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
  });
  const [selectedFile, setSelectedFile] = useState<VideoFile | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a video file (MP4, WebM, MOV, AVI, MKV).';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 200GB.';
    }
    return null;
  }, []);

  const selectFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadState({
        status: 'error',
        progress: 0,
        error,
      });
      return false;
    }

    // Create video preview URL and get metadata
    const preview = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = preview;

    video.onloadedmetadata = () => {
      setSelectedFile({
        file,
        preview,
        duration: Math.round(video.duration),
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = () => {
      setSelectedFile({
        file,
        preview,
      });
    };

    setUploadState({ status: 'idle', progress: 0 });
    return true;
  }, [validateFile]);

  const clearFile = useCallback(() => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
    setUploadState({ status: 'idle', progress: 0 });
  }, [selectedFile]);

  const pollEncodingStatus = useCallback(async (videoId: string) => {
    try {
      const status = await videosRpc.getEncodingStatus(videoId);
      if (!status) return;

      const variants: EncodingVariantStatus[] = status.variants.map((v) => ({
        quality: v.quality,
        status: v.status as EncodingVariantStatus['status'],
        playbackUrl: v.playbackUrl,
      }));

      if (status.status === 'ready') {
        // Encoding complete
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setUploadState({
          status: 'complete',
          progress: 100,
          videoId,
          encodingProgress: 100,
          variants,
          thumbnailUrl: status.thumbnailUrl,
        });
        options.onSuccess?.(videoId);
      } else if (status.status === 'error') {
        // Encoding failed
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setUploadState({
          status: 'error',
          progress: 0,
          videoId,
          error: status.error || 'Encoding failed',
          variants,
        });
        options.onError?.(status.error || 'Encoding failed');
      } else {
        // Still encoding
        setUploadState((prev) => ({
          ...prev,
          encodingProgress: status.overallProgress,
          variants,
          thumbnailUrl: status.thumbnailUrl,
        }));
      }
    } catch (error) {
      console.error('Error polling encoding status:', error);
    }
  }, [options]);

  const startEncodingPolling = useCallback((videoId: string) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    // Start polling
    pollingRef.current = setInterval(() => {
      pollEncodingStatus(videoId);
    }, pollInterval);

    // Also poll immediately
    pollEncodingStatus(videoId);
  }, [pollInterval, pollEncodingStatus]);

  const upload = useCallback(async (metadata: VideoMetadata) => {
    if (!selectedFile) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: 'No file selected',
      });
      return;
    }

    // Create new abort controller for this upload
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Get upload URL from our API
      setUploadState({ status: 'preparing', progress: 0 });

      const uploadData = await videosRpc.createUploadUrl({
        title: metadata.title,
        description: metadata.description,
        visibility: metadata.visibility,
        moduleId: metadata.moduleId, // Required: video belongs to a module
        filename: selectedFile.file.name,
        fileSize: selectedFile.file.size,
        mimeType: selectedFile.file.type,
      });

      // Step 2: Upload to R2 via our API
      setUploadState({
        status: 'uploading',
        progress: 0,
        videoId: uploadData.videoId,
      });

      await videosRpc.uploadToR2(
        uploadData.videoId,
        selectedFile.file,
        (progress) => {
          setUploadState((prev) => ({
            ...prev,
            progress,
          }));
        },
        abortControllerRef.current.signal
      );

      // Step 3: Confirm upload and trigger encoding
      setUploadState((prev) => ({
        ...prev,
        status: 'encoding',
        progress: 100,
        encodingProgress: 0,
      }));

      await videosRpc.confirmUpload(uploadData.videoId, {
        sourceWidth: selectedFile.width,
        sourceHeight: selectedFile.height,
        duration: selectedFile.duration,
        qualities: metadata.qualities,
        useAI: metadata.useAI,
      });

      // Step 4: Assign video to lesson if selected
      if (metadata.lessonId) {
        await videosRpc.assignVideoToLesson(uploadData.videoId, {
          lessonId: metadata.lessonId,
          availableDays: metadata.availableDays,
        });
      }

      // Step 5: Start polling for encoding status
      startEncodingPolling(uploadData.videoId);

    } catch (error) {
      if (error instanceof Error && error.message === 'Upload cancelled') {
        setUploadState({ status: 'idle', progress: 0 });
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState({
        status: 'error',
        progress: 0,
        error: errorMessage,
      });
      options.onError?.(errorMessage);
    }
  }, [selectedFile, options, startEncodingPolling]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setUploadState({ status: 'idle', progress: 0 });
  }, []);

  const reset = useCallback(() => {
    clearFile();
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setUploadState({ status: 'idle', progress: 0 });
  }, [clearFile]);

  return {
    uploadState,
    selectedFile,
    selectFile,
    clearFile,
    upload,
    cancel,
    reset,
    isUploading: uploadState.status === 'uploading' || uploadState.status === 'preparing',
    isEncoding: uploadState.status === 'encoding',
    isComplete: uploadState.status === 'complete',
    hasError: uploadState.status === 'error',
  };
}

export { ACCEPTED_VIDEO_TYPES };
