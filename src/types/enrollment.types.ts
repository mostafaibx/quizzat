import { z } from 'zod';

// ============================================================================
// Constants
// ============================================================================

export const ENROLLMENT_STATUS = ['active', 'completed', 'expired', 'cancelled'] as const;
export const LESSON_PROGRESS_STATUS = ['not_started', 'in_progress', 'completed'] as const;

// ============================================================================
// Base Types
// ============================================================================

export type EnrollmentStatus = (typeof ENROLLMENT_STATUS)[number];
export type LessonProgressStatus = (typeof LESSON_PROGRESS_STATUS)[number];

// ============================================================================
// Zod Schemas
// ============================================================================

export const joinModuleSchema = z.object({
  enrollmentKey: z.string().min(4).max(50),
});

export const listEnrollmentsQuerySchema = z.object({
  status: z.enum(ENROLLMENT_STATUS).optional(),
});

export const updateProgressSchema = z.object({
  status: z.enum(LESSON_PROGRESS_STATUS).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  watchedSeconds: z.number().min(0).optional(),
});

// ============================================================================
// Input Types (what the API accepts)
// ============================================================================

export type JoinModuleInput = z.input<typeof joinModuleSchema>;
export type ListEnrollmentsQuery = z.input<typeof listEnrollmentsQuerySchema>;
export type UpdateProgressInput = z.input<typeof updateProgressSchema>;

// ============================================================================
// Response Types
// ============================================================================

export interface ModuleSummary {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
}

export interface ProgressStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percentage: number;
}

export interface CancelEnrollmentResult {
  cancelled: boolean;
  moduleId: string;
}
