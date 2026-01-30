"use client";

import { useState, useEffect, useRef } from 'react';
import { FileText, Eye, Globe, Lock, Users, Upload, Loader2, Clock, Settings2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LessonSelector } from './lesson-selector';
import { VIDEO_QUALITY, VIDEO_QUALITY_LABELS, type VideoQuality } from '@/types/encoding.types';
import type { VideoMetadata, VideoVisibility } from './types';

/**
 * Extracts a clean title from a file name by removing the extension
 * and replacing common separators with spaces
 */
function getCleanTitleFromFileName(fileName: string): string {
  // Remove file extension
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
  // Replace common separators with spaces
  const cleanName = nameWithoutExt.replace(/[-_]/g, ' ');
  // Capitalize first letter
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
}

interface VideoUploadFormProps {
  onSubmit: (metadata: VideoMetadata) => void;
  disabled?: boolean;
  className?: string;
  showLessonSelector?: boolean;
  /** The original file name to use as default title */
  fileName?: string;
  /** Whether module selection is required */
  moduleRequired?: boolean;
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
    availableDays?: string;
    availableDaysHint?: string;
    module?: string;
    modulePlaceholder?: string;
    unit?: string;
    unitPlaceholder?: string;
    lesson?: string;
    lessonPlaceholder?: string;
    optional?: string;
    encodingOptions?: string;
    qualities?: string;
    qualitiesHint?: string;
    useAI?: string;
    useAIHint?: string;
    stepDetails?: string;
    stepOrganization?: string;
    stepSettings?: string;
    titleAutoFilled?: string;
    moduleRequiredError?: string;
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
  showLessonSelector = true, // Module is always required, so show selector by default
  fileName,
  moduleRequired = true,
  labels = {},
}: VideoUploadFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('private');
  const [moduleId, setModuleId] = useState<string | undefined>();
  const [unitId, setUnitId] = useState<string | undefined>();
  const [lessonId, setLessonId] = useState<string | undefined>();
  const [availableDays, setAvailableDays] = useState<number>(3);
  const [qualities, setQualities] = useState<VideoQuality[]>([...VIDEO_QUALITY]); // All selected by default
  const [useAI, setUseAI] = useState<boolean>(true); // AI enabled by default

  // Track whether user has manually edited the title
  const hasUserEditedTitle = useRef(false);

  // Auto-fill title from file name when file changes, unless user has edited it
  useEffect(() => {
    if (fileName && !hasUserEditedTitle.current) {
      setTitle(getCleanTitleFromFileName(fileName));
    }
  }, [fileName]);

  // Handle title change and track if user has manually edited
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    hasUserEditedTitle.current = true;
    setTitle(e.target.value);
  };

  // Handle module change from LessonSelector
  const handleModuleChange = (newModuleId: string | undefined) => {
    setModuleId(newModuleId);
  };

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
    availableDays: availableDaysLabel = 'Availability Period',
    availableDaysHint = 'Number of days students can access this video',
    module: moduleLabel = 'Module',
    modulePlaceholder = 'Select a module',
    unit: unitLabel = 'Unit',
    unitPlaceholder = 'Select a unit',
    lesson: lessonLabel = 'Lesson',
    lessonPlaceholder = 'Select a lesson',
    optional = '(optional)',
    encodingOptions: encodingOptionsLabel = 'Encoding Options',
    qualities: qualitiesLabel = 'Video Qualities',
    qualitiesHint = 'Select which quality versions to generate',
    useAI: useAILabel = 'Use AI Features',
    useAIHint = 'Extract audio for automatic transcription and subtitles',
    stepDetails = 'Video Details',
    stepOrganization = 'Organization',
    stepSettings = 'Settings',
    titleAutoFilled = 'Title set from file name',
    moduleRequiredError = 'Please select a module to continue',
  } = labels;

  const visibilityLabels: Record<VideoVisibility, { label: string; desc: string }> = {
    private: { label: visibilityPrivate, desc: visibilityPrivateDesc },
    unlisted: { label: visibilityUnlisted, desc: visibilityUnlistedDesc },
    public: { label: visibilityPublic, desc: visibilityPublicDesc },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate: title required, qualities required, module required
    if (!title.trim() || qualities.length === 0) return;
    if (!moduleId) return; // Module is always required

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      visibility,
      moduleId, // Required: video belongs to a module
      unitId,
      lessonId,
      availableDays: lessonId ? availableDays : undefined,
      qualities,
      useAI,
    });
  };

  const toggleQuality = (quality: VideoQuality) => {
    setQualities((prev) => {
      if (prev.includes(quality)) {
        // Don't allow removing the last quality
        if (prev.length === 1) return prev;
        return prev.filter((q) => q !== quality);
      }
      return [...prev, quality];
    });
  };

  const handleLessonChange = (newLessonId: string | undefined, _moduleId?: string, newUnitId?: string) => {
    setLessonId(newLessonId);
    setUnitId(newUnitId);
  };

  // Module is always required for uploads
  const isValid = title.trim().length > 0 && qualities.length > 0 && !!moduleId;

  // Check if title was auto-filled and not edited
  const showAutoFillIndicator = fileName && !hasUserEditedTitle.current && title === getCleanTitleFromFileName(fileName);

  // Show module required error (module is always required)
  const showModuleError = !moduleId;

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-8", className)}>
      {/* Section 1: Video Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            1
          </div>
          <h3 className="font-semibold text-base">{stepDetails}</h3>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="video-title" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {titleLabel}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="video-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder={titlePlaceholder}
            disabled={disabled}
            maxLength={200}
            required
            className={cn(
              "text-base",
              showAutoFillIndicator && "border-green-300 focus:ring-green-300"
            )}
          />
          {showAutoFillIndicator && (
            <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              {titleAutoFilled}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="video-description" className="flex items-center gap-2">
            {descriptionLabel}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Textarea
            id="video-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={descriptionPlaceholder}
            disabled={disabled}
            maxLength={2000}
            rows={3}
            className="text-base"
          />
        </div>
      </div>

      {/* Section 2: Organization - only show for teachers */}
      {showLessonSelector && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
              moduleId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              2
            </div>
            <h3 className="font-semibold text-base">{stepOrganization}</h3>
            {moduleRequired && (
              <span className="text-destructive text-xs font-medium">*</span>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <LessonSelector
              value={lessonId}
              onChange={handleLessonChange}
              onModuleChange={handleModuleChange}
              disabled={disabled}
              moduleRequired={moduleRequired}
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

            {/* Module required error message */}
            {showModuleError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {moduleRequiredError}
              </div>
            )}

            {/* Availability Days - only show if lesson is selected */}
            {lessonId && (
              <div className="space-y-2 pt-4 border-t">
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
        </div>
      )}

      {/* Section 3: Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {showLessonSelector ? '3' : '2'}
          </div>
          <h3 className="font-semibold text-base">{stepSettings}</h3>
        </div>

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
                    "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-start transition-all",
                    "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:pointer-events-none disabled:opacity-50",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
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
                  <span className="text-xs text-muted-foreground leading-relaxed">{desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Encoding Options */}
        <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="h-4 w-4" />
            {encodingOptionsLabel}
          </Label>

        {/* Quality Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{qualitiesLabel}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {VIDEO_QUALITY.map((quality) => {
              const isSelected = qualities.includes(quality);
              const label = VIDEO_QUALITY_LABELS[quality];
              const isHD = quality === '1080p';
              return (
                <button
                  key={quality}
                  type="button"
                  onClick={() => toggleQuality(quality)}
                  disabled={disabled}
                  className={cn(
                    "relative rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:pointer-events-none disabled:opacity-50",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:border-primary/50"
                  )}
                >
                  <span className="flex items-center justify-center gap-1">
                    {label}
                    {isHD && isSelected && (
                      <span className="text-[10px] bg-primary-foreground/20 px-1 rounded">HD</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{qualitiesHint}</p>
        </div>

          {/* AI Toggle */}
          <div className="space-y-2 border-t pt-4">
            <button
              type="button"
              onClick={() => setUseAI(!useAI)}
              disabled={disabled}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border p-3 transition-colors bg-background",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                useAI
                  ? "border-primary bg-primary/5"
                  : "border-input"
              )}
            >
              <div className="flex items-center gap-3">
                <Sparkles className={cn("h-5 w-5", useAI ? "text-primary" : "text-muted-foreground")} />
                <div className="text-start">
                  <span className="font-medium">{useAILabel}</span>
                  <p className="text-xs text-muted-foreground">{useAIHint}</p>
                </div>
              </div>
              <div
                className={cn(
                  "h-6 w-11 rounded-full transition-colors",
                  useAI ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5",
                    useAI ? "translate-x-5 ml-0.5" : "translate-x-0.5"
                  )}
                />
              </div>
            </button>
          </div>
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
