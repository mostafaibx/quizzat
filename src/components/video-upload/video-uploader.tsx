"use client";

import { useCallback, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  /** Fallback redirect URL if no module/lesson selected. Use :id for video ID placeholder */
  redirectOnSuccess?: string;
  /** Auto-redirect to module/lesson page after upload starts encoding */
  autoRedirectToContent?: boolean;
  showLessonSelector?: boolean;
  /** Whether module selection is required when showLessonSelector is true */
  moduleRequired?: boolean;
  labels?: VideoUploaderLabels;
  onSuccess?: (videoId: string) => void;
  onError?: (error: string) => void;
}

export function VideoUploader({
  className,
  redirectOnSuccess,
  autoRedirectToContent = true,
  showLessonSelector = false,
  moduleRequired = true,
  labels = {},
  onSuccess,
  onError,
}: VideoUploaderProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'en';

  // Store metadata for redirect after upload
  const uploadMetadataRef = useRef<VideoMetadata | null>(null);
  const hasRedirectedRef = useRef(false);

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
      // Don't redirect here anymore - we redirect when encoding starts
    },
    [onSuccess]
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
    isEncoding,
    isComplete,
  } = useVideoUpload({
    onSuccess: handleSuccess,
    onError,
  });

  // Redirect when encoding starts (upload completed)
  useEffect(() => {
    if (uploadState.status === 'encoding' && !hasRedirectedRef.current && uploadMetadataRef.current) {
      hasRedirectedRef.current = true;
      const metadata = uploadMetadataRef.current;

      if (autoRedirectToContent && metadata.moduleId) {
        // Build redirect URL based on selection
        if (metadata.lessonId && metadata.unitId) {
          // Redirect to lesson page
          router.push(`/${locale}/teacher/modules/${metadata.moduleId}/units/${metadata.unitId}/lessons/${metadata.lessonId}`);
        } else {
          // Redirect to module page
          router.push(`/${locale}/teacher/modules/${metadata.moduleId}`);
        }
      } else if (redirectOnSuccess && uploadState.videoId) {
        // Fallback to custom redirect
        router.push(redirectOnSuccess.replace(':id', uploadState.videoId));
      }
    }
  }, [uploadState.status, uploadState.videoId, autoRedirectToContent, redirectOnSuccess, router, locale]);

  const handleFormSubmit = useCallback(
    (metadata: VideoMetadata) => {
      uploadMetadataRef.current = metadata;
      hasRedirectedRef.current = false;
      upload(metadata);
    },
    [upload]
  );

  const handleRetry = useCallback(() => {
    uploadMetadataRef.current = null;
    hasRedirectedRef.current = false;
    reset();
  }, [reset]);

  const showForm = selectedFile && !isUploading && !isEncoding && !isComplete;
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
          disabled={isUploading || isEncoding}
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
            moduleRequired={moduleRequired}
            fileName={selectedFile?.file.name}
            labels={formLabels}
          />
        )}
      </CardContent>
    </Card>
  );
}
