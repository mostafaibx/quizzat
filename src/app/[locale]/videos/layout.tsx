import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth-server';

interface VideosLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function VideosLayout({ children, params }: VideosLayoutProps) {
  const { locale } = await params;
  const session = await getAuthSession();

  // Redirect to sign in if not authenticated
  if (!session?.user) {
    redirect(`/${locale}/auth/signin`);
  }

  // All authenticated users can view videos
  // Upload access is controlled separately in /videos/upload/layout.tsx
  return <>{children}</>;
}
