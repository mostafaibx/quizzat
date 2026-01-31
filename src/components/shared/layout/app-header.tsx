'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe, LogOut, Menu, X } from 'lucide-react';
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      {/* Main Header */}
      <div className="container flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 font-bold text-xl hover:opacity-80 transition-opacity"
        >
          <span className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1 text-base font-bold">
            Q
          </span>
          <span className="hidden sm:inline">{t('appName')}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {/* Language Switcher */}
          <Button
            variant="outline"
            size="default"
            onClick={() => switchLocale(otherLocale)}
            className="gap-2 min-w-[120px] h-10"
            aria-label={`Switch to ${localeNames[otherLocale]}`}
          >
            <Globe className="h-5 w-5" />
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
              {/* User Info */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-semibold ring-2 ring-primary/20 transition-all hover:ring-primary/40"
                  aria-hidden="true"
                >
                  {userInitials}
                </div>
                <div className="hidden lg:block">
                  <p className="text-base font-medium leading-tight">{session.user.name}</p>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                </div>
              </div>

              {/* Sign Out */}
              <Button
                variant="outline"
                size="default"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="gap-2 h-10 transition-all hover:bg-destructive hover:text-destructive-foreground"
              >
                <LogOut className="h-5 w-5" />
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

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-1">
          <Button
            variant="ghost"
            size="default"
            onClick={() => switchLocale(otherLocale)}
            className="h-11 w-11 p-0"
            aria-label={`Switch to ${localeNames[otherLocale]}`}
          >
            <Globe className="h-6 w-6" />
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
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background animate-in slide-in-from-top-2">
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
                {/* User Info */}
                <div className="flex items-center gap-4 pb-6 border-b">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold ring-2 ring-primary/20"
                    aria-hidden="true"
                  >
                    {userInitials}
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{session.user.name}</p>
                    <p className="text-base text-muted-foreground">{session.user.email}</p>
                  </div>
                </div>

                {/* Sign Out */}
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start gap-3 h-14 text-base"
                  onClick={() => {
                    signOut({ callbackUrl: '/' });
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-5 w-5" />
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
