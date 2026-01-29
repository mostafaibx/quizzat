'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ModuleList } from './module-list';
import { ModuleFormDialog } from './module-form-dialog';
import { useModules, useModuleMutations } from '@/hooks';
import type { Module } from '@/lib/rpc';
import type { ModuleStatus } from '@/db/schema';

export function TeacherDashboard() {
  const t = useTranslations('teacher');
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
      } else {
        await createModule(data);
      }
      setIsFormOpen(false);
      setEditingModule(null);
      await refetch();
    } catch (error) {
      console.error('Failed to save module:', error);
    }
  };

  const handleDelete = async (moduleId: string) => {
    try {
      await deleteModule(moduleId);
      await refetch();
    } catch (error) {
      console.error('Failed to delete module:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard')}</h1>
          <p className="text-muted-foreground">{t('dashboardDescription')}</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {t('createModule')}
        </Button>
      </div>

      <ModuleList
        modules={modules}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
