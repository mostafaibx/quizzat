'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { EnrolledModulesList } from './enrolled-modules-list';
import { JoinModuleDialog } from './join-module-dialog';
import { useEnrollments, useEnrollmentMutations } from '@/hooks';

export function StudentDashboard() {
  const t = useTranslations('student');
  const { enrollments, isLoading, refetch } = useEnrollments({ status: 'active' });
  const { joinModule, leaveModule, isLoading: isMutating, error } = useEnrollmentMutations();

  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoin = async (enrollmentKey: string) => {
    try {
      setJoinError(null);
      await joinModule(enrollmentKey);
      setIsJoinDialogOpen(false);
      await refetch();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join module');
    }
  };

  const handleLeave = async (moduleId: string) => {
    try {
      await leaveModule(moduleId);
      await refetch();
    } catch (error) {
      console.error('Failed to leave module:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard')}</h1>
          <p className="text-muted-foreground">{t('dashboardDescription')}</p>
        </div>
        <Button onClick={() => setIsJoinDialogOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {t('joinModule')}
        </Button>
      </div>

      <EnrolledModulesList
        enrollments={enrollments}
        isLoading={isLoading}
        onLeave={handleLeave}
      />

      <JoinModuleDialog
        open={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
        onJoin={handleJoin}
        isLoading={isMutating}
        error={joinError}
      />
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
