/**
 * Enrollment Service - Functional approach for edge/serverless
 *
 * Handles enrollments and lesson progress operations.
 * Pure functions that receive dependencies as arguments.
 */

import { eq, and, desc } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { modules, enrollments, units, lessons, lessonProgress } from '@/db/schema';
import type { Module, Enrollment, Lesson, LessonProgress } from '@/db/schema';
import type { AuthenticatedUser } from '@/types/auth.types';
import { AUTH_ROLES } from '@/types/auth.types';
import type {
  JoinModuleInput,
  ListEnrollmentsQuery,
  UpdateProgressInput,
  ModuleSummary,
  ProgressStats,
} from '@/types/enrollment.types';

// ============================================================================
// Types
// ============================================================================

export interface ServiceDeps {
  db: DrizzleD1Database;
}

export interface EnrollmentWithModule extends Enrollment {
  module: Module;
}

export interface LessonWithProgress {
  lesson: Lesson;
  progress: LessonProgress | null;
}

export interface JoinModuleResult {
  enrollment: Enrollment;
  module: ModuleSummary;
}

export interface ModuleProgressResult {
  progress: LessonWithProgress[];
  stats: ProgressStats;
}

// ============================================================================
// ID Generation
// ============================================================================

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

// ============================================================================
// Authorization Helpers
// ============================================================================

export function canViewModuleEnrollments(module: Module, user: AuthenticatedUser): boolean {
  const isOwner = module.userId === user.id;
  const isAdmin = user.role === AUTH_ROLES.ADMIN;
  return isOwner || isAdmin;
}

// ============================================================================
// Enrollment Operations
// ============================================================================

export async function findModuleByEnrollmentKey(
  deps: ServiceDeps,
  enrollmentKey: string
): Promise<Module | null> {
  const [module] = await deps.db
    .select()
    .from(modules)
    .where(eq(modules.enrollmentKey, enrollmentKey.toUpperCase()))
    .limit(1);

  return module ?? null;
}

export async function findEnrollment(
  deps: ServiceDeps,
  userId: string,
  moduleId: string
): Promise<Enrollment | null> {
  const [enrollment] = await deps.db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.moduleId, moduleId)
      )
    )
    .limit(1);

  return enrollment ?? null;
}

export async function findActiveEnrollment(
  deps: ServiceDeps,
  userId: string,
  moduleId: string
): Promise<Enrollment | null> {
  const [enrollment] = await deps.db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.moduleId, moduleId),
        eq(enrollments.status, 'active')
      )
    )
    .limit(1);

  return enrollment ?? null;
}

export async function joinModule(
  deps: ServiceDeps,
  input: JoinModuleInput,
  userId: string
): Promise<JoinModuleResult> {
  const foundModule = await findModuleByEnrollmentKey(deps, input.enrollmentKey);

  if (!foundModule) {
    throw new Error('MODULE_NOT_FOUND');
  }

  if (foundModule.status !== 'published') {
    throw new Error('MODULE_NOT_AVAILABLE');
  }

  const existingEnrollment = await findEnrollment(deps, userId, foundModule.id);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  if (existingEnrollment) {
    if (existingEnrollment.status === 'active') {
      throw new Error('ALREADY_ENROLLED');
    }

    // Reactivate enrollment
    await deps.db
      .update(enrollments)
      .set({
        status: 'active',
        enrolledAt: now,
      })
      .where(eq(enrollments.id, existingEnrollment.id));

    const [updatedEnrollment] = await deps.db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, existingEnrollment.id))
      .limit(1);

    return {
      enrollment: updatedEnrollment,
      module: {
        id: foundModule.id,
        title: foundModule.title,
        description: foundModule.description,
        coverImage: foundModule.coverImage,
      },
    };
  }

  // Create new enrollment
  const enrollmentId = generateId('enr');

  await deps.db.insert(enrollments).values({
    id: enrollmentId,
    userId,
    moduleId: foundModule.id,
    status: 'active',
  });

  const [newEnrollment] = await deps.db
    .select()
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  return {
    enrollment: newEnrollment,
    module: {
      id: foundModule.id,
      title: foundModule.title,
      description: foundModule.description,
      coverImage: foundModule.coverImage,
    },
  };
}

export async function listUserEnrollments(
  deps: ServiceDeps,
  userId: string,
  query: ListEnrollmentsQuery
): Promise<EnrollmentWithModule[]> {
  const conditions = [eq(enrollments.userId, userId)];
  if (query.status) {
    conditions.push(eq(enrollments.status, query.status));
  }

  const userEnrollments = await deps.db
    .select({
      enrollment: enrollments,
      module: modules,
    })
    .from(enrollments)
    .innerJoin(modules, eq(enrollments.moduleId, modules.id))
    .where(and(...conditions))
    .orderBy(desc(enrollments.enrolledAt));

  return userEnrollments.map((e) => ({
    ...e.enrollment,
    module: e.module,
  }));
}

export async function getEnrollmentWithModule(
  deps: ServiceDeps,
  userId: string,
  moduleId: string
): Promise<{ enrollment: Enrollment; module: Module } | null> {
  const enrollment = await findEnrollment(deps, userId, moduleId);

  if (!enrollment) return null;

  const [module] = await deps.db
    .select()
    .from(modules)
    .where(eq(modules.id, moduleId))
    .limit(1);

  return { enrollment, module };
}

export async function cancelEnrollment(
  deps: ServiceDeps,
  userId: string,
  moduleId: string
): Promise<void> {
  const enrollment = await findEnrollment(deps, userId, moduleId);

  if (!enrollment) {
    throw new Error('ENROLLMENT_NOT_FOUND');
  }

  await deps.db
    .update(enrollments)
    .set({ status: 'cancelled' })
    .where(eq(enrollments.id, enrollment.id));
}

export async function getModuleEnrollments(
  deps: ServiceDeps,
  moduleId: string
): Promise<Enrollment[]> {
  return deps.db
    .select()
    .from(enrollments)
    .where(eq(enrollments.moduleId, moduleId))
    .orderBy(desc(enrollments.enrolledAt));
}

// ============================================================================
// Progress Operations
// ============================================================================

export async function getModuleProgress(
  deps: ServiceDeps,
  userId: string,
  moduleId: string
): Promise<ModuleProgressResult> {
  // Get all units in module
  const moduleUnits = await deps.db
    .select()
    .from(units)
    .where(eq(units.moduleId, moduleId));

  const unitIds = moduleUnits.map((u) => u.id);

  if (unitIds.length === 0) {
    return {
      progress: [],
      stats: { total: 0, completed: 0, inProgress: 0, notStarted: 0, percentage: 0 },
    };
  }

  // Get all lessons for these units
  // Note: For simplicity, fetching all lessons and filtering in memory
  // In production, consider a better query strategy
  const allLessons: Lesson[] = [];
  for (const unitId of unitIds) {
    const unitLessons = await deps.db
      .select()
      .from(lessons)
      .where(eq(lessons.unitId, unitId));
    allLessons.push(...unitLessons);
  }

  // Get user's progress
  const progressRecords = await deps.db
    .select()
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId));

  const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

  const progressWithLessons = allLessons.map((lesson) => ({
    lesson,
    progress: progressMap.get(lesson.id) || null,
  }));

  // Calculate stats
  const completedCount = progressRecords.filter((p) => p.status === 'completed').length;
  const inProgressCount = progressRecords.filter((p) => p.status === 'in_progress').length;

  const stats: ProgressStats = {
    total: allLessons.length,
    completed: completedCount,
    inProgress: inProgressCount,
    notStarted: allLessons.length - progressRecords.length,
    percentage: allLessons.length > 0
      ? Math.round((completedCount / allLessons.length) * 100)
      : 0,
  };

  return { progress: progressWithLessons, stats };
}

export async function findLessonById(
  deps: ServiceDeps,
  lessonId: string
): Promise<Lesson | null> {
  const [lesson] = await deps.db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  return lesson ?? null;
}

export async function findLessonProgress(
  deps: ServiceDeps,
  userId: string,
  lessonId: string
): Promise<LessonProgress | null> {
  const [progress] = await deps.db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId)
      )
    )
    .limit(1);

  return progress ?? null;
}

export async function updateLessonProgress(
  deps: ServiceDeps,
  userId: string,
  lessonId: string,
  input: UpdateProgressInput
): Promise<LessonProgress> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const existingProgress = await findLessonProgress(deps, userId, lessonId);

  if (existingProgress) {
    // Update existing progress
    const updateData: Record<string, unknown> = {
      lastAccessedAt: now,
    };

    if (input.status) updateData.status = input.status;
    if (input.progressPercent !== undefined) updateData.progressPercent = input.progressPercent;
    if (input.watchedSeconds !== undefined) updateData.watchedSeconds = input.watchedSeconds;

    if (input.status === 'completed' && existingProgress.status !== 'completed') {
      updateData.completedAt = now;
    }

    if (input.status === 'in_progress' && !existingProgress.startedAt) {
      updateData.startedAt = now;
    }

    await deps.db
      .update(lessonProgress)
      .set(updateData)
      .where(eq(lessonProgress.id, existingProgress.id));

    const [updated] = await deps.db
      .select()
      .from(lessonProgress)
      .where(eq(lessonProgress.id, existingProgress.id))
      .limit(1);

    return updated;
  }

  // Create new progress record
  const progressId = generateId('prog');

  await deps.db.insert(lessonProgress).values({
    id: progressId,
    userId,
    lessonId,
    status: input.status || 'in_progress',
    progressPercent: input.progressPercent || 0,
    watchedSeconds: input.watchedSeconds || 0,
    startedAt: now,
    completedAt: input.status === 'completed' ? now : null,
  });

  const [newProgress] = await deps.db
    .select()
    .from(lessonProgress)
    .where(eq(lessonProgress.id, progressId))
    .limit(1);

  return newProgress;
}
