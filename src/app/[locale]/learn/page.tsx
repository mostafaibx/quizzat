import { Suspense } from 'react';
import { StudentDashboard } from '@/components/student';
import { UnauthorizedAlert } from '@/components/auth';

export default function LearnPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={null}>
        <UnauthorizedAlert />
      </Suspense>
      <StudentDashboard />
    </div>
  );
}
