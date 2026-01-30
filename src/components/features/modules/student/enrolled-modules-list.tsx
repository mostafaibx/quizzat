'use client';

import { useTranslations } from 'next-intl';
import { EnrolledModuleCard } from './enrolled-module-card';
import type { EnrollmentWithModule } from '@/lib/rpc';

interface EnrolledModulesListProps {
  enrollments: EnrollmentWithModule[];
  isLoading?: boolean;
  onLeave?: (moduleId: string) => void;
}

export function EnrolledModulesList({ enrollments, isLoading, onLeave }: EnrolledModulesListProps) {
  const t = useTranslations('student');

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <EnrolledModuleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <BookIcon className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">{t('noEnrollments')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('noEnrollmentsDescription')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {enrollments.map((enrollment) => (
        <EnrolledModuleCard
          key={enrollment.id}
          enrollment={enrollment}
          onLeave={onLeave}
        />
      ))}
    </div>
  );
}

function EnrolledModuleCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-2 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
