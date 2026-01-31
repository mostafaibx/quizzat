'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ModuleList } from '@/components/features/modules/teacher/module-list';
import { ModuleFormDialog } from '@/components/features/modules/teacher/module-form-dialog';
import { useModules, useModuleMutations } from '@/hooks';
import { toast } from 'sonner';
import type { Module } from '@/lib/rpc';
import type { ModuleStatus } from '@/db/schema';

export function TeacherDashboard() {
  const t = useTranslations('teacher');
  const tCommon = useTranslations('common');
  const { modules, isLoading, refetch } = useModules();
  const { createModule, updateModule, deleteModule, isLoading: isMutating } = useModuleMutations();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const handleOpenCreate = () => {
    setEditingModule(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (module: Module) => {
    setEditingModule(module);
    setIsFormOpen(true);
  };

  const handleSubmit = async (data: { title: string; description?: string; status?: ModuleStatus }) => {
    try {
      if (editingModule) {
        await updateModule(editingModule.id, data);
        toast.success(t('moduleUpdated') || 'Module updated successfully');
      } else {
        await createModule(data);
        toast.success(t('moduleCreated') || 'Module created successfully');
      }
      setIsFormOpen(false);
      setEditingModule(null);
      await refetch();
    } catch (error) {
      console.error('Failed to save module:', error);
      toast.error(t('moduleSaveError') || 'Failed to save module');
    }
  };

  const handleDelete = async (moduleId: string) => {
    try {
      await deleteModule(moduleId);
      toast.success(t('moduleDeleted') || 'Module deleted successfully');
      await refetch();
    } catch (error) {
      console.error('Failed to delete module:', error);
      toast.error(t('moduleDeleteError') || 'Failed to delete module');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1">{t('dashboardDescription')}</p>
        </div>
        <Button onClick={handleOpenCreate} size="default" className="gap-2">
          <Plus className="h-4 w-4" />
          {t('createModule')}
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : modules.length === 0 ? (
        <EmptyState onCreateModule={handleOpenCreate} />
      ) : (
        <ModuleList
          modules={modules}
          isLoading={isLoading}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      )}

      <ModuleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        module={editingModule}
        onSubmit={handleSubmit}
        isLoading={isMutating}
      />
    </div>
  );
}

function EmptyState({ onCreateModule }: { onCreateModule: () => void }) {
  const t = useTranslations('teacher');

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <FolderOpen className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{t('noModulesYet') || 'No modules yet'}</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          {t('noModulesDescription') || 'Get started by creating your first module to organize your lessons and content.'}
        </p>
        <Button onClick={onCreateModule} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          {t('createFirstModule') || 'Create Your First Module'}
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-32 bg-gradient-to-br from-muted via-muted to-muted/50 animate-pulse" />
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-5 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 bg-muted rounded flex-1 animate-pulse" />
              <div className="h-9 bg-muted rounded w-20 animate-pulse" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
