'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnrollmentKeyCard } from './enrollment-key-card';
import { UnitList } from './unit-list';
import { UnassignedVideosCard } from './unassigned-videos-card';
import { ModuleFormDialog } from './module-form-dialog';
import { UnitFormDialog } from './unit-form-dialog';
import { LessonFormDialog } from './lesson-form-dialog';
import { useModule, useModuleMutations } from '@/hooks';
import { useUnitMutations } from '@/hooks/use-units';
import { useLessonMutations } from '@/hooks/use-lessons';
import type { Module, Unit, Lesson } from '@/lib/rpc';
import type { ModuleStatus, LessonContentType } from '@/db/schema';

interface ModuleEditorProps {
  moduleId: string;
}

export function ModuleEditor({ moduleId }: ModuleEditorProps) {
  const t = useTranslations('teacher');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const { module, isLoading, refetch } = useModule(moduleId);
  const { updateModule, deleteModule, regenerateKey, isLoading: isModuleMutating } = useModuleMutations();
  const { createUnit, updateUnit, deleteUnit, isLoading: isUnitMutating } = useUnitMutations();
  const { createLesson, updateLesson, deleteLesson, isLoading: isLessonMutating } = useLessonMutations();

  // Module edit dialog
  const [isModuleFormOpen, setIsModuleFormOpen] = useState(false);

  // Unit dialogs
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Lesson dialogs
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const handleModuleUpdate = async (data: { title: string; description?: string; status?: ModuleStatus }) => {
    try {
      await updateModule(moduleId, data);
      setIsModuleFormOpen(false);
      await refetch();
    } catch (error) {
      console.error('Failed to update module:', error);
    }
  };

  const handleModuleDelete = async () => {
    try {
      await deleteModule(moduleId);
      router.push('/teacher');
    } catch (error) {
      console.error('Failed to delete module:', error);
    }
  };

  const handleRegenerateKey = async () => {
    try {
      await regenerateKey(moduleId);
      await refetch();
    } catch (error) {
      console.error('Failed to regenerate key:', error);
    }
  };

  // Unit handlers
  const handleAddUnit = () => {
    setEditingUnit(null);
    setIsUnitFormOpen(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setIsUnitFormOpen(true);
  };

  const handleUnitSubmit = async (data: { title: string; description?: string }) => {
    try {
      if (editingUnit) {
        await updateUnit(moduleId, editingUnit.id, data);
      } else {
        await createUnit(moduleId, data);
      }
      setIsUnitFormOpen(false);
      setEditingUnit(null);
      await refetch();
    } catch (error) {
      console.error('Failed to save unit:', error);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    try {
      await deleteUnit(moduleId, unitId);
      await refetch();
    } catch (error) {
      console.error('Failed to delete unit:', error);
    }
  };

  // Lesson handlers
  const handleAddLesson = (unitId: string) => {
    setSelectedUnitId(unitId);
    setEditingLesson(null);
    setIsLessonFormOpen(true);
  };

  const handleEditLesson = (unitId: string, lesson: Lesson) => {
    setSelectedUnitId(unitId);
    setEditingLesson(lesson);
    setIsLessonFormOpen(true);
  };

  const handleLessonSubmit = async (data: { title: string; description?: string; contentType?: LessonContentType; isFree?: boolean }) => {
    if (!selectedUnitId) return;

    try {
      if (editingLesson) {
        await updateLesson(moduleId, selectedUnitId, editingLesson.id, data);
      } else {
        await createLesson(moduleId, selectedUnitId, data);
      }
      setIsLessonFormOpen(false);
      setEditingLesson(null);
      setSelectedUnitId(null);
      await refetch();
    } catch (error) {
      console.error('Failed to save lesson:', error);
    }
  };

  const handleDeleteLesson = async (unitId: string, lessonId: string) => {
    try {
      await deleteLesson(moduleId, unitId, lessonId);
      await refetch();
    } catch (error) {
      console.error('Failed to delete lesson:', error);
    }
  };

  if (isLoading) {
    return <ModuleEditorSkeleton />;
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">{t('moduleNotFound')}</h2>
        <p className="text-muted-foreground mt-2">{t('moduleNotFoundDescription')}</p>
        <Button asChild className="mt-4">
          <Link href="/teacher">{tCommon('back')}</Link>
        </Button>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/teacher" className="text-muted-foreground hover:text-foreground">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{module.title}</h1>
            <Badge className={statusColors[module.status as keyof typeof statusColors]}>
              {t(`status.${module.status}`)}
            </Badge>
          </div>
          {module.description && (
            <p className="text-muted-foreground ml-8">{module.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsModuleFormOpen(true)}>
            {tCommon('edit')}
          </Button>
          <DeleteButton onDelete={handleModuleDelete} />
        </div>
      </div>

      {/* Enrollment Key */}
      <EnrollmentKeyCard
        enrollmentKey={module.enrollmentKey}
        onRegenerate={handleRegenerateKey}
        isLoading={isModuleMutating}
      />

      {/* Unassigned Videos */}
      <UnassignedVideosCard module={module} onVideoAssigned={refetch} />

      {/* Units and Lessons */}
      <UnitList
        units={module.units || []}
        moduleId={moduleId}
        isLoading={false}
        onAddUnit={handleAddUnit}
        onEditUnit={handleEditUnit}
        onDeleteUnit={handleDeleteUnit}
        onAddLesson={handleAddLesson}
        onEditLesson={handleEditLesson}
        onDeleteLesson={handleDeleteLesson}
      />

      {/* Dialogs */}
      <ModuleFormDialog
        open={isModuleFormOpen}
        onOpenChange={setIsModuleFormOpen}
        module={module}
        onSubmit={handleModuleUpdate}
        isLoading={isModuleMutating}
      />

      <UnitFormDialog
        open={isUnitFormOpen}
        onOpenChange={setIsUnitFormOpen}
        unit={editingUnit}
        onSubmit={handleUnitSubmit}
        isLoading={isUnitMutating}
      />

      <LessonFormDialog
        open={isLessonFormOpen}
        onOpenChange={setIsLessonFormOpen}
        lesson={editingLesson}
        onSubmit={handleLessonSubmit}
        isLoading={isLessonMutating}
      />
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const t = useTranslations('teacher');
  const tCommon = useTranslations('common');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    if (showConfirm) {
      onDelete();
    } else {
      setShowConfirm(true);
    }
  };

  return (
    <Button
      variant={showConfirm ? 'destructive' : 'outline'}
      onClick={handleClick}
      onBlur={() => setShowConfirm(false)}
    >
      {showConfirm ? t('confirmDelete') : tCommon('delete')}
    </Button>
  );
}

function ModuleEditorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded bg-muted" />
          <div className="h-9 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-4">
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
