import { getAuthSession } from "@/lib/auth-server";
import type { UserRole } from "@/types/auth.types";
import { ROLE_HIERARCHY } from "@/types/auth.types";

type RoleGateProps = {
  /** Roles that are allowed to see the children */
  allowed: UserRole[];
  /** Content to show if user has the required role */
  children: React.ReactNode;
  /** Optional fallback content if user doesn't have the role */
  fallback?: React.ReactNode;
};

/**
 * Server Component that conditionally renders children based on user role
 */
export async function RoleGate({
  allowed,
  children,
  fallback = null,
}: RoleGateProps) {
  const session = await getAuthSession();
  const role = session?.user?.role as UserRole | undefined;

  if (!role || !allowed.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

type MinRoleGateProps = {
  /** Minimum role level required (uses hierarchy: admin > teacher > student) */
  minRole: UserRole;
  /** Content to show if user meets the minimum role */
  children: React.ReactNode;
  /** Optional fallback content */
  fallback?: React.ReactNode;
};

/**
 * Server Component that renders children if user meets minimum role level
 * Uses role hierarchy: admin > teacher > student
 */
export async function MinRoleGate({
  minRole,
  children,
  fallback = null,
}: MinRoleGateProps) {
  const session = await getAuthSession();
  const role = session?.user?.role as UserRole | undefined;

  if (!role) {
    return <>{fallback}</>;
  }

  const userLevel = ROLE_HIERARCHY[role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Convenience components for common role checks
 */
export async function TeacherOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <MinRoleGate minRole="teacher" fallback={fallback}>
      {children}
    </MinRoleGate>
  );
}

export async function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGate allowed={["admin"]} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

export async function StudentOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGate allowed={["student"]} fallback={fallback}>
      {children}
    </RoleGate>
  );
}
