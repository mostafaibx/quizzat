'use client';

import { useState, useEffect, useCallback } from 'react';
import { enrollmentsRpc, type EnrollmentWithModule, type ModuleProgressResponse, type LessonProgress } from '@/lib/rpc';
import type { EnrollmentStatus, LessonProgressStatus } from '@/db/schema';

interface UseEnrollmentsOptions {
  status?: EnrollmentStatus;
  autoFetch?: boolean;
}

interface UseEnrollmentsReturn {
  enrollments: EnrollmentWithModule[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEnrollments(options: UseEnrollmentsOptions = {}): UseEnrollmentsReturn {
  const { status, autoFetch = true } = options;
  const [enrollments, setEnrollments] = useState<EnrollmentWithModule[]>([]);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await enrollmentsRpc.listEnrollments({ status });
      setEnrollments(response.enrollments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch enrollments');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (autoFetch) {
      fetchEnrollments();
    }
  }, [autoFetch, fetchEnrollments]);

  return { enrollments, isLoading, error, refetch: fetchEnrollments };
}

interface UseModuleProgressReturn {
  progress: ModuleProgressResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useModuleProgress(moduleId: string | null): UseModuleProgressReturn {
  const [progress, setProgress] = useState<ModuleProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(!!moduleId);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!moduleId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await enrollmentsRpc.getModuleProgress(moduleId);
      setProgress(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    if (moduleId) {
      fetchProgress();
    } else {
      setProgress(null);
    }
  }, [moduleId, fetchProgress]);

  return { progress, isLoading, error, refetch: fetchProgress };
}

interface UseEnrollmentMutationsReturn {
  joinModule: (enrollmentKey: string) => Promise<{ enrollment: unknown; module: { id: string; title: string; description: string | null; coverImage: string | null } }>;
  leaveModule: (moduleId: string) => Promise<{ cancelled: boolean; moduleId: string }>;
  updateProgress: (moduleId: string, lessonId: string, data: { status?: LessonProgressStatus; progressPercent?: number; watchedSeconds?: number }) => Promise<{ progress: LessonProgress }>;
  isLoading: boolean;
  error: string | null;
}

export function useEnrollmentMutations(): UseEnrollmentMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinModule = useCallback(async (enrollmentKey: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await enrollmentsRpc.joinModule({ enrollmentKey });
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join module';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const leaveModule = useCallback(async (moduleId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await enrollmentsRpc.leaveModule(moduleId);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave module';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProgress = useCallback(async (moduleId: string, lessonId: string, data: { status?: LessonProgressStatus; progressPercent?: number; watchedSeconds?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await enrollmentsRpc.updateLessonProgress(moduleId, lessonId, data);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update progress';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { joinModule, leaveModule, updateProgress, isLoading, error };
}
