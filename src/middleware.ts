import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import { getToken } from "next-auth/jwt";
import { locales, defaultLocale } from '@/i18n/config';
import type { JWT } from "next-auth/jwt";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true
});

// Auth pages (redirect away if already logged in)
const authPages = ['/auth/signin', '/auth/signup'];

// Routes that require authentication only (any authenticated user)
const authOnlyRoutes = [
  '/files',
  '/quiz'
];

// Routes with role-based access control
const roleProtectedRoutes: Record<string, string[]> = {
  '/teacher': ['teacher', 'admin'],
  '/videos/upload': ['teacher', 'admin'],
  '/admin': ['admin'],
};

// Routes accessible to any authenticated user (but still require auth)
const authenticatedRoutes = [
  '/learn',
  '/videos',
];

// Helper to remove locale prefix from pathname
function getPathWithoutLocale(pathname: string): string {
  const localePattern = new RegExp(`^/(${locales.join('|')})`);
  return pathname.replace(localePattern, '') || '/';
}

// Helper to check if path matches a route pattern
function matchesRoute(path: string, route: string): boolean {
  return path === route || path.startsWith(`${route}/`);
}

// Helper to get required roles for a path
function getRequiredRoles(pathWithoutLocale: string): string[] | null {
  for (const [route, roles] of Object.entries(roleProtectedRoutes)) {
    if (matchesRoute(pathWithoutLocale, route)) {
      return roles;
    }
  }
  return null;
}

// Helper to check if path requires authentication
function requiresAuth(pathWithoutLocale: string): boolean {
  // Check auth-only routes
  if (authOnlyRoutes.some(route => matchesRoute(pathWithoutLocale, route))) {
    return true;
  }
  // Check role-protected routes
  if (getRequiredRoles(pathWithoutLocale)) {
    return true;
  }
  // Check authenticated routes
  if (authenticatedRoutes.some(route => matchesRoute(pathWithoutLocale, route))) {
    return true;
  }
  return false;
}

// Helper to get redirect path based on user role
function getRoleBasedRedirect(role: string | undefined): string {
  switch (role) {
    case 'admin':
    case 'teacher':
      return '/teacher';
    case 'student':
      return '/learn';
    default:
      return '/';
  }
}

// Helper to get the current locale from pathname
function getLocaleFromPath(pathname: string): string {
  const match = pathname.match(new RegExp(`^/(${locales.join('|')})`));
  return match ? match[1] : defaultLocale;
}

const authMiddleware = withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const pathWithoutLocale = getPathWithoutLocale(pathname);
    const locale = getLocaleFromPath(pathname);
    const token = req.nextauth.token as JWT & { role?: string };
    const userRole = token?.role as string | undefined;

    // Check role-based access
    const requiredRoles = getRequiredRoles(pathWithoutLocale);
    if (requiredRoles && userRole) {
      if (!requiredRoles.includes(userRole)) {
        // User doesn't have the required role - redirect to their appropriate dashboard
        const redirectPath = getRoleBasedRedirect(userRole);
        const url = new URL(`/${locale}${redirectPath}`, req.url);
        url.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(url);
      }
    }

    // User is authenticated and has access - continue with intl middleware
    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const pathWithoutLocale = getPathWithoutLocale(pathname);

        // Check if this route requires authentication
        if (requiresAuth(pathWithoutLocale)) {
          return !!token;
        }

        // Public route - allow access
        return true;
      },
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/signin',
    }
  }
);

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  const locale = getLocaleFromPath(pathname);

  // Handle /dashboard redirect - redirect to role-based destination
  if (pathWithoutLocale === '/dashboard' || pathWithoutLocale.startsWith('/dashboard/')) {
    const token = await getToken({ req }) as JWT & { role?: string } | null;
    if (token) {
      const redirectPath = getRoleBasedRedirect(token.role);
      return NextResponse.redirect(new URL(`/${locale}${redirectPath}`, req.url));
    }
    // Not logged in, redirect to signin
    return NextResponse.redirect(new URL(`/${locale}/auth/signin`, req.url));
  }

  // Redirect authenticated users away from auth pages
  if (authPages.some(page => matchesRoute(pathWithoutLocale, page))) {
    const token = await getToken({ req });
    if (token) {
      const redirectPath = getRoleBasedRedirect((token as JWT & { role?: string }).role);
      return NextResponse.redirect(new URL(`/${locale}${redirectPath}`, req.url));
    }
    // Not logged in, continue to auth page
    return intlMiddleware(req);
  }

  // Check if this route requires authentication or role checking
  if (requiresAuth(pathWithoutLocale)) {
    // Use auth middleware for protected routes
    return (authMiddleware as (req: NextRequest) => ReturnType<typeof intlMiddleware>)(req);
  }

  // For public routes, just apply intl middleware
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    '/',
    '/(ar|en)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
