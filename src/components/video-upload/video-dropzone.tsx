"use client";

import { useCallback, useState, useRef } from 'react';
import { Upload, Film, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ACCEPTED_VIDEO_TYPES } from './use-video-upload';
import type { VideoFile } from './types';

interface VideoDropzoneProps {
  onFileSelect: (file: File) => boolean;
  selectedFile: VideoFile | null;
  onClear: () => void;
  disabled?: boolean;
  className?: string;
  labels?: {
    dropzone?: string;
    dropzoneHint?: string;
    browse?: string;
    dragActive?: string;
    preview?: string;
    remove?: string;
    duration?: string;
    size?: string;
  };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoDropzone({
  onFileSelect,
  selectedFile,
  onClear,
  disabled = false,
  className,
  labels = {},
}: VideoDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    dropzone = 'Drag and drop your video here',
    dropzoneHint = 'MP4, WebM, MOV, AVI, MKV up to 200GB',
    browse = 'Browse files',
    dragActive = 'Drop your video here',
    remove = 'Remove',
    duration = 'Duration',
    size = 'Size',
  } = labels;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [disabled, onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [onFileSelect]
  );

  const handleBrowseClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Show preview if file is selected
  if (selectedFile) {
    return (
      <div className={cn("relative rounded-xl border bg-card", className)}>
        <div className="aspect-video relative overflow-hidden rounded-t-xl bg-black">
          {selectedFile.preview ? (
            <video
              src={selectedFile.preview}
              className="h-full w-full object-contain"
              controls={false}
              muted
              playsInline
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Film className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{selectedFile.file.name}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  {size}: {formatFileSize(selectedFile.file.size)}
                </span>
                {selectedFile.duration && (
                  <span>
                    {duration}: {formatDuration(selectedFile.duration)}
                  </span>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClear}
              disabled={disabled}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{remove}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show dropzone
  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES.join(',')}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div
          className={cn(
            "mb-4 rounded-full p-4 transition-colors",
            isDragActive ? "bg-primary/10" : "bg-muted"
          )}
        >
          <Upload
            className={cn(
              "h-8 w-8 transition-colors",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <p className="mb-2 text-lg font-medium">
          {isDragActive ? dragActive : dropzone}
        </p>
        <p className="mb-4 text-sm text-muted-foreground">{dropzoneHint}</p>
        <Button
          type="button"
          variant="outline"
          onClick={handleBrowseClick}
          disabled={disabled}
        >
          {browse}
        </Button>
      </div>
    </div>
  );
}
