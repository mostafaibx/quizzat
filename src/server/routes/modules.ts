import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { HonoEnv } from '@/types/cloudflare';
import { ApiErrors } from '../middleware/error';
import { authMiddleware, requireTeacher, getAuthenticatedUser } from '../middleware/auth';
import {
  createModuleSchema,
  updateModuleSchema,
  listModulesQuerySchema,
  createUnitSchema,
  updateUnitSchema,
  createLessonSchema,
  updateLessonSchema,
} from '@/types/module.types';
import {
  findModuleById,
  listModulesForUser,
  getModuleWithContent,
  checkModuleAccess,
  createModule,
  updateModule,
  deleteModule,
  regenerateModuleKey,
  findUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  findLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  canModifyModule,
  type ServiceDeps,
} from '../services/module.service';

const modulesRoutes = new Hono<HonoEnv>();

// ============================================================================
// Helpers
// ============================================================================

function getDeps(env: HonoEnv['Bindings']): ServiceDeps {
  return { db: drizzle(env.DB) };
}

// ============================================================================
// MODULE ROUTES
// ============================================================================

/**
 * GET /modules
 * List modules for teacher (their own) or student (enrolled)
 */
modulesRoutes.get('/modules', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const query = listModulesQuerySchema.parse({
    status: c.req.query('status'),
  });

  const moduleList = await listModulesForUser(getDeps(c.env), user, query);

  return c.json({
    success: true,
    data: { modules: moduleList },
  });
});

/**
 * GET /modules/:id
 * Get module details with units and lessons
 */
modulesRoutes.get('/modules/:id', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('id');
  const deps = getDeps(c.env);

  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  const hasAccess = await checkModuleAccess(deps, foundModule, user);
  if (!hasAccess) {
    throw ApiErrors.forbidden('You do not have access to this module');
  }

  const moduleWithContent = await getModuleWithContent(deps, moduleId);

  return c.json({
    success: true,
    data: { module: moduleWithContent },
  });
});

/**
 * POST /modules
 * Create a new module (Teacher/Admin only)
 */
modulesRoutes.post('/modules', requireTeacher, async (c) => {
  const user = getAuthenticatedUser(c);
  const body = await c.req.json();
  const input = createModuleSchema.parse(body);

  const newModule = await createModule(getDeps(c.env), input, user.id);

  return c.json({
    success: true,
    data: { module: newModule },
  }, 201);
});

/**
 * PATCH /modules/:id
 * Update a module (Owner/Admin only)
 */
modulesRoutes.patch('/modules/:id', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('id');
  const body = await c.req.json();
  const input = updateModuleSchema.parse(body);
  const deps = getDeps(c.env);

  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  if (!canModifyModule(foundModule, user)) {
    throw ApiErrors.forbidden('You do not have permission to update this module');
  }

  const updatedModule = await updateModule(deps, moduleId, input);

  return c.json({
    success: true,
    data: { module: updatedModule },
  });
});

/**
 * DELETE /modules/:id
 * Delete a module (Owner/Admin only)
 */
modulesRoutes.delete('/modules/:id', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('id');
  const deps = getDeps(c.env);

  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  if (!canModifyModule(foundModule, user)) {
    throw ApiErrors.forbidden('You do not have permission to delete this module');
  }

  await deleteModule(deps, moduleId);

  return c.json({
    success: true,
    data: { deleted: true, moduleId },
  });
});

/**
 * POST /modules/:id/regenerate-key
 * Regenerate enrollment key (Owner/Admin only)
 */
modulesRoutes.post('/modules/:id/regenerate-key', authMiddleware, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('id');
  const deps = getDeps(c.env);

  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  if (!canModifyModule(foundModule, user)) {
    throw ApiErrors.forbidden('You do not have permission to regenerate the enrollment key');
  }

  const newKey = await regenerateModuleKey(deps, moduleId);

  return c.json({
    success: true,
    data: { enrollmentKey: newKey },
  });
});

// ============================================================================
// UNIT ROUTES
// ============================================================================

/**
 * POST /modules/:moduleId/units
 * Create a unit in a module
 */
modulesRoutes.post('/modules/:moduleId/units', requireTeacher, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');
  const body = await c.req.json();
  const input = createUnitSchema.parse(body);
  const deps = getDeps(c.env);

  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  if (!canModifyModule(foundModule, user)) {
    throw ApiErrors.forbidden('You do not have permission to add units to this module');
  }

  const newUnit = await createUnit(deps, moduleId, input);

  return c.json({
    success: true,
    data: { unit: newUnit },
  }, 201);
});

/**
 * PATCH /modules/:moduleId/units/:unitId
 * Update a unit
 */
modulesRoutes.patch('/modules/:moduleId/units/:unitId', requireTeacher, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');
  const unitId = c.req.param('unitId');
  const body = await c.req.json();
  const input = updateUnitSchema.parse(body);
  const deps = getDeps(c.env);

  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  if (!canModifyModule(foundModule, user)) {
    throw ApiErrors.forbidden('You do not have permission to update this unit');
  }

  const unit = await findUnitById(deps, unitId, moduleId);

  if (!unit) {
    throw ApiErrors.notFound('Unit', unitId);
  }

  const updatedUnit = await updateUnit(deps, unitId, input);

  return c.json({
    success: true,
    data: { unit: updatedUnit },
  });
});

/**
 * DELETE /modules/:moduleId/units/:unitId
 * Delete a unit
 */
modulesRoutes.delete('/modules/:moduleId/units/:unitId', requireTeacher, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');
  const unitId = c.req.param('unitId');
  const deps = getDeps(c.env);

  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  if (!canModifyModule(foundModule, user)) {
    throw ApiErrors.forbidden('You do not have permission to delete this unit');
  }

  const unit = await findUnitById(deps, unitId, moduleId);

  if (!unit) {
    throw ApiErrors.notFound('Unit', unitId);
  }

  await deleteUnit(deps, unitId);

  return c.json({
    success: true,
    data: { deleted: true, unitId },
  });
});

// ============================================================================
// LESSON ROUTES
// ============================================================================

/**
 * POST /modules/:moduleId/units/:unitId/lessons
 * Create a lesson in a unit
 */
modulesRoutes.post('/modules/:moduleId/units/:unitId/lessons', requireTeacher, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');
  const unitId = c.req.param('unitId');
  const body = await c.req.json();
  const input = createLessonSchema.parse(body);
  const deps = getDeps(c.env);

  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  if (!canModifyModule(foundModule, user)) {
    throw ApiErrors.forbidden('You do not have permission to add lessons');
  }

  const unit = await findUnitById(deps, unitId, moduleId);

  if (!unit) {
    throw ApiErrors.notFound('Unit', unitId);
  }

  const newLesson = await createLesson(deps, unitId, input);

  return c.json({
    success: true,
    data: { lesson: newLesson },
  }, 201);
});

/**
 * PATCH /modules/:moduleId/units/:unitId/lessons/:lessonId
 * Update a lesson
 */
modulesRoutes.patch('/modules/:moduleId/units/:unitId/lessons/:lessonId', requireTeacher, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');
  const unitId = c.req.param('unitId');
  const lessonId = c.req.param('lessonId');
  const body = await c.req.json();
  const input = updateLessonSchema.parse(body);
  const deps = getDeps(c.env);

  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  if (!canModifyModule(foundModule, user)) {
    throw ApiErrors.forbidden('You do not have permission to update this lesson');
  }

  const lesson = await findLessonById(deps, lessonId, unitId);

  if (!lesson) {
    throw ApiErrors.notFound('Lesson', lessonId);
  }

  const updatedLesson = await updateLesson(deps, lessonId, input);

  return c.json({
    success: true,
    data: { lesson: updatedLesson },
  });
});

/**
 * DELETE /modules/:moduleId/units/:unitId/lessons/:lessonId
 * Delete a lesson
 */
modulesRoutes.delete('/modules/:moduleId/units/:unitId/lessons/:lessonId', requireTeacher, async (c) => {
  const user = getAuthenticatedUser(c);
  const moduleId = c.req.param('moduleId');
  const unitId = c.req.param('unitId');
  const lessonId = c.req.param('lessonId');
  const deps = getDeps(c.env);

  const foundModule = await findModuleById(deps, moduleId);

  if (!foundModule) {
    throw ApiErrors.notFound('Module', moduleId);
  }

  if (!canModifyModule(foundModule, user)) {
    throw ApiErrors.forbidden('You do not have permission to delete this lesson');
  }

  const lesson = await findLessonById(deps, lessonId, unitId);

  if (!lesson) {
    throw ApiErrors.notFound('Lesson', lessonId);
  }

  await deleteLesson(deps, lessonId);

  return c.json({
    success: true,
    data: { deleted: true, lessonId },
  });
});

export default modulesRoutes;
