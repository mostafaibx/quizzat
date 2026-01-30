import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth-server';
import { AUTH_ROLES, ROLE_HIERARCHY } from '@/types/auth.types';
import type { UserRole } from '@/types/auth.types';
import { TeacherLayout } from '@/components/features/layout/teacher';
import { UnauthorizedAlert } from '@/components/features/auth';

interface TeacherRootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function TeacherRootLayout({ children, params }: TeacherRootLayoutProps) {
  const { locale } = await params;
  const session = await getAuthSession();

  // Redirect to sign in if not authenticated
  if (!session?.user) {
    redirect(`/${locale}/auth/signin`);
  }

  const userRole = (session.user.role as UserRole) || AUTH_ROLES.STUDENT;
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[AUTH_ROLES.TEACHER];

  // Redirect students to learn page - they don't have access to teacher area
  if (userLevel < requiredLevel) {
    redirect(`/${locale}/learn?error=unauthorized`);
  }

  return (
    <TeacherLayout>
      <Suspense fallback={null}>
        <UnauthorizedAlert />
      </Suspense>
      {children}
    </TeacherLayout>
  );
}
