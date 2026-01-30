'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LessonList } from '@/components/features/lessons/teacher/lesson-list';
import type { Unit, Lesson } from '@/lib/rpc';

interface UnitWithLessons extends Unit {
  lessons?: Lesson[];
}

interface UnitListProps {
  units: UnitWithLessons[];
  moduleId: string;
  isLoading?: boolean;
  onAddUnit: () => void;
  onEditUnit: (unit: Unit) => void;
  onDeleteUnit: (unitId: string) => void;
  onAddLesson: (unitId: string) => void;
  onEditLesson: (unitId: string, lesson: Lesson) => void;
  onDeleteLesson: (unitId: string, lessonId: string) => void;
}

export function UnitList({
  units,
  moduleId,
  isLoading,
  onAddUnit,
  onEditUnit,
  onDeleteUnit,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}: UnitListProps) {
  const t = useTranslations('teacher');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <UnitSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('units')}</h3>
        <Button onClick={onAddUnit} size="sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          {t('addUnit')}
        </Button>
      </div>

      {units.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FolderIcon className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t('noUnits')}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onAddUnit}>
            {t('addFirstUnit')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {units.map((unit, index) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              index={index + 1}
              moduleId={moduleId}
              onEdit={() => onEditUnit(unit)}
              onDelete={() => onDeleteUnit(unit.id)}
              onAddLesson={() => onAddLesson(unit.id)}
              onEditLesson={(lesson) => onEditLesson(unit.id, lesson)}
              onDeleteLesson={(lessonId) => onDeleteLesson(unit.id, lessonId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface UnitCardProps {
  unit: UnitWithLessons;
  index: number;
  moduleId: string;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
}

function UnitCard({
  unit,
  index,
  moduleId,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}: UnitCardProps) {
  const t = useTranslations('teacher');
  const tCommon = useTranslations('common');
  const [expanded, setExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {index}
            </span>
            <div>
              <CardTitle className="text-base">{unit.title}</CardTitle>
              {unit.description && (
                <p className="text-sm text-muted-foreground">{unit.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              {tCommon('edit')}
            </Button>
            <Button
              variant={showDeleteConfirm ? 'destructive' : 'ghost'}
              size="sm"
              onClick={handleDelete}
              onBlur={() => setShowDeleteConfirm(false)}
            >
              {showDeleteConfirm ? t('confirmDelete') : tCommon('delete')}
            </Button>
            <ChevronIcon className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <LessonList
            lessons={unit.lessons || []}
            moduleId={moduleId}
            unitId={unit.id}
            onAdd={onAddLesson}
            onEdit={onEditLesson}
            onDelete={onDeleteLesson}
          />
        </CardContent>
      )}
    </Card>
  );
}

function UnitSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
