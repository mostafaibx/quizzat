import { getServerSession } from "next-auth";
import { getAuthOptions } from "./auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types/auth.types";
import { AUTH_ROLES, ROLE_HIERARCHY } from "@/types/auth.types";

export async function getAuthSession() {
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/signin");
  }
  return session;
}

/**
 * Get the current user's role from session
 */
export async function getUserRole(): Promise<UserRole> {
  const session = await getAuthSession();
  return (session?.user?.role as UserRole) || AUTH_ROLES.STUDENT;
}

/**
 * Check if user has at least the required role level
 * Uses hierarchy: admin > teacher > student
 */
export async function hasRoleLevel(requiredRole: UserRole): Promise<boolean> {
  const userRole = await getUserRole();
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Check if current user is a teacher or admin
 */
export async function isTeacherOrAbove(): Promise<boolean> {
  return hasRoleLevel(AUTH_ROLES.TEACHER);
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === AUTH_ROLES.ADMIN;
}

/**
 * Require a minimum role level, redirect if not met
 */
export async function requireRole(requiredRole: UserRole, redirectTo?: string) {
  const session = await requireAuth();
  const hasAccess = await hasRoleLevel(requiredRole);

  if (!hasAccess) {
    redirect(redirectTo || "/dashboard");
  }

  return session;
}
