import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type {
  Module as DBModule,
  Unit as DBUnit,
  Lesson as DBLesson,
} from '@/db/schema';
import type {
  ModuleStatus,
  LessonContentType,
  CreateModuleInput,
  UpdateModuleInput,
  CreateUnitInput,
  UpdateUnitInput,
  CreateLessonInput,
  UpdateLessonInput,
  DeleteResult,
  RegenerateKeyResult,
} from '@/types/module.types';

// Re-export types for convenience
export type {
  ModuleStatus,
  LessonContentType,
  CreateModuleInput,
  UpdateModuleInput,
  CreateUnitInput,
  UpdateUnitInput,
  CreateLessonInput,
  UpdateLessonInput,
  DeleteResult,
  RegenerateKeyResult,
};

// ============================================================================
// Types
// ============================================================================

export type Lesson = DBLesson;

export interface Unit extends DBUnit {
  lessons?: Lesson[];
}

export interface Module extends DBModule {
  units?: Unit[];
}

// Request type aliases (for backward compatibility)
export type CreateModuleRequest = CreateModuleInput;
export type UpdateModuleRequest = UpdateModuleInput;
export type CreateUnitRequest = CreateUnitInput;
export type UpdateUnitRequest = UpdateUnitInput;
export type CreateLessonRequest = CreateLessonInput;
export type UpdateLessonRequest = UpdateLessonInput;

// Response types
export interface ModuleListResponse {
  modules: Module[];
}

export interface ModuleDetailResponse {
  module: Module;
}

export interface UnitResponse {
  unit: Unit;
}

export interface LessonResponse {
  lesson: Lesson;
}

export type DeleteResponse = DeleteResult & { moduleId?: string; unitId?: string; lessonId?: string };
export type RegenerateKeyResponse = RegenerateKeyResult;

// ============================================================================
// Module RPC Methods
// ============================================================================

/**
 * List modules
 * - Teachers see their own modules
 * - Students see enrolled modules
 * - Admins see all modules
 */
async function listModules(options?: {
  status?: ModuleStatus;
}): Promise<ModuleListResponse> {
  const query: Record<string, string> = {};
  if (options?.status) query.status = options.status;
  return apiGet<ModuleListResponse>('/api/modules', query);
}

/**
 * Get module details with units and lessons
 */
async function getModule(moduleId: string): Promise<ModuleDetailResponse> {
  return apiGet<ModuleDetailResponse>(`/api/modules/${moduleId}`);
}

/**
 * Create a new module (Teacher/Admin only)
 */
async function createModule(data: CreateModuleRequest): Promise<ModuleDetailResponse> {
  return apiPost<ModuleDetailResponse, CreateModuleRequest>('/api/modules', data);
}

/**
 * Update a module (Owner/Admin only)
 */
async function updateModule(
  moduleId: string,
  data: UpdateModuleRequest
): Promise<ModuleDetailResponse> {
  return apiPatch<ModuleDetailResponse, UpdateModuleRequest>(
    `/api/modules/${moduleId}`,
    data
  );
}

/**
 * Delete a module (Owner/Admin only)
 */
async function deleteModule(moduleId: string): Promise<DeleteResponse> {
  return apiDelete<DeleteResponse>(`/api/modules/${moduleId}`);
}

/**
 * Regenerate enrollment key (Owner/Admin only)
 */
async function regenerateEnrollmentKey(moduleId: string): Promise<RegenerateKeyResponse> {
  return apiPost<RegenerateKeyResponse>(`/api/modules/${moduleId}/regenerate-key`);
}

// ============================================================================
// Unit RPC Methods
// ============================================================================

/**
 * Create a unit in a module
 */
async function createUnit(
  moduleId: string,
  data: CreateUnitRequest
): Promise<UnitResponse> {
  return apiPost<UnitResponse, CreateUnitRequest>(
    `/api/modules/${moduleId}/units`,
    data
  );
}

/**
 * Update a unit
 */
async function updateUnit(
  moduleId: string,
  unitId: string,
  data: UpdateUnitRequest
): Promise<UnitResponse> {
  return apiPatch<UnitResponse, UpdateUnitRequest>(
    `/api/modules/${moduleId}/units/${unitId}`,
    data
  );
}

/**
 * Delete a unit
 */
async function deleteUnit(
  moduleId: string,
  unitId: string
): Promise<DeleteResponse> {
  return apiDelete<DeleteResponse>(`/api/modules/${moduleId}/units/${unitId}`);
}

// ============================================================================
// Lesson RPC Methods
// ============================================================================

/**
 * Create a lesson in a unit
 */
async function createLesson(
  moduleId: string,
  unitId: string,
  data: CreateLessonRequest
): Promise<LessonResponse> {
  return apiPost<LessonResponse, CreateLessonRequest>(
    `/api/modules/${moduleId}/units/${unitId}/lessons`,
    data
  );
}

/**
 * Update a lesson
 */
async function updateLesson(
  moduleId: string,
  unitId: string,
  lessonId: string,
  data: UpdateLessonRequest
): Promise<LessonResponse> {
  return apiPatch<LessonResponse, UpdateLessonRequest>(
    `/api/modules/${moduleId}/units/${unitId}/lessons/${lessonId}`,
    data
  );
}

/**
 * Delete a lesson
 */
async function deleteLesson(
  moduleId: string,
  unitId: string,
  lessonId: string
): Promise<DeleteResponse> {
  return apiDelete<DeleteResponse>(
    `/api/modules/${moduleId}/units/${unitId}/lessons/${lessonId}`
  );
}

// ============================================================================
// Export RPC client
// ============================================================================

export const modulesRpc = {
  // Modules
  listModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
  regenerateEnrollmentKey,
  // Units
  createUnit,
  updateUnit,
  deleteUnit,
  // Lessons
  createLesson,
  updateLesson,
  deleteLesson,
};
