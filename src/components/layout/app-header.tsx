'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { locales, localeNames, type Locale } from '@/i18n/config';

export function AppHeader() {
  const t = useTranslations('common');
  const tNav = useTranslations('navigation');
  const { data: session, status } = useSession();
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const switchLocale = (newLocale: Locale) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  };

  const otherLocale = locales.find(l => l !== locale) as Locale;

  const userInitials = session?.user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background shadow-sm">
      {/* Main Header - Taller for better accessibility */}
      <div className="container flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo - Larger and clearer */}
        <Link
          href="/"
          className="flex items-center gap-3 font-bold text-xl hover:opacity-80 transition-opacity"
        >
          <span className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1 text-base font-bold">
            Q
          </span>
          <span className="hidden sm:inline">{t('appName')}</span>
        </Link>

        {/* Desktop Navigation - Larger touch targets */}
        <nav className="hidden md:flex items-center gap-2">
          {/* Language Switcher - Always visible with text */}
          <Button
            variant="outline"
            size="default"
            onClick={() => switchLocale(otherLocale)}
            className="gap-2 min-w-[120px] h-10"
            aria-label={`Switch to ${localeNames[otherLocale]}`}
          >
            <GlobeIcon className="h-5 w-5" />
            <span className="font-medium">{localeNames[otherLocale]}</span>
          </Button>

          {/* Divider */}
          <div className="w-px h-8 bg-border mx-2" />

          {status === 'loading' ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            </div>
          ) : session?.user ? (
            <div className="flex items-center gap-4">
              {/* User Info - More prominent */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-semibold"
                  aria-hidden="true"
                >
                  {userInitials}
                </div>
                <div className="hidden lg:block">
                  <p className="text-base font-medium leading-tight">{session.user.name}</p>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                </div>
              </div>

              {/* Sign Out - With visible text */}
              <Button
                variant="outline"
                size="default"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="gap-2 h-10"
              >
                <LogOutIcon className="h-5 w-5" />
                <span className="hidden lg:inline">{tNav('logout')}</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="default" className="h-10 px-6" asChild>
                <Link href="/auth/signin">{tNav('login')}</Link>
              </Button>
              <Button size="default" className="h-10 px-6" asChild>
                <Link href="/auth/signup">{tNav('signup')}</Link>
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button - Larger touch target */}
        <div className="flex md:hidden items-center gap-1">
          <Button
            variant="ghost"
            size="default"
            onClick={() => switchLocale(otherLocale)}
            className="h-11 w-11 p-0"
            aria-label={`Switch to ${localeNames[otherLocale]}`}
          >
            <GlobeIcon className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="default"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-11 w-11 p-0"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <CloseIcon className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu - Larger text and touch targets */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container px-4 py-6 space-y-6">
            {status === 'loading' ? (
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ) : session?.user ? (
              <>
                {/* User Info - Larger for mobile */}
                <div className="flex items-center gap-4 pb-6 border-b">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold"
                    aria-hidden="true"
                  >
                    {userInitials}
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{session.user.name}</p>
                    <p className="text-base text-muted-foreground">{session.user.email}</p>
                  </div>
                </div>

                {/* Sign Out - Large button */}
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start gap-3 h-14 text-base"
                  onClick={() => {
                    signOut({ callbackUrl: '/' });
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOutIcon className="h-5 w-5" />
                  {tNav('logout')}
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <Button variant="outline" size="lg" className="w-full h-14 text-base" asChild>
                  <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
                    {tNav('login')}
                  </Link>
                </Button>
                <Button size="lg" className="w-full h-14 text-base" asChild>
                  <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                    {tNav('signup')}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
