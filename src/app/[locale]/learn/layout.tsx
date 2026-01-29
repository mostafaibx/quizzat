import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth-server';

interface LearnLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LearnLayout({ children, params }: LearnLayoutProps) {
  const { locale } = await params;
  const session = await getAuthSession();

  // Redirect to sign in if not authenticated
  if (!session?.user) {
    redirect(`/${locale}/auth/signin`);
  }

  // All authenticated users can access learn area
  // Students use it for learning, teachers/admins can preview student experience
  return <>{children}</>;
}
