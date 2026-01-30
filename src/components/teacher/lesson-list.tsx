'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Lesson } from '@/lib/rpc';

interface LessonListProps {
  lessons: Lesson[];
  moduleId: string;
  unitId: string;
  onAdd: () => void;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lessonId: string) => void;
}

export function LessonList({ lessons, moduleId, unitId, onAdd, onEdit, onDelete }: LessonListProps) {
  const t = useTranslations('teacher');

  const contentTypeIcons: Record<string, React.ReactNode> = {
    video: <VideoIcon className="h-4 w-4" />,
    text: <TextIcon className="h-4 w-4" />,
    quiz: <QuizIcon className="h-4 w-4" />,
    assignment: <AssignmentIcon className="h-4 w-4" />,
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{t('lessons')}</span>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          <PlusIcon className="h-4 w-4 mr-1" />
          {t('addLesson')}
        </Button>
      </div>

      {lessons.length === 0 ? (
        <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
          {t('noLessons')}
        </div>
      ) : (
        <div className="space-y-1">
          {lessons.map((lesson, index) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              index={index + 1}
              icon={contentTypeIcons[lesson.contentType]}
              moduleId={moduleId}
              unitId={unitId}
              onEdit={() => onEdit(lesson)}
              onDelete={() => onDelete(lesson.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LessonItemProps {
  lesson: Lesson;
  index: number;
  icon: React.ReactNode;
  moduleId: string;
  unitId: string;
  onEdit: () => void;
  onDelete: () => void;
}

function LessonItem({ lesson, index, icon, moduleId, unitId, onEdit, onDelete }: LessonItemProps) {
  const t = useTranslations('teacher');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit();
  };

  return (
    <Link
      href={`/teacher/modules/${moduleId}/units/${unitId}/lessons/${lesson.id}`}
      className="group flex items-center gap-3 rounded-md border bg-background p-3 hover:bg-accent/50 transition-colors"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium">
        {index}
      </span>
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{lesson.title}</p>
        {lesson.description && (
          <p className="text-sm text-muted-foreground truncate">{lesson.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {lesson.isFree && (
          <Badge variant="secondary" className="text-xs">{t('free')}</Badge>
        )}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button variant="ghost" size="icon-xs" onClick={handleEdit}>
            <EditIcon className="h-3 w-3" />
          </Button>
          <Button
            variant={showDeleteConfirm ? 'destructive' : 'ghost'}
            size="icon-xs"
            onClick={handleDelete}
            onBlur={() => setShowDeleteConfirm(false)}
          >
            <TrashIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Link>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function QuizIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AssignmentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
