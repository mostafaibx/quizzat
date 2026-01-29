'use client';

import { useState, useCallback } from 'react';
import { modulesRpc, type Lesson, type LessonResponse } from '@/lib/rpc';
import type { LessonContentType } from '@/db/schema';

interface UseLessonMutationsReturn {
  createLesson: (moduleId: string, unitId: string, data: { title: string; description?: string; contentType?: LessonContentType; isFree?: boolean; sortOrder?: number }) => Promise<LessonResponse>;
  updateLesson: (moduleId: string, unitId: string, lessonId: string, data: { title?: string; description?: string; contentType?: LessonContentType; isFree?: boolean; sortOrder?: number }) => Promise<LessonResponse>;
  deleteLesson: (moduleId: string, unitId: string, lessonId: string) => Promise<{ deleted: boolean }>;
  isLoading: boolean;
  error: string | null;
}

export function useLessonMutations(): UseLessonMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLesson = useCallback(async (moduleId: string, unitId: string, data: { title: string; description?: string; contentType?: LessonContentType; isFree?: boolean; sortOrder?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.createLesson(moduleId, unitId, data);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create lesson';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLesson = useCallback(async (moduleId: string, unitId: string, lessonId: string, data: { title?: string; description?: string; contentType?: LessonContentType; isFree?: boolean; sortOrder?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.updateLesson(moduleId, unitId, lessonId, data);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update lesson';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteLesson = useCallback(async (moduleId: string, unitId: string, lessonId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modulesRpc.deleteLesson(moduleId, unitId, lessonId);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete lesson';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createLesson, updateLesson, deleteLesson, isLoading, error };
}
