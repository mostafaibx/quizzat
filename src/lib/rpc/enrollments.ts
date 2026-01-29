import { apiGet, apiPost, apiDelete } from './client';
import type {
  Enrollment as DBEnrollment,
  Module as DBModule,
  Lesson as DBLesson,
  LessonProgress as DBLessonProgress,
} from '@/db/schema';
import type {
  EnrollmentStatus,
  LessonProgressStatus,
  JoinModuleInput,
  UpdateProgressInput,
  ModuleSummary,
  ProgressStats,
  CancelEnrollmentResult,
} from '@/types/enrollment.types';

// Re-export types for convenience
export type {
  EnrollmentStatus,
  LessonProgressStatus,
  JoinModuleInput,
  UpdateProgressInput,
  ModuleSummary,
  ProgressStats,
  CancelEnrollmentResult,
};

// ============================================================================
// Types
// ============================================================================

export type Enrollment = DBEnrollment;
export type LessonProgress = DBLessonProgress;

export interface EnrollmentWithModule extends Enrollment {
  module: DBModule;
}

// Request type aliases (for backward compatibility)
export type JoinModuleRequest = JoinModuleInput;
export type UpdateProgressRequest = UpdateProgressInput;

// Response types
export interface JoinModuleResponse {
  enrollment: Enrollment;
  module: ModuleSummary;
}

export interface EnrollmentListResponse {
  enrollments: EnrollmentWithModule[];
}

export interface EnrollmentDetailResponse {
  enrollment: Enrollment;
  module: DBModule;
}

export interface LessonWithProgress {
  lesson: DBLesson;
  progress: LessonProgress | null;
}

export interface ModuleProgressResponse {
  progress: LessonWithProgress[];
  stats: ProgressStats;
}

export interface ProgressResponse {
  progress: LessonProgress;
}

export interface ModuleEnrollmentsResponse {
  enrollments: Enrollment[];
}

// ============================================================================
// Enrollment RPC Methods
// ============================================================================

/**
 * Join a module using enrollment key
 */
async function joinModule(data: JoinModuleRequest): Promise<JoinModuleResponse> {
  return apiPost<JoinModuleResponse, JoinModuleRequest>('/api/enrollments/join', data);
}

/**
 * List user's enrollments
 */
async function listEnrollments(options?: {
  status?: EnrollmentStatus;
}): Promise<EnrollmentListResponse> {
  const query: Record<string, string> = {};
  if (options?.status) query.status = options.status;
  return apiGet<EnrollmentListResponse>('/api/enrollments', query);
}

/**
 * Get enrollment details for a module
 */
async function getEnrollment(moduleId: string): Promise<EnrollmentDetailResponse> {
  return apiGet<EnrollmentDetailResponse>(`/api/enrollments/${moduleId}`);
}

/**
 * Leave a module (cancel enrollment)
 */
async function leaveModule(moduleId: string): Promise<CancelEnrollmentResult> {
  return apiDelete<CancelEnrollmentResult>(`/api/enrollments/${moduleId}`);
}

/**
 * Get progress for all lessons in a module
 */
async function getModuleProgress(moduleId: string): Promise<ModuleProgressResponse> {
  return apiGet<ModuleProgressResponse>(`/api/enrollments/${moduleId}/progress`);
}

/**
 * Update lesson progress
 */
async function updateLessonProgress(
  moduleId: string,
  lessonId: string,
  data: UpdateProgressRequest
): Promise<ProgressResponse> {
  return apiPost<ProgressResponse, UpdateProgressRequest>(
    `/api/enrollments/${moduleId}/lessons/${lessonId}/progress`,
    data
  );
}

/**
 * Get all enrollments for a module (Teacher view)
 */
async function getModuleEnrollments(moduleId: string): Promise<ModuleEnrollmentsResponse> {
  return apiGet<ModuleEnrollmentsResponse>(`/api/modules/${moduleId}/enrollments`);
}

// ============================================================================
// Export RPC client
// ============================================================================

export const enrollmentsRpc = {
  joinModule,
  listEnrollments,
  getEnrollment,
  leaveModule,
  getModuleProgress,
  updateLessonProgress,
  getModuleEnrollments,
};
