'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EnrolledModulesList } from '@/components/features/modules/student/enrolled-modules-list';
import { JoinModuleDialog } from '@/components/features/modules/student/join-module-dialog';
import { useEnrollments, useEnrollmentMutations } from '@/hooks';
import { toast } from 'sonner';

export function StudentDashboard() {
  const t = useTranslations('student');
  const { enrollments, isLoading, refetch } = useEnrollments({ status: 'active' });
  const { joinModule, leaveModule, isLoading: isMutating } = useEnrollmentMutations();

  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoin = async (enrollmentKey: string) => {
    try {
      setJoinError(null);
      await joinModule(enrollmentKey);
      toast.success(t('moduleJoined') || 'Successfully joined module!');
      setIsJoinDialogOpen(false);
      await refetch();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to join module';
      setJoinError(error);
      toast.error(error);
    }
  };

  const handleLeave = async (moduleId: string) => {
    try {
      await leaveModule(moduleId);
      toast.success(t('moduleLeft') || 'Left module successfully');
      await refetch();
    } catch (error) {
      console.error('Failed to leave module:', error);
      toast.error(t('moduleLeaveError') || 'Failed to leave module');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1">{t('dashboardDescription')}</p>
        </div>
        <Button onClick={() => setIsJoinDialogOpen(true)} size="default" className="gap-2">
          <Plus className="h-4 w-4" />
          {t('joinModule')}
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : enrollments.length === 0 ? (
        <EmptyState onJoinModule={() => setIsJoinDialogOpen(true)} />
      ) : (
        <EnrolledModulesList
          enrollments={enrollments}
          isLoading={isLoading}
          onLeave={handleLeave}
        />
      )}

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

function EmptyState({ onJoinModule }: { onJoinModule: () => void }) {
  const t = useTranslations('student');

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <BookOpen className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{t('noModulesEnrolled') || 'No modules yet'}</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          {t('noModulesEnrolledDescription') || 'Join your first module using an enrollment key from your teacher to start learning.'}
        </p>
        <Button onClick={onJoinModule} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          {t('joinFirstModule') || 'Join Your First Module'}
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-32 bg-gradient-to-br from-muted via-muted to-muted/50 animate-pulse" />
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-5 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 bg-muted rounded flex-1 animate-pulse" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
