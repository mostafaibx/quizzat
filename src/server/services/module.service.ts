/**
 * Module Service - Functional approach for edge/serverless
 *
 * Handles modules, units, and lessons operations.
 * Pure functions that receive dependencies as arguments.
 */

import { eq, desc, and, asc } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { modules, units, lessons, enrollments } from '@/db/schema';
import type { Module, Unit, Lesson, Enrollment } from '@/db/schema';
import type { AuthenticatedUser } from '@/types/auth.types';
import { AUTH_ROLES } from '@/types/auth.types';
import type {
  CreateModuleData,
  UpdateModuleInput,
  ListModulesQuery,
  CreateUnitData,
  UpdateUnitInput,
  CreateLessonData,
  UpdateLessonInput,
} from '@/types/module.types';

// ============================================================================
// Types
// ============================================================================

export interface ServiceDeps {
  db: DrizzleD1Database;
}

export interface UnitWithLessons extends Unit {
  lessons: Lesson[];
}

export interface ModuleWithUnits extends Module {
  units: UnitWithLessons[];
}

export interface ModuleWithEnrollment extends Module {
  enrollment?: Enrollment;
}

// ============================================================================
// ID Generation
// ============================================================================

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function generateEnrollmentKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// ============================================================================
// Authorization Helpers
// ============================================================================

export function canModifyModule(module: Module, user: AuthenticatedUser): boolean {
  const isOwner = module.userId === user.id;
  const isAdmin = user.role === AUTH_ROLES.ADMIN;
  return isOwner || isAdmin;
}

// ============================================================================
// Module Operations
// ============================================================================

export async function findModuleById(
  deps: ServiceDeps,
  id: string
): Promise<Module | null> {
  const [module] = await deps.db
    .select()
    .from(modules)
    .where(eq(modules.id, id))
    .limit(1);

  return module ?? null;
}

export async function listModulesForUser(
  deps: ServiceDeps,
  user: AuthenticatedUser,
  query: ListModulesQuery
): Promise<Module[] | ModuleWithEnrollment[]> {
  if (user.role === AUTH_ROLES.ADMIN) {
    // Admin sees all modules
    const conditions = query.status ? [eq(modules.status, query.status)] : [];
    return deps.db
      .select()
      .from(modules)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(modules.sortOrder), desc(modules.createdAt));
  }

  if (user.role === AUTH_ROLES.TEACHER) {
    // Teacher sees their own modules
    const conditions = [eq(modules.userId, user.id)];
    if (query.status) conditions.push(eq(modules.status, query.status));
    return deps.db
      .select()
      .from(modules)
      .where(and(...conditions))
      .orderBy(asc(modules.sortOrder), desc(modules.createdAt));
  }

  // Student sees enrolled modules
  const enrolledModules = await deps.db
    .select({
      module: modules,
      enrollment: enrollments,
    })
    .from(enrollments)
    .innerJoin(modules, eq(enrollments.moduleId, modules.id))
    .where(
      and(
        eq(enrollments.userId, user.id),
        eq(enrollments.status, 'active'),
        eq(modules.status, 'published')
      )
    )
    .orderBy(desc(enrollments.enrolledAt));

  return enrolledModules.map((e) => ({
    ...e.module,
    enrollment: e.enrollment,
  }));
}

export async function getModuleWithContent(
  deps: ServiceDeps,
  moduleId: string
): Promise<ModuleWithUnits | null> {
  const foundModule = await findModuleById(deps, moduleId);
  if (!foundModule) return null;

  // Get units with lessons
  const moduleUnits = await deps.db
    .select()
    .from(units)
    .where(eq(units.moduleId, moduleId))
    .orderBy(asc(units.sortOrder));

  const unitsWithLessons = await Promise.all(
    moduleUnits.map(async (unit) => {
      const unitLessons = await deps.db
        .select()
        .from(lessons)
        .where(eq(lessons.unitId, unit.id))
        .orderBy(asc(lessons.sortOrder));

      return {
        ...unit,
        lessons: unitLessons,
      };
    })
  );

  return {
    ...foundModule,
    units: unitsWithLessons,
  };
}

export async function checkModuleAccess(
  deps: ServiceDeps,
  module: Module,
  user: AuthenticatedUser
): Promise<boolean> {
  const isOwner = module.userId === user.id;
  const isAdmin = user.role === AUTH_ROLES.ADMIN;

  if (isOwner || isAdmin) return true;

  // Check if student is enrolled
  const [enrollment] = await deps.db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, user.id),
        eq(enrollments.moduleId, module.id),
        eq(enrollments.status, 'active')
      )
    )
    .limit(1);

  // Allow access if enrolled or if module is published (for preview)
  return !!enrollment || module.status === 'published';
}

export async function createModule(
  deps: ServiceDeps,
  input: CreateModuleData,
  userId: string
): Promise<Module> {
  const moduleId = generateId('mod');
  const enrollmentKey = generateEnrollmentKey();

  await deps.db.insert(modules).values({
    id: moduleId,
    userId,
    title: input.title,
    description: input.description,
    coverImage: input.coverImage,
    enrollmentKey,
    status: input.status,
    sortOrder: 0,
  });

  const [newModule] = await deps.db
    .select()
    .from(modules)
    .where(eq(modules.id, moduleId))
    .limit(1);

  return newModule;
}

export async function updateModule(
  deps: ServiceDeps,
  moduleId: string,
  input: UpdateModuleInput
): Promise<Module> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.coverImage !== undefined) updateData.coverImage = input.coverImage;
  if (input.enrollmentKey !== undefined) updateData.enrollmentKey = input.enrollmentKey;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

  await deps.db.update(modules).set(updateData).where(eq(modules.id, moduleId));

  const [updatedModule] = await deps.db
    .select()
    .from(modules)
    .where(eq(modules.id, moduleId))
    .limit(1);

  return updatedModule;
}

export async function deleteModule(deps: ServiceDeps, moduleId: string): Promise<void> {
  await deps.db.delete(modules).where(eq(modules.id, moduleId));
}

export async function regenerateModuleKey(
  deps: ServiceDeps,
  moduleId: string
): Promise<string> {
  const newKey = generateEnrollmentKey();

  await deps.db
    .update(modules)
    .set({
      enrollmentKey: newKey,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    })
    .where(eq(modules.id, moduleId));

  return newKey;
}

// ============================================================================
// Unit Operations
// ============================================================================

export async function findUnitById(
  deps: ServiceDeps,
  unitId: string,
  moduleId: string
): Promise<Unit | null> {
  const [unit] = await deps.db
    .select()
    .from(units)
    .where(and(eq(units.id, unitId), eq(units.moduleId, moduleId)))
    .limit(1);

  return unit ?? null;
}

export async function getNextUnitSortOrder(
  deps: ServiceDeps,
  moduleId: string
): Promise<number> {
  const existingUnits = await deps.db
    .select({ sortOrder: units.sortOrder })
    .from(units)
    .where(eq(units.moduleId, moduleId))
    .orderBy(desc(units.sortOrder))
    .limit(1);

  return (existingUnits[0]?.sortOrder ?? -1) + 1;
}

export async function createUnit(
  deps: ServiceDeps,
  moduleId: string,
  input: CreateUnitData
): Promise<Unit> {
  const nextSortOrder = input.sortOrder ?? (await getNextUnitSortOrder(deps, moduleId));
  const unitId = generateId('unit');

  await deps.db.insert(units).values({
    id: unitId,
    moduleId,
    title: input.title,
    description: input.description,
    sortOrder: nextSortOrder,
  });

  const [newUnit] = await deps.db
    .select()
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1);

  return newUnit;
}

export async function updateUnit(
  deps: ServiceDeps,
  unitId: string,
  input: UpdateUnitInput
): Promise<Unit> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

  await deps.db.update(units).set(updateData).where(eq(units.id, unitId));

  const [updatedUnit] = await deps.db
    .select()
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1);

  return updatedUnit;
}

export async function deleteUnit(deps: ServiceDeps, unitId: string): Promise<void> {
  await deps.db.delete(units).where(eq(units.id, unitId));
}

// ============================================================================
// Lesson Operations
// ============================================================================

export async function findLessonById(
  deps: ServiceDeps,
  lessonId: string,
  unitId: string
): Promise<Lesson | null> {
  const [lesson] = await deps.db
    .select()
    .from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.unitId, unitId)))
    .limit(1);

  return lesson ?? null;
}

export async function getNextLessonSortOrder(
  deps: ServiceDeps,
  unitId: string
): Promise<number> {
  const existingLessons = await deps.db
    .select({ sortOrder: lessons.sortOrder })
    .from(lessons)
    .where(eq(lessons.unitId, unitId))
    .orderBy(desc(lessons.sortOrder))
    .limit(1);

  return (existingLessons[0]?.sortOrder ?? -1) + 1;
}

export async function createLesson(
  deps: ServiceDeps,
  unitId: string,
  input: CreateLessonData
): Promise<Lesson> {
  const nextSortOrder = input.sortOrder ?? (await getNextLessonSortOrder(deps, unitId));
  const lessonId = generateId('les');

  await deps.db.insert(lessons).values({
    id: lessonId,
    unitId,
    title: input.title,
    description: input.description,
    contentType: input.contentType,
    isFree: input.isFree,
    sortOrder: nextSortOrder,
  });

  const [newLesson] = await deps.db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  return newLesson;
}

export async function updateLesson(
  deps: ServiceDeps,
  lessonId: string,
  input: UpdateLessonInput
): Promise<Lesson> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.contentType !== undefined) updateData.contentType = input.contentType;
  if (input.isFree !== undefined) updateData.isFree = input.isFree;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

  await deps.db.update(lessons).set(updateData).where(eq(lessons.id, lessonId));

  const [updatedLesson] = await deps.db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  return updatedLesson;
}

export async function deleteLesson(deps: ServiceDeps, lessonId: string): Promise<void> {
  await deps.db.delete(lessons).where(eq(lessons.id, lessonId));
}
