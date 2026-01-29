"use client";

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoDropzone } from './video-dropzone';
import { VideoUploadForm } from './video-upload-form';
import { UploadProgress } from './upload-progress';
import { useVideoUpload } from './use-video-upload';
import type { VideoMetadata } from './types';

interface VideoUploaderLabels {
  cardTitle?: string;
  cardDescription?: string;
  dropzone?: {
    dropzone?: string;
    dropzoneHint?: string;
    browse?: string;
    dragActive?: string;
    preview?: string;
    remove?: string;
    duration?: string;
    size?: string;
  };
  form?: {
    title?: string;
    titlePlaceholder?: string;
    description?: string;
    descriptionPlaceholder?: string;
    visibility?: string;
    visibilityPrivate?: string;
    visibilityPrivateDesc?: string;
    visibilityUnlisted?: string;
    visibilityUnlistedDesc?: string;
    visibilityPublic?: string;
    visibilityPublicDesc?: string;
    upload?: string;
    uploading?: string;
    assignToLesson?: string;
    availableDays?: string;
    availableDaysHint?: string;
    module?: string;
    modulePlaceholder?: string;
    unit?: string;
    unitPlaceholder?: string;
    lesson?: string;
    lessonPlaceholder?: string;
    optional?: string;
  };
  progress?: {
    preparing?: string;
    uploading?: string;
    processing?: string;
    complete?: string;
    error?: string;
    cancel?: string;
    retry?: string;
  };
}

interface VideoUploaderProps {
  className?: string;
  redirectOnSuccess?: string;
  showLessonSelector?: boolean;
  labels?: VideoUploaderLabels;
  onSuccess?: (videoId: string) => void;
  onError?: (error: string) => void;
}

export function VideoUploader({
  className,
  redirectOnSuccess,
  showLessonSelector = false,
  labels = {},
  onSuccess,
  onError,
}: VideoUploaderProps) {
  const router = useRouter();

  const {
    cardTitle = 'Upload Video',
    cardDescription = 'Upload a video to share with your audience',
    dropzone: dropzoneLabels,
    form: formLabels,
    progress: progressLabels,
  } = labels;

  const handleSuccess = useCallback(
    (videoId: string) => {
      onSuccess?.(videoId);
      if (redirectOnSuccess) {
        router.push(redirectOnSuccess.replace(':id', videoId));
      }
    },
    [onSuccess, redirectOnSuccess, router]
  );

  const {
    uploadState,
    selectedFile,
    selectFile,
    clearFile,
    upload,
    cancel,
    reset,
    isUploading,
    isProcessing,
    isComplete,
  } = useVideoUpload({
    onSuccess: handleSuccess,
    onError,
  });

  const handleFormSubmit = useCallback(
    (metadata: VideoMetadata) => {
      upload(metadata);
    },
    [upload]
  );

  const handleRetry = useCallback(() => {
    reset();
  }, [reset]);

  const showForm = selectedFile && !isUploading && !isProcessing && !isComplete;
  const showProgress = uploadState.status !== 'idle';

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dropzone - always visible but disabled during upload */}
        <VideoDropzone
          onFileSelect={selectFile}
          selectedFile={selectedFile}
          onClear={clearFile}
          disabled={isUploading || isProcessing}
          labels={dropzoneLabels}
        />

        {/* Progress indicator */}
        {showProgress && (
          <UploadProgress
            state={uploadState}
            onCancel={isUploading ? cancel : undefined}
            onRetry={uploadState.status === 'error' ? handleRetry : undefined}
            labels={progressLabels}
          />
        )}

        {/* Form - only visible when file is selected and not uploading */}
        {showForm && (
          <VideoUploadForm
            onSubmit={handleFormSubmit}
            disabled={isUploading}
            showLessonSelector={showLessonSelector}
            labels={formLabels}
          />
        )}
      </CardContent>
    </Card>
  );
}
