'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Lesson } from '@/lib/rpc';
import type { LessonContentType } from '@/db/schema';

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: Lesson | null;
  onSubmit: (data: { title: string; description?: string; contentType?: LessonContentType; isFree?: boolean }) => Promise<void>;
  isLoading?: boolean;
}

interface LessonFormContentProps {
  lesson?: Lesson | null;
  onSubmit: (data: { title: string; description?: string; contentType?: LessonContentType; isFree?: boolean }) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

function LessonFormContent({ lesson, onSubmit, onOpenChange, isLoading }: LessonFormContentProps) {
  const t = useTranslations('teacher');
  const tCommon = useTranslations('common');

  const [title, setTitle] = useState(lesson?.title ?? '');
  const [description, setDescription] = useState(lesson?.description ?? '');
  const [contentType, setContentType] = useState<LessonContentType>((lesson?.contentType as LessonContentType) ?? 'video');
  const [isFree, setIsFree] = useState(lesson?.isFree ?? false);

  const isEditing = !!lesson;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ title, description: description || undefined, contentType, isFree });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? t('editLesson') : t('addLesson')}
        </DialogTitle>
        <DialogDescription>
          {isEditing ? t('editLessonDescription') : t('addLessonDescription')}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="lesson-title">{t('lessonTitle')}</Label>
          <Input
            id="lesson-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('lessonTitlePlaceholder')}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lesson-description">{t('lessonDescription')}</Label>
          <Textarea
            id="lesson-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('lessonDescriptionPlaceholder')}
            rows={2}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="content-type">{t('contentType')}</Label>
          <Select value={contentType} onValueChange={(value) => setContentType(value as LessonContentType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">{t('contentTypes.video')}</SelectItem>
              <SelectItem value="text">{t('contentTypes.text')}</SelectItem>
              <SelectItem value="quiz">{t('contentTypes.quiz')}</SelectItem>
              <SelectItem value="assignment">{t('contentTypes.assignment')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is-free"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="is-free" className="font-normal cursor-pointer">
            {t('markAsFree')}
          </Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? tCommon('loading') : isEditing ? tCommon('save') : t('addLesson')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function LessonFormDialog({
  open,
  onOpenChange,
  lesson,
  onSubmit,
  isLoading,
}: LessonFormDialogProps) {
  // Use key to reset form state when lesson changes or dialog opens
  const formKey = `${lesson?.id ?? 'new'}-${open}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <LessonFormContent
          key={formKey}
          lesson={lesson}
          onSubmit={onSubmit}
          onOpenChange={onOpenChange}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
