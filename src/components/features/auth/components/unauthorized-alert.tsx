'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function UnauthorizedAlert() {
  const t = useTranslations('errors');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Initialize dismissed based on current URL - if error param exists, start shown
  const [dismissed, setDismissed] = useState(
    () => searchParams.get('error') !== 'unauthorized'
  );

  const hasUnauthorizedError = searchParams.get('error') === 'unauthorized';

  // Clean up URL when error is present
  useEffect(() => {
    if (hasUnauthorizedError) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('error');
      const newUrl = newParams.toString() ? `${pathname}?${newParams}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [hasUnauthorizedError, searchParams, router, pathname]);

  if (dismissed) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <ShieldAlertIcon className="h-4 w-4" />
      <AlertTitle>{t('unauthorizedTitle')}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{t('unauthorizedDescription')}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="ml-4"
        >
          {t('goBack')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function ShieldAlertIcon({ className }: { className?: string }) {
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
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}
