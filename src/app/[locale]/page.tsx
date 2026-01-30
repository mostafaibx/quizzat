import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAuthSession } from "@/lib/auth-server";
import { AUTH_ROLES } from "@/types/auth.types";
import type { UserRole } from "@/types/auth.types";

interface HomeProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  const t = await getTranslations("landing");
  
  // Check if user is already logged in
  const session = await getAuthSession();
  
  if (session?.user) {
    // Redirect to appropriate dashboard based on role
    const userRole = (session.user.role as UserRole) || AUTH_ROLES.STUDENT;
    
    if (userRole === AUTH_ROLES.ADMIN || userRole === AUTH_ROLES.TEACHER) {
      redirect(`/${locale}/teacher`);
    } else {
      redirect(`/${locale}/learn`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {t("heroTitle")}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          {t("heroDescription")}
        </p>
        <div className="flex gap-4">
          <Link
            href={`/${locale}/auth/signin`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("signIn")}
          </Link>
          <Link
            href={`/${locale}/auth/signup`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t("getStarted")}
          </Link>
        </div>
      </main>
    </div>
  );
}
