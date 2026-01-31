'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Key, Folder, Eye } from 'lucide-react';
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
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      {module.coverImage && (
        <div 
          className="h-32 w-full bg-cover bg-center transition-transform group-hover:scale-105" 
          style={{ backgroundImage: `url(${module.coverImage})` }} 
        />
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-lg">{module.title}</CardTitle>
          <Badge className={statusColors[module.status as keyof typeof statusColors]}>
            {t(`status.${module.status}`)}
          </Badge>
        </div>
        {module.description && (
          <CardDescription className="line-clamp-2">{module.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {module.enrollmentKey && (
            <div className="flex items-center gap-1.5">
              <Key className="h-4 w-4" />
              <span className="font-mono text-xs">{module.enrollmentKey}</span>
            </div>
          )}
          {module.units && (
            <div className="flex items-center gap-1.5">
              <Folder className="h-4 w-4" />
              <span>{module.units.length} {t('units')}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link href={`/teacher/modules/${module.id}`}>
            <Eye className="h-4 w-4" />
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
