"use client";

import { useState } from 'react';
import { FileText, Eye, Globe, Lock, Users, Upload, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LessonSelector } from './lesson-selector';
import type { VideoMetadata, VideoVisibility } from './types';

interface VideoUploadFormProps {
  onSubmit: (metadata: VideoMetadata) => void;
  disabled?: boolean;
  className?: string;
  showLessonSelector?: boolean;
  labels?: {
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
}

const visibilityOptions: {
  value: VideoVisibility;
  icon: React.ElementType;
}[] = [
  { value: 'private', icon: Lock },
  { value: 'unlisted', icon: Users },
  { value: 'public', icon: Globe },
];

export function VideoUploadForm({
  onSubmit,
  disabled = false,
  className,
  showLessonSelector = false,
  labels = {},
}: VideoUploadFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('private');
  const [lessonId, setLessonId] = useState<string | undefined>();
  const [availableDays, setAvailableDays] = useState<number>(3);

  const {
    title: titleLabel = 'Title',
    titlePlaceholder = 'Enter video title',
    description: descriptionLabel = 'Description',
    descriptionPlaceholder = 'Add a description for your video (optional)',
    visibility: visibilityLabel = 'Visibility',
    visibilityPrivate = 'Private',
    visibilityPrivateDesc = 'Only you can view',
    visibilityUnlisted = 'Unlisted',
    visibilityUnlistedDesc = 'Anyone with the link can view',
    visibilityPublic = 'Public',
    visibilityPublicDesc = 'Everyone can view',
    upload = 'Upload video',
    uploading = 'Uploading...',
    assignToLesson = 'Assign to Lesson',
    availableDays: availableDaysLabel = 'Availability Period',
    availableDaysHint = 'Number of days students can access this video',
    module: moduleLabel = 'Module',
    modulePlaceholder = 'Select a module',
    unit: unitLabel = 'Unit',
    unitPlaceholder = 'Select a unit',
    lesson: lessonLabel = 'Lesson',
    lessonPlaceholder = 'Select a lesson',
    optional = '(optional)',
  } = labels;

  const visibilityLabels: Record<VideoVisibility, { label: string; desc: string }> = {
    private: { label: visibilityPrivate, desc: visibilityPrivateDesc },
    unlisted: { label: visibilityUnlisted, desc: visibilityUnlistedDesc },
    public: { label: visibilityPublic, desc: visibilityPublicDesc },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      visibility,
      lessonId,
      availableDays: lessonId ? availableDays : undefined,
    });
  };

  const handleLessonChange = (newLessonId: string | undefined) => {
    setLessonId(newLessonId);
  };

  const isValid = title.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="video-title" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {titleLabel}
        </Label>
        <Input
          id="video-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
          disabled={disabled}
          maxLength={200}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="video-description">{descriptionLabel}</Label>
        <Textarea
          id="video-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={descriptionPlaceholder}
          disabled={disabled}
          maxLength={2000}
          rows={3}
        />
      </div>

      {/* Lesson Assignment - only show for teachers */}
      {showLessonSelector && (
        <div className="space-y-4 rounded-lg border p-4">
          <Label className="text-base font-semibold">{assignToLesson}</Label>
          <LessonSelector
            value={lessonId}
            onChange={handleLessonChange}
            disabled={disabled}
            labels={{
              module: moduleLabel,
              modulePlaceholder,
              unit: unitLabel,
              unitPlaceholder,
              lesson: lessonLabel,
              lessonPlaceholder,
              optional,
            }}
          />

          {/* Availability Days - only show if lesson is selected */}
          {lessonId && (
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="available-days" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {availableDaysLabel}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="available-days"
                  type="number"
                  min={1}
                  max={365}
                  value={availableDays}
                  onChange={(e) => setAvailableDays(parseInt(e.target.value) || 3)}
                  disabled={disabled}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground">{availableDaysHint}</p>
            </div>
          )}
        </div>
      )}

      {/* Visibility */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          {visibilityLabel}
        </Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {visibilityOptions.map(({ value, icon: Icon }) => {
            const { label, desc } = visibilityLabels[value];
            const isSelected = visibility === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                disabled={disabled}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-start transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-50",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-input"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={disabled || !isValid}>
        {disabled ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {uploading}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {upload}
          </>
        )}
      </Button>
    </form>
  );
}
