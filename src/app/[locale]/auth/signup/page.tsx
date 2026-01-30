import { redirect } from 'next/navigation';
import { Suspense } from "react";
import { getAuthSession } from '@/lib/auth-server';
import { AUTH_ROLES } from '@/types/auth.types';
import type { UserRole } from '@/types/auth.types';
import { SignUpFormComponent } from './signup-form';
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from 'next-intl/server';

interface SignUpPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function SignUpPage({ params, searchParams }: SignUpPageProps) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;
  
  // Check if user is already logged in
  const session = await getAuthSession();
  
  if (session?.user) {
    // Redirect to appropriate dashboard based on role
    const userRole = (session.user.role as UserRole) || AUTH_ROLES.STUDENT;
    
    // If there's a callback URL, use it
    if (callbackUrl) {
      redirect(callbackUrl);
    }
    
    // Otherwise redirect based on role
    if (userRole === AUTH_ROLES.ADMIN || userRole === AUTH_ROLES.TEACHER) {
      redirect(`/${locale}/teacher`);
    } else {
      redirect(`/${locale}/learn`);
    }
  }

  const t = await getTranslations('common');

  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">{t('loading')}</div>
          </CardContent>
        </Card>
      </div>
    }>
      <SignUpFormComponent locale={locale} callbackUrl={callbackUrl} />
    </Suspense>
  );
}
