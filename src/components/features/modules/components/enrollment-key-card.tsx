'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EnrollmentKeyCardProps {
  enrollmentKey: string | null;
  onRegenerate: () => Promise<void>;
  isLoading?: boolean;
}

export function EnrollmentKeyCard({ enrollmentKey, onRegenerate, isLoading }: EnrollmentKeyCardProps) {
  const t = useTranslations('teacher');
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const copyToClipboard = async () => {
    if (enrollmentKey) {
      await navigator.clipboard.writeText(enrollmentKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (showConfirm) {
      await onRegenerate();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyIcon className="h-5 w-5" />
          {t('enrollmentKey')}
        </CardTitle>
        <CardDescription>{t('enrollmentKeyDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={enrollmentKey || t('noEnrollmentKey')}
              readOnly
              className="font-mono pr-20"
            />
            {enrollmentKey && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4 mr-1" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4 mr-1" />
                    {t('copy')}
                  </>
                )}
              </Button>
            )}
          </div>
          <Button
            variant={showConfirm ? 'destructive' : 'outline'}
            onClick={handleRegenerate}
            onBlur={() => setShowConfirm(false)}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : showConfirm ? (
              t('confirmRegenerate')
            ) : (
              <>
                <RefreshIcon className="h-4 w-4 mr-1" />
                {t('regenerate')}
              </>
            )}
          </Button>
        </div>
        {showConfirm && (
          <p className="mt-2 text-sm text-destructive">{t('regenerateWarning')}</p>
        )}
      </CardContent>
    </Card>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
