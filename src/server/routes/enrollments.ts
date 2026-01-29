import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { HonoEnv } from '@/types/cloudflare';
import { ApiErrors } from '../middleware/error';
import { authMiddleware, getAuthenticatedUser } from '../middleware/auth';
import {
  joinModuleSchema,
  listEnrollmentsQuerySchema,
  updateProgressSchema,
} from '@/types/enrollment.types';
import {
  joinModule,
  listUserEnrollments,
  getEnrollmentWithModule,
  cancelEnrollment,
  getModuleProgress,
  updateLessonProgress,
  getModuleEnrollments,
  findActiveEnrollment,
  findLessonById,
  canViewModuleEnrollments,
  type ServiceDeps,
} from '../services/enrollment.service';
import { findModuleById } from '../services/module.service';

const enrollmentsRoutes = new Hono<HonoEnv>();

// ============================================================================
// Helpers
// ============================================================================

function getDeps(env: HonoEnv['Bindings']): ServiceDeps {
  return { db: drizzle(env.DB) };
}

// ============================================================================
// ENROLLMENT ROUTES
// ============================================================================

/**
 * POST /enrollments/join
 * Enroll in a module using enrollment key (Student only)
 */
enrollmentsRoutes.post('/enrollments/join', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const body = await c.req.json();
  const input = joinModuleSchema.parse(body);

  try {
    const result = await joinModule(getDeps(c.env), input, user.id);

    return c.json({
      success: true,
      data: result,
    }, 201);
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'MODULE_NOT_FOUND':
          throw ApiErrors.notFound('Module with this enrollment key');
        case 'MODULE_NOT_AVAILABLE':
          throw ApiErrors.badRequest('This module is not available for enrollment');
        case 'ALREADY_ENROLLED':
          throw ApiErrors.conflict('You are already enrolled in this module');
      }
    }
    throw error;
  }
});

/**
 * GET /enrollments
 * List user's enrollments
 */
enrollmentsRoutes.get('/enrollments', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const query = listEnrollmentsQuerySchema.parse({
    status: c.req.query('status'),
  });

  const userEnrollments = await listUserEnrollments(getDeps(c.env), user.id, query);

  return c.json({
    success: true,
    data: { enrollments: userEnrollments },
  });
});

/**
 * GET /enrollments/:moduleId
 * Get enrollment details for a module
 */
enrollmentsRoutes.get('/enrollments/:moduleId', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');

  const result = await getEnrollmentWithModule(getDeps(c.env), user.id, moduleId);

  if (!result) {
    throw ApiErrors.notFound('Enrollment');
  }

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * DELETE /enrollments/:moduleId
 * Leave a module (cancel enrollment)
 */
enrollmentsRoutes.delete('/enrollments/:moduleId', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');

  try {
    await cancelEnrollment(getDeps(c.env), user.id, moduleId);

    return c.json({
      success: true,
      data: { cancelled: true, moduleId },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ENROLLMENT_NOT_FOUND') {
      throw ApiErrors.notFound('Enrollment');
    }
    throw error;
  }
});

/**
 * GET /enrollments/:moduleId/progress
 * Get progress for all lessons in a module
 */
enrollmentsRoutes.get('/enrollments/:moduleId/progress', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');
  const deps = getDeps(c.env);

  // Verify active enrollment
  const enrollment = await findActiveEnrollment(deps, user.id, moduleId);

  if (!enrollment) {
    throw ApiErrors.forbidden('You are not enrolled in this module');
  }

  const result = await getModuleProgress(deps, user.id, moduleId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /enrollments/:moduleId/lessons/:lessonId/progress
 * Update lesson progress
 */
enrollmentsRoutes.post('/enrollments/:moduleId/lessons/:lessonId/progress', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');
  const lessonId = c.req.param('lessonId');
  const body = await c.req.json();
  const input = updateProgressSchema.parse(body);
  const deps = getDeps(c.env);

  // Verify active enrollment
  const enrollment = await findActiveEnrollment(deps, user.id, moduleId);

  if (!enrollment) {
    throw ApiErrors.forbidden('You are not enrolled in this module');
  }

  // Verify lesson exists
  const lesson = await findLessonById(deps, lessonId);

  if (!lesson) {
    throw ApiErrors.notFound('Lesson', lessonId);
  }

  const progress = await updateLessonProgress(deps, user.id, lessonId, input);

  return c.json({
    success: true,
    data: { progress },
  });
});

/**
 * GET /modules/:moduleId/enrollments (Teacher view)
 * List all enrollments for a module
 */
enrollmentsRoutes.get('/modules/:moduleId/enrollments', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');
  const deps = getDeps(c.env);

  // Verify module exists and user has access
  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  if (!canViewModuleEnrollments(foundModule, user)) {
    throw ApiErrors.forbidden('You do not have permission to view enrollments');
  }

  const moduleEnrollments = await getModuleEnrollments(deps, moduleId);

  return c.json({
    success: true,
    data: { enrollments: moduleEnrollments },
  });
});

export default enrollmentsRoutes;
