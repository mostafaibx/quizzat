'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Module } from '@/lib/rpc';

interface ModuleCardProps {
  module: Module;
  onEdit?: (module: Module) => void;
  onDelete?: (moduleId: string) => void;
}

export function ModuleCard({ module, onEdit, onDelete }: ModuleCardProps) {
  const t = useTranslations('teacher');
  const tCommon = useTranslations('common');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.(module.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {module.coverImage && (
        <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${module.coverImage})` }} />
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2">{module.title}</CardTitle>
          <Badge className={statusColors[module.status as keyof typeof statusColors]}>
            {t(`status.${module.status}`)}
          </Badge>
        </div>
        {module.description && (
          <CardDescription className="line-clamp-2">{module.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {module.enrollmentKey && (
            <div className="flex items-center gap-1">
              <KeyIcon className="h-4 w-4" />
              <span className="font-mono">{module.enrollmentKey}</span>
            </div>
          )}
          {module.units && (
            <div className="flex items-center gap-1">
              <FolderIcon className="h-4 w-4" />
              <span>{module.units.length} {t('units')}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/teacher/modules/${module.id}`}>
            {t('viewModule')}
          </Link>
        </Button>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={() => onEdit(module)}>
            {tCommon('edit')}
          </Button>
        )}
        {onDelete && (
          <Button
            variant={showDeleteConfirm ? 'destructive' : 'ghost'}
            size="sm"
            onClick={handleDelete}
            onBlur={() => setShowDeleteConfirm(false)}
          >
            {showDeleteConfirm ? t('confirmDelete') : tCommon('delete')}
          </Button>
        )}
      </CardFooter>
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

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}
