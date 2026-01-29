'use client';

import { useState, useEffect, useCallback } from 'react';
import { modulesRpc, type Module, type ModuleDetailResponse } from '@/lib/rpc';
import type { ModuleStatus } from '@/db/schema';

interface UseModulesOptions {
  status?: ModuleStatus;
  autoFetch?: boolean;
}

interface UseModulesReturn {
  modules: Module[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useModules(options: UseModulesOptions = {}): UseModulesReturn {
  const { status, autoFetch = true } = options;
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.listModules({ status });
      setModules(response.modules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch modules');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (autoFetch) {
      fetchModules();
    }
  }, [autoFetch, fetchModules]);

  return { modules, isLoading, error, refetch: fetchModules };
}

interface UseModuleReturn {
  module: Module | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useModule(moduleId: string | null): UseModuleReturn {
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(!!moduleId);
  const [error, setError] = useState<string | null>(null);

  const fetchModule = useCallback(async () => {
    if (!moduleId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.getModule(moduleId);
      setModule(response.module);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch module');
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    if (moduleId) {
      fetchModule();
    } else {
      setModule(null);
    }
  }, [moduleId, fetchModule]);

  return { module, isLoading, error, refetch: fetchModule };
}

interface UseModuleMutationsReturn {
  createModule: (data: { title: string; description?: string; coverImage?: string; status?: ModuleStatus }) => Promise<ModuleDetailResponse>;
  updateModule: (moduleId: string, data: { title?: string; description?: string; coverImage?: string | null; enrollmentKey?: string | null; status?: ModuleStatus; sortOrder?: number }) => Promise<ModuleDetailResponse>;
  deleteModule: (moduleId: string) => Promise<{ deleted: boolean }>;
  regenerateKey: (moduleId: string) => Promise<{ enrollmentKey: string }>;
  isLoading: boolean;
  error: string | null;
}

export function useModuleMutations(): UseModuleMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createModule = useCallback(async (data: { title: string; description?: string; coverImage?: string; status?: ModuleStatus }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.createModule(data);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create module';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateModule = useCallback(async (moduleId: string, data: { title?: string; description?: string; coverImage?: string | null; enrollmentKey?: string | null; status?: ModuleStatus; sortOrder?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.updateModule(moduleId, data);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update module';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteModule = useCallback(async (moduleId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.deleteModule(moduleId);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete module';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const regenerateKey = useCallback(async (moduleId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.regenerateEnrollmentKey(moduleId);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate key';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createModule, updateModule, deleteModule, regenerateKey, isLoading, error };
}
