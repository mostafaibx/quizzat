import { z } from 'zod';

// ============================================================================
// Constants
// ============================================================================

export const MODULE_STATUS = ['draft', 'published', 'archived'] as const;
export const LESSON_CONTENT_TYPE = ['video', 'text', 'quiz'] as const;

// ============================================================================
// Base Types
// ============================================================================

export type ModuleStatus = (typeof MODULE_STATUS)[number];
export type LessonContentType = (typeof LESSON_CONTENT_TYPE)[number];

// ============================================================================
// Zod Schemas - Module
// ============================================================================

export const createModuleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  coverImage: z.string().url().optional(),
  status: z.enum(MODULE_STATUS).default('draft'),
});

export const updateModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  coverImage: z.string().url().nullable().optional(),
  enrollmentKey: z.string().min(4).max(50).nullable().optional(),
  status: z.enum(MODULE_STATUS).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const listModulesQuerySchema = z.object({
  status: z.enum(MODULE_STATUS).optional(),
});

// ============================================================================
// Zod Schemas - Unit
// ============================================================================

export const createUnitSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateUnitSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ============================================================================
// Zod Schemas - Lesson
// ============================================================================

export const createLessonSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  contentType: z.enum(LESSON_CONTENT_TYPE).default('video'),
  isFree: z.boolean().default(false),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  contentType: z.enum(LESSON_CONTENT_TYPE).optional(),
  isFree: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ============================================================================
// Input Types (what the API accepts - before defaults are applied)
// ============================================================================

export type CreateModuleInput = z.input<typeof createModuleSchema>;
export type UpdateModuleInput = z.input<typeof updateModuleSchema>;
export type ListModulesQuery = z.input<typeof listModulesQuerySchema>;

export type CreateUnitInput = z.input<typeof createUnitSchema>;
export type UpdateUnitInput = z.input<typeof updateUnitSchema>;

export type CreateLessonInput = z.input<typeof createLessonSchema>;
export type UpdateLessonInput = z.input<typeof updateLessonSchema>;

// ============================================================================
// Output Types (after Zod parsing with defaults applied)
// ============================================================================

export type CreateModuleData = z.infer<typeof createModuleSchema>;
export type CreateUnitData = z.infer<typeof createUnitSchema>;
export type CreateLessonData = z.infer<typeof createLessonSchema>;

// ============================================================================
// Response Types
// ============================================================================

export interface DeleteResult {
  deleted: boolean;
}

export interface RegenerateKeyResult {
  enrollmentKey: string;
}
