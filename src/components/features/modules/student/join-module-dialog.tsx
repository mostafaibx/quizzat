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
import { Alert } from '@/components/ui/alert';

interface JoinModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (enrollmentKey: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function JoinModuleDialog({
  open,
  onOpenChange,
  onJoin,
  isLoading,
  error,
}: JoinModuleDialogProps) {
  const t = useTranslations('student');
  const tCommon = useTranslations('common');
  const [enrollmentKey, setEnrollmentKey] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentKey.trim()) return;
    await onJoin(enrollmentKey.trim().toUpperCase());
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEnrollmentKey('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('joinModule')}</DialogTitle>
            <DialogDescription>{t('joinModuleDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="enrollment-key">{t('enrollmentKey')}</Label>
              <Input
                id="enrollment-key"
                value={enrollmentKey}
                onChange={(e) => setEnrollmentKey(e.target.value.toUpperCase())}
                placeholder={t('enrollmentKeyPlaceholder')}
                className="font-mono uppercase"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || !enrollmentKey.trim()}>
              {isLoading ? t('joining') : t('join')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
