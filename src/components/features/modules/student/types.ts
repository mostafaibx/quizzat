import type { Module, Enrollment, LessonProgress, ProgressStats } from '@/lib/rpc';

export interface EnrolledModule {
  enrollment: Enrollment;
  module: Module;
}

export interface LessonWithProgress {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    contentType: string;
    isFree: boolean;
    sortOrder: number;
  };
  progress: LessonProgress | null;
}

export interface ModuleProgress {
  progress: LessonWithProgress[];
  stats: ProgressStats;
}
