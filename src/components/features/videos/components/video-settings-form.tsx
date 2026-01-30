'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Eye,
  Globe,
  Lock,
  Users,
  Clock,
  FolderOpen,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LessonSelector } from '@/components/features/lessons/components/lesson-selector';
import type { VideoVisibility } from '@/types/video.types';
import type { VideoSettingsFormProps, VideoSettingsData, VideoSettingsLabels } from '@/components/features/videos/types';

const DEFAULT_LABELS: Required<VideoSettingsLabels> = {
  dialogTitle: 'Video Settings',
  dialogDescription: 'Update your video details and organization',
  titleLabel: 'Title',
  titlePlaceholder: 'Enter video title',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'Add a description for your video (optional)',
  visibilityLabel: 'Visibility',
  visibilityPrivate: 'Private',
  visibilityPrivateDesc: 'Only you can view',
  visibilityUnlisted: 'Unlisted',
  visibilityUnlistedDesc: 'Anyone with the link',
  visibilityPublic: 'Public',
  visibilityPublicDesc: 'Everyone can view',
  assignmentLabel: 'Lesson Assignment',
  assignmentHint: 'Organize this video by assigning it to a lesson',
  availableDaysLabel: 'Availability Period',
  availableDaysHint: 'Number of days students can access this video',
  moduleLabel: 'Module',
  modulePlaceholder: 'Select a module',
  unitLabel: 'Unit',
  unitPlaceholder: 'Select a unit',
  lessonLabel: 'Lesson',
  lessonPlaceholder: 'Select a lesson',
  unassignLabel: 'Unassigned',
  cancel: 'Cancel',
  save: 'Save Changes',
  saving: 'Saving...',
};

const visibilityOptions: {
  value: VideoVisibility;
  icon: React.ElementType;
}[] = [
  { value: 'private', icon: Lock },
  { value: 'unlisted', icon: Users },
  { value: 'public', icon: Globe },
];

export function VideoSettingsForm({
  video,
  onSubmit,
  onCancel,
  isLoading = false,
  labels: customLabels = {},
}: VideoSettingsFormProps) {
  const labels = { ...DEFAULT_LABELS, ...customLabels };

  // Form state
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? '');
  const [visibility, setVisibility] = useState<VideoVisibility>(
    (video.visibility as VideoVisibility) ?? 'private'
  );
  const [lessonId, setLessonId] = useState<string | null>(video.lessonId ?? null);
  const [availableDays, setAvailableDays] = useState(video.availableDays ?? 3);

  // Track if form has changes
  const [hasChanges, setHasChanges] = useState(false);

  // Check for changes when form values update
  useEffect(() => {
    const changed =
      title !== video.title ||
      description !== (video.description ?? '') ||
      visibility !== (video.visibility ?? 'private') ||
      lessonId !== (video.lessonId ?? null) ||
      availableDays !== (video.availableDays ?? 3);
    setHasChanges(changed);
  }, [title, description, visibility, lessonId, availableDays, video]);

  const visibilityLabels: Record<VideoVisibility, { label: string; desc: string }> = {
    private: { label: labels.visibilityPrivate, desc: labels.visibilityPrivateDesc },
    unlisted: { label: labels.visibilityUnlisted, desc: labels.visibilityUnlistedDesc },
    public: { label: labels.visibilityPublic, desc: labels.visibilityPublicDesc },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data: VideoSettingsData = {
      title: title.trim(),
      description: description.trim() || undefined,
      visibility,
      lessonId,
      availableDays,
    };

    await onSubmit(data);
  };

  const handleLessonChange = (
    newLessonId: string | undefined,
    _moduleId?: string,
    _unitId?: string
  ) => {
    setLessonId(newLessonId ?? null);
  };

  const isValid = title.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Details</span>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="video-title" className="flex items-center gap-1">
              {labels.titleLabel}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="video-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={labels.titlePlaceholder}
              disabled={isLoading}
              maxLength={200}
              required
              className="text-base"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="video-description">{labels.descriptionLabel}</Label>
            <Textarea
              id="video-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={labels.descriptionPlaceholder}
              disabled={isLoading}
              maxLength={2000}
              rows={3}
              className="text-base resize-none"
            />
          </div>
        </div>
      </div>

      {/* Visibility Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>{labels.visibilityLabel}</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {visibilityOptions.map(({ value, icon: Icon }) => {
            const { label, desc } = visibilityLabels[value];
            const isSelected = visibility === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                disabled={isLoading}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-start transition-all",
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
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lesson Assignment Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FolderOpen className="h-4 w-4" />
          <span>{labels.assignmentLabel}</span>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <p className="text-sm text-muted-foreground">{labels.assignmentHint}</p>

          <LessonSelector
            value={lessonId ?? undefined}
            onChange={handleLessonChange}
            disabled={isLoading}
            moduleRequired={false}
            labels={{
              module: labels.moduleLabel,
              modulePlaceholder: labels.modulePlaceholder,
              unit: labels.unitLabel,
              unitPlaceholder: labels.unitPlaceholder,
              lesson: labels.lessonLabel,
              lessonPlaceholder: labels.lessonPlaceholder,
            }}
          />

          {/* Unassign button when lesson is assigned */}
          {lessonId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLessonId(null)}
              disabled={isLoading}
              className="text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              {labels.unassignLabel}
            </Button>
          )}

          {/* Availability Days - only show if lesson is assigned */}
          {lessonId && (
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="available-days" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {labels.availableDaysLabel}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="available-days"
                  type="number"
                  min={1}
                  max={365}
                  value={availableDays}
                  onChange={(e) => setAvailableDays(parseInt(e.target.value) || 3)}
                  disabled={isLoading}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground">{labels.availableDaysHint}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-2 pt-4 border-t sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {labels.cancel}
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !isValid || !hasChanges}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {labels.saving}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {labels.save}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
