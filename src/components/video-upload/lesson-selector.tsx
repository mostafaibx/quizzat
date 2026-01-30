'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModules, useModule } from '@/hooks';

interface LessonSelectorProps {
  value?: string;
  onChange: (lessonId: string | undefined, moduleId?: string, unitId?: string) => void;
  onModuleChange?: (moduleId: string | undefined) => void;
  disabled?: boolean;
  moduleRequired?: boolean;
  labels?: {
    module?: string;
    modulePlaceholder?: string;
    unit?: string;
    unitPlaceholder?: string;
    lesson?: string;
    lessonPlaceholder?: string;
    optional?: string;
    required?: string;
    selectLessonHint?: string;
  };
}

export function LessonSelector({
  value,
  onChange,
  onModuleChange,
  disabled = false,
  moduleRequired = true,
  labels = {},
}: LessonSelectorProps) {
  const t = useTranslations('videos');
  const {
    module: moduleLabel = 'Module',
    modulePlaceholder = 'Select a module',
    unit: unitLabel = 'Unit',
    unitPlaceholder = 'Select a unit',
    lesson: lessonLabel = 'Lesson',
    lessonPlaceholder = 'Select a lesson',
    optional = '(optional)',
    required = '(required)',
    selectLessonHint = 'Select a unit and lesson to properly organize your video content',
  } = labels;

  const [selectedModuleId, setSelectedModuleId] = useState<string | undefined>();
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>();
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(value);

  const { modules, isLoading: isLoadingModules } = useModules();
  const { module: selectedModule, isLoading: isLoadingModule } = useModule(selectedModuleId || null);

  // Get units from selected module
  const units = selectedModule?.units || [];

  // Get lessons from selected unit
  const selectedUnit = units.find(u => u.id === selectedUnitId);
  const lessons = selectedUnit?.lessons || [];

  // Handle module change
  const handleModuleChange = (moduleId: string) => {
    if (moduleId === 'none') {
      setSelectedModuleId(undefined);
      setSelectedUnitId(undefined);
      setSelectedLessonId(undefined);
      onChange(undefined);
      onModuleChange?.(undefined);
    } else {
      setSelectedModuleId(moduleId);
      setSelectedUnitId(undefined);
      setSelectedLessonId(undefined);
      onChange(undefined, moduleId);
      onModuleChange?.(moduleId);
    }
  };

  // Handle unit change
  const handleUnitChange = (unitId: string) => {
    if (unitId === 'none') {
      setSelectedUnitId(undefined);
      setSelectedLessonId(undefined);
      onChange(undefined, selectedModuleId);
    } else {
      setSelectedUnitId(unitId);
      setSelectedLessonId(undefined);
      onChange(undefined, selectedModuleId, unitId);
    }
  };

  // Handle lesson change
  const handleLessonChange = (lessonId: string) => {
    if (lessonId === 'none') {
      setSelectedLessonId(undefined);
      onChange(undefined, selectedModuleId, selectedUnitId);
    } else {
      setSelectedLessonId(lessonId);
      onChange(lessonId, selectedModuleId, selectedUnitId);
    }
  };

  // Show suggestion when module is selected but lesson is not
  const showSuggestion = selectedModuleId && !selectedLessonId;

  return (
    <div className="space-y-4">
      {/* Module selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FolderIcon className="h-4 w-4" />
          {moduleLabel}
          <span className={moduleRequired ? "text-destructive text-xs font-medium" : "text-muted-foreground text-xs"}>
            {moduleRequired ? required : optional}
          </span>
        </Label>
        <Select
          value={selectedModuleId || 'none'}
          onValueChange={handleModuleChange}
          disabled={disabled || isLoadingModules}
        >
          <SelectTrigger className={!selectedModuleId && moduleRequired ? "border-amber-300 focus:ring-amber-300" : ""}>
            <SelectValue placeholder={modulePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {!moduleRequired && <SelectItem value="none">{modulePlaceholder}</SelectItem>}
            {modules.map((module) => (
              <SelectItem key={module.id} value={module.id}>
                {module.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unit selector - only show if module is selected */}
      {selectedModuleId && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <LayersIcon className="h-4 w-4" />
            {unitLabel}
          </Label>
          <Select
            value={selectedUnitId || 'none'}
            onValueChange={handleUnitChange}
            disabled={disabled || isLoadingModule || units.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={unitPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{unitPlaceholder}</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {units.length === 0 && !isLoadingModule && (
            <p className="text-xs text-muted-foreground">No units in this module</p>
          )}
        </div>
      )}

      {/* Lesson selector - only show if unit is selected */}
      {selectedUnitId && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <PlayIcon className="h-4 w-4" />
            {lessonLabel}
          </Label>
          <Select
            value={selectedLessonId || 'none'}
            onValueChange={handleLessonChange}
            disabled={disabled || lessons.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={lessonPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{lessonPlaceholder}</SelectItem>
              {lessons.map((lesson) => (
                <SelectItem key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {lessons.length === 0 && (
            <p className="text-xs text-muted-foreground">No lessons in this unit</p>
          )}
        </div>
      )}

      {/* Suggestion message when module selected but lesson not */}
      {showSuggestion && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-800">
          <InfoIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {selectLessonHint}
          </p>
        </div>
      )}
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
