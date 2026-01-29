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
import type { Unit } from '@/lib/rpc';

interface UnitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: Unit | null;
  onSubmit: (data: { title: string; description?: string }) => Promise<void>;
  isLoading?: boolean;
}

interface UnitFormContentProps {
  unit?: Unit | null;
  onSubmit: (data: { title: string; description?: string }) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

function UnitFormContent({ unit, onSubmit, onOpenChange, isLoading }: UnitFormContentProps) {
  const t = useTranslations('teacher');
  const tCommon = useTranslations('common');

  const [title, setTitle] = useState(unit?.title ?? '');
  const [description, setDescription] = useState(unit?.description ?? '');

  const isEditing = !!unit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ title, description: description || undefined });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? t('editUnit') : t('addUnit')}
        </DialogTitle>
        <DialogDescription>
          {isEditing ? t('editUnitDescription') : t('addUnitDescription')}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="unit-title">{t('unitTitle')}</Label>
          <Input
            id="unit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('unitTitlePlaceholder')}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="unit-description">{t('unitDescription')}</Label>
          <Textarea
            id="unit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('unitDescriptionPlaceholder')}
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? tCommon('loading') : isEditing ? tCommon('save') : t('addUnit')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function UnitFormDialog({
  open,
  onOpenChange,
  unit,
  onSubmit,
  isLoading,
}: UnitFormDialogProps) {
  // Use key to reset form state when unit changes or dialog opens
  const formKey = `${unit?.id ?? 'new'}-${open}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <UnitFormContent
          key={formKey}
          unit={unit}
          onSubmit={onSubmit}
          onOpenChange={onOpenChange}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
