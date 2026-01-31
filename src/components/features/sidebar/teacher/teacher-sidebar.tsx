'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LayoutGrid, Video, FileText, HelpCircle, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    href: '/teacher',
    labelKey: 'modules',
    icon: LayoutGrid,
  },
  {
    href: '/videos/upload',
    labelKey: 'uploadLessons',
    icon: Video,
  },
  {
    href: '/teacher/files',
    labelKey: 'uploadFiles',
    icon: FileText,
    disabled: true,
  },
  {
    href: '/teacher/quizzes',
    labelKey: 'quizzes',
    icon: HelpCircle,
    disabled: true,
  },
  {
    href: '/teacher/students',
    labelKey: 'students',
    icon: Users,
    disabled: true,
  },
];

export function TeacherSidebar() {
  const t = useTranslations('sidebar');
  const locale = useLocale();
  const pathname = usePathname();

  const isActive = (href: string) => {
    const localizedHref = `/${locale}${href}`;
    if (href === '/teacher') {
      return pathname === localizedHref;
    }
    return pathname.startsWith(localizedHref);
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 border-e bg-muted/30">
      {/* Sidebar Header */}
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">{t('teacherPortal')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('manageContent')}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm',
                  'text-muted-foreground/50 cursor-not-allowed'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{t(item.labelKey)}</span>
                <span className="ms-auto text-xs bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t('comingSoon')}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t">
        <div className="rounded-lg bg-primary/5 p-4 transition-all hover:bg-primary/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('needHelp')}</p>
              <p className="text-xs text-muted-foreground">{t('helpDescription')}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Mobile Sidebar (shown as bottom navigation on tablet/mobile)
export function TeacherMobileNav() {
  const t = useTranslations('sidebar');
  const locale = useLocale();
  const pathname = usePathname();

  const isActive = (href: string) => {
    const localizedHref = `/${locale}${href}`;
    if (href === '/teacher') {
      return pathname === localizedHref;
    }
    return pathname.startsWith(localizedHref);
  };

  const mobileItems = navItems.filter(item => !item.disabled);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full px-2 transition-all',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium truncate max-w-[80px]">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
