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
import type { Module } from '@/lib/rpc';
import type { ModuleStatus } from '@/db/schema';

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: Module | null;
  onSubmit: (data: { title: string; description?: string; status?: ModuleStatus }) => Promise<void>;
  isLoading?: boolean;
}

interface ModuleFormContentProps {
  module?: Module | null;
  onSubmit: (data: { title: string; description?: string; status?: ModuleStatus }) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

function ModuleFormContent({ module, onSubmit, onOpenChange, isLoading }: ModuleFormContentProps) {
  const t = useTranslations('teacher');
  const tCommon = useTranslations('common');

  const [title, setTitle] = useState(module?.title ?? '');
  const [description, setDescription] = useState(module?.description ?? '');
  const [status, setStatus] = useState<ModuleStatus>((module?.status as ModuleStatus) ?? 'draft');

  const isEditing = !!module;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ title, description: description || undefined, status });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? t('editModule') : t('createModule')}
        </DialogTitle>
        <DialogDescription>
          {isEditing ? t('editModuleDescription') : t('createModuleDescription')}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">{t('moduleTitle')}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('moduleTitlePlaceholder')}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">{t('moduleDescription')}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('moduleDescriptionPlaceholder')}
            rows={3}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">{t('moduleStatus')}</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as ModuleStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('status.draft')}</SelectItem>
              <SelectItem value="published">{t('status.published')}</SelectItem>
              <SelectItem value="archived">{t('status.archived')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? tCommon('loading') : isEditing ? tCommon('save') : t('createModule')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ModuleFormDialog({
  open,
  onOpenChange,
  module,
  onSubmit,
  isLoading,
}: ModuleFormDialogProps) {
  // Use key to reset form state when module changes or dialog opens
  const formKey = `${module?.id ?? 'new'}-${open}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <ModuleFormContent
          key={formKey}
          module={module}
          onSubmit={onSubmit}
          onOpenChange={onOpenChange}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
