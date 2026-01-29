'use client';

import { useState, useCallback } from 'react';
import { modulesRpc, type Unit, type UnitResponse } from '@/lib/rpc';

interface UseUnitMutationsReturn {
  createUnit: (moduleId: string, data: { title: string; description?: string; sortOrder?: number }) => Promise<UnitResponse>;
  updateUnit: (moduleId: string, unitId: string, data: { title?: string; description?: string; sortOrder?: number }) => Promise<UnitResponse>;
  deleteUnit: (moduleId: string, unitId: string) => Promise<{ deleted: boolean }>;
  isLoading: boolean;
  error: string | null;
}

export function useUnitMutations(): UseUnitMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUnit = useCallback(async (moduleId: string, data: { title: string; description?: string; sortOrder?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.createUnit(moduleId, data);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create unit';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUnit = useCallback(async (moduleId: string, unitId: string, data: { title?: string; description?: string; sortOrder?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.updateUnit(moduleId, unitId, data);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update unit';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteUnit = useCallback(async (moduleId: string, unitId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.deleteUnit(moduleId, unitId);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete unit';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createUnit, updateUnit, deleteUnit, isLoading, error };
}
