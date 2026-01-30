'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { EnrollmentWithModule } from '@/lib/rpc';

interface EnrolledModuleCardProps {
  enrollment: EnrollmentWithModule;
  onLeave?: (moduleId: string) => void;
}

export function EnrolledModuleCard({ enrollment, onLeave }: EnrolledModuleCardProps) {
  const t = useTranslations('student');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const enrolledModule = enrollment.module;

  const handleLeave = () => {
    if (showLeaveConfirm) {
      onLeave?.(enrolledModule.id);
      setShowLeaveConfirm(false);
    } else {
      setShowLeaveConfirm(true);
    }
  };

  // Mock progress - in real implementation, this would come from the enrollment data
  const progress = 0;

  return (
    <Card className="relative overflow-hidden">
      {enrolledModule.coverImage && (
        <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${enrolledModule.coverImage})` }} />
      )}
      <CardHeader>
        <CardTitle className="line-clamp-2">{enrolledModule.title}</CardTitle>
        {enrolledModule.description && (
          <CardDescription className="line-clamp-2">{enrolledModule.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('progress')}</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button asChild className="flex-1">
          <Link href={`/learn/${enrolledModule.id}`}>
            {progress > 0 ? t('continueLesson') : t('startLesson')}
          </Link>
        </Button>
        {onLeave && (
          <Button
            variant={showLeaveConfirm ? 'destructive' : 'outline'}
            size="icon"
            onClick={handleLeave}
            onBlur={() => setShowLeaveConfirm(false)}
            title={showLeaveConfirm ? t('confirmLeave') : t('leaveModule')}
          >
            {showLeaveConfirm ? <CheckIcon className="h-4 w-4" /> : <LeaveIcon className="h-4 w-4" />}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function LeaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
