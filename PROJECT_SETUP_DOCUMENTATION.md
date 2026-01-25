# Project Setup Documentation

This document provides comprehensive documentation for setting up a Next.js 15 application on Cloudflare Workers with OpenNext, Hono backend API, and NextAuth authentication. Use this as context when building similar applications.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Cloudflare + OpenNext Setup](#cloudflare--opennext-setup)
4. [Hono Backend API](#hono-backend-api)
5. [Authentication (NextAuth)](#authentication-nextauth)
6. [Database (Drizzle + D1)](#database-drizzle--d1)
7. [Storage (R2)](#storage-r2)
8. [Type System](#type-system)
9. [RPC Client Pattern](#rpc-client-pattern)
10. [Environment Variables](#environment-variables)
11. [Development Workflow](#development-workflow)
12. [Deployment](#deployment)

---

## Technology Stack

### Core
- **Next.js 15.5.4** - React framework with App Router
- **React 19.1.0** - UI library
- **TypeScript 5** - Type safety
- **Hono 4.9.9** - Lightweight web framework for API routes

### Cloudflare
- **@opennextjs/cloudflare 1.9.0** - Adapter to run Next.js on Cloudflare Workers
- **Wrangler 4.40.2** - Cloudflare CLI tool
- **Cloudflare D1** - SQLite database
- **Cloudflare R2** - Object storage
- **Cloudflare KV** - Key-value storage (for caching)
- **Cloudflare Vectorize** - Vector database (optional, for RAG)
- **Cloudflare Workers AI** - AI inference (optional)

### Authentication
- **next-auth 4.24.11** - Authentication library
- **@auth/drizzle-adapter 1.10.0** - Drizzle adapter for NextAuth
- **bcryptjs 3.0.2** - Password hashing
- **jose 6.1.0** - JWT handling

### Database
- **drizzle-orm 0.44.5** - TypeScript ORM
- **drizzle-kit 0.31.5** - Database migrations

### Validation
- **zod 4.1.11** - Schema validation
- **@hono/zod-validator 0.7.3** - Hono Zod middleware

### Key Dependencies (package.json)
```json
{
  "dependencies": {
    "@auth/drizzle-adapter": "^1.10.0",
    "@hono/zod-validator": "^0.7.3",
    "@opennextjs/cloudflare": "^1.9.0",
    "@panva/hkdf": "^1.2.1",
    "bcryptjs": "^3.0.2",
    "drizzle-orm": "^0.44.5",
    "hono": "^4.9.9",
    "jose": "^6.1.0",
    "nanoid": "^5.1.6",
    "next": "15.5.4",
    "next-auth": "4.24.11",
    "react": "19.1.0",
    "zod": "^4.1.11"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250927.0",
    "drizzle-kit": "^0.31.5",
    "wrangler": "^4.40.2"
  }
}
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── [[...route]]/
│   │   │   └── route.ts          # Hono catch-all handler
│   │   └── auth/
│   │       ├── [...nextauth]/
│   │       │   └── route.ts      # NextAuth handler
│   │       └── signup/
│   │           └── route.ts      # Custom signup endpoint
│   ├── [locale]/                 # i18n routing
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── auth/                 # Auth pages
│   │   └── dashboard/            # Protected routes
│   ├── globals.css
│   └── layout.tsx
├── components/
│   └── ui/                       # UI components
├── db/
│   ├── index.ts                  # Database connection
│   ├── schema.ts                 # Drizzle schema
│   └── migrations/               # SQL migrations
├── hooks/                        # Custom React hooks
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── auth-server.ts            # Server-side auth helpers
│   ├── auth-utils.ts             # Auth utilities
│   ├── auth-constants.ts         # Auth constants
│   ├── rpc/                      # Type-safe API clients
│   │   ├── index.ts
│   │   └── files.ts
│   └── utils.ts
├── server/
│   ├── hono.ts                   # Main Hono app
│   ├── middleware/
│   │   ├── auth.ts               # Auth middleware
│   │   └── error.ts              # Error handling
│   ├── routes/
│   │   ├── files.ts
│   │   ├── user.ts
│   │   └── ...                   # Other route files
│   └── services/                 # Business logic
├── types/
│   ├── auth.types.ts             # Auth types
│   └── cloudflare.ts             # Cloudflare bindings types
├── utils/
│   └── helpers.ts                # Helper functions
└── i18n/
    └── config.ts                 # i18n configuration

# Root files
├── open-next.config.ts           # OpenNext configuration
├── wrangler.jsonc                # Cloudflare Wrangler config
├── drizzle.config.ts             # Drizzle configuration
├── next.config.ts                # Next.js configuration
├── tsconfig.json
└── package.json
```

---

## Cloudflare + OpenNext Setup

### 1. OpenNext Configuration

```typescript
// open-next.config.ts
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
```

### 2. Wrangler Configuration

```jsonc
// wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "your-app-name",
  "compatibility_date": "2025-09-27",
  "compatibility_flags": ["nodejs_compat"],

  // D1 Database
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "your-db-name",
      "database_id": "your-database-id",
      "migrations_dir": "./src/db/migrations"
    }
  ],

  // R2 Storage
  "r2_buckets": [
    {
      "binding": "FILES",
      "bucket_name": "your-bucket-name",
      "preview_bucket_name": "your-bucket-preview"
    }
  ],

  // KV for caching (required for OpenNext incremental cache)
  "kv_namespaces": [
    {
      "binding": "NEXT_INC_CACHE_KV",
      "id": "your-kv-id",
      "preview_id": "your-preview-kv-id"
    }
  ],

  // Optional: Vectorize for RAG
  "vectorize": [
    {
      "binding": "VECTORIZE",
      "index_name": "your-index-name"
    }
  ],

  // Optional: Workers AI
  "ai": {
    "binding": "AI"
  },

  // Dev settings
  "dev": {
    "port": 3000
  },

  // Static assets
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },

  // Environment-specific configuration
  "env": {
    "development": {
      "vars": {
        "NODE_ENV": "development",
        "NEXT_PUBLIC_APP_URL": "http://localhost:3000"
      }
    },
    "production": {
      "vars": {
        "NODE_ENV": "production",
        "NEXT_PUBLIC_APP_URL": "https://your-domain.com"
      }
    }
  }
}
```

### 3. Next.js Configuration

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverMinification: false,
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
```

### 4. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 5. Getting Cloudflare Context

```typescript
// src/utils/helpers.ts
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getEnv() {
  try {
    const cfContext = await getCloudflareContext({ async: true });
    if (cfContext && cfContext.env) {
      return {
        ...cfContext.env,
        NODE_ENV: process.env.NODE_ENV,
      };
    }
  } catch (error) {
    console.warn('Failed to get Cloudflare context:', error);
  }

  // Fallback to process.env
  return process.env as Record<string, string>;
}
```

---

## Hono Backend API

### 1. Main Hono Application

```typescript
// src/server/hono.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { NextRequest } from 'next/server';
import { errorHandler, ApiErrors } from './middleware/error';
import type { HonoEnv } from '@/types/cloudflare';

// Import routes
import files from './routes/files';
import user from './routes/user';

const app = new Hono<HonoEnv>().basePath('/api');

// Request ID middleware
app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);
  await next();
});

// Global middleware
app.use('*', logger());

// CORS
app.use('/api/*', cors({
  origin: (origin) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  credentials: true,
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Mount routes
const routes = app
  .route('/files', files)
  .route('/user', user);

// 404 handler
app.notFound(() => {
  throw ApiErrors.notFound('Endpoint');
});

// Global error handler
app.onError(errorHandler);

export default app;
export type AppType = typeof routes;

// Next.js API route handler for Hono
export async function honoHandler(req: NextRequest) {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const cfContext = await getCloudflareContext();
  return app.fetch(req, cfContext?.env);
}
```

### 2. Next.js Catch-All Route

```typescript
// src/app/api/[[...route]]/route.ts
import { honoHandler } from '@/server/hono';

export const GET = honoHandler;
export const POST = honoHandler;
export const PUT = honoHandler;
export const DELETE = honoHandler;
export const PATCH = honoHandler;
```

### 3. Error Handling Middleware

```typescript
// src/server/middleware/error.ts
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import type { HonoEnv } from '@/types/cloudflare';

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    timestamp: string;
  };
  stack?: string;
};

export function errorHandler(err: Error | HTTPException, c: Context<HonoEnv>): Response {
  const requestId = c.get('requestId');
  const timestamp = new Date().toISOString();
  const isDev = c.env.NODE_ENV !== 'production';

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.format(),
        requestId,
        timestamp,
      },
    };
    return c.json(response, 400);
  }

  // Handle HTTPException
  if (err instanceof HTTPException) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: (err.cause as string) ?? 'HTTP_EXCEPTION',
        message: err.message,
        requestId,
        timestamp,
      },
      ...(isDev && { stack: err.stack }),
    };
    return c.json(response, { status: err.status });
  }

  // Default error
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'An unexpected error occurred',
      requestId,
      timestamp,
    },
    ...(isDev && { stack: err.stack }),
  };
  return c.json(response, 500);
}

// Error factory helpers
function createHttpException(
  status: ContentfulStatusCode,
  code: string,
  message: string,
): HTTPException {
  return new HTTPException(status, { message, cause: code });
}

export const ApiErrors = {
  badRequest: (message = 'Bad request') =>
    createHttpException(400, 'BAD_REQUEST', message),
  unauthorized: (message = 'Authentication required') =>
    createHttpException(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Insufficient permissions') =>
    createHttpException(403, 'FORBIDDEN', message),
  notFound: (resource: string, id?: string) =>
    createHttpException(404, 'NOT_FOUND',
      id ? `${resource} with ID '${id}' not found` : `${resource} not found`),
  conflict: (message: string) =>
    createHttpException(409, 'CONFLICT', message),
  unprocessable: (message: string) =>
    createHttpException(422, 'UNPROCESSABLE_ENTITY', message),
  internal: (message = 'Internal server error') =>
    createHttpException(500, 'INTERNAL_ERROR', message),
};
```

### 4. Example Route File

```typescript
// src/server/routes/files.ts
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ApiErrors } from '../middleware/error';
import type { HonoEnv } from '@/types/cloudflare';
import { requireAuth } from '../middleware/auth';
import { drizzle } from 'drizzle-orm/d1';
import { files } from '@/db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono<HonoEnv>()

// Protected route example
.get('/:id', requireAuth(), async (c) => {
  const fileId = c.req.param('id');
  const user = c.get('user');
  const userId = user?.id;

  if (!userId) {
    throw ApiErrors.unauthorized('User not authenticated');
  }

  const db = drizzle(c.env.DB);

  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (!file) {
    throw ApiErrors.notFound('File', fileId);
  }

  if (file.ownerId !== userId) {
    throw ApiErrors.forbidden('You do not have access to this file');
  }

  return c.json({ success: true, data: { file } });
})

// Upload endpoint
.post('/upload', requireAuth(), async (c) => {
  const user = c.get('user');
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  // Process file...

  return c.json({ success: true, data: { /* ... */ } });
});

export default app;
```

---

## Authentication (NextAuth)

### 1. NextAuth Configuration

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { UserRole } from "@/types/auth.types";

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const db = await getDb();

  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    session: { strategy: "jwt" },
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      CredentialsProvider({
        credentials: {
          email: { type: "email" },
          password: { type: "password" }
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;

          const db = await getDb();
          const user = await db.select().from(users)
            .where(eq(users.email, credentials.email))
            .limit(1).then(r => r[0]);

          if (!user?.password || !await bcrypt.compare(credentials.password, user.password)) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role as UserRole
          };
        },
      }),
    ],
    callbacks: {
      jwt: async ({ token, user, trigger }) => {
        if (user) {
          token.id = user.id;
          if ('role' in user && user.role) {
            token.role = user.role as UserRole;
          } else {
            const dbUser = await db.select({ role: users.role }).from(users)
              .where(eq(users.id, user.id))
              .limit(1).then(r => r[0]);
            token.role = (dbUser?.role as UserRole) || 'student';
          }
        }
        if (trigger === 'update' && token.id) {
          const dbUser = await db.select({ role: users.role }).from(users)
            .where(eq(users.id, token.id))
            .limit(1).then(r => r[0]);
          if (dbUser) token.role = dbUser.role as UserRole;
        }
        return token;
      },
      session: ({ session, token }) => {
        session.user.id = token.id;
        session.user.role = token.role;
        return session;
      },
    },
    pages: { signIn: "/auth/signin" },
  };
}

// Create user helper
export const createUser = async (email: string, password: string, name?: string) => {
  const db = await getDb();
  const userId = nanoid();

  const [user] = await db.insert(users).values({
    id: userId,
    email,
    password: await bcrypt.hash(password, 12),
    name,
  }).returning();

  return user;
};
```

### 2. NextAuth Route Handler

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { getAuthOptions } from "@/lib/auth";
import NextAuth from "next-auth";

let handlerInitialized = false;
let handlerModule: ReturnType<typeof NextAuth>;

async function initHandler() {
  if (!handlerInitialized) {
    const authOptions = await getAuthOptions();
    handlerModule = NextAuth(authOptions);
    handlerInitialized = true;
  }
  return handlerModule;
}

type RouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

export async function GET(req: Request, context: RouteContext) {
  const handler = await initHandler();
  const params = await context.params;
  return handler(req, { params });
}

export async function POST(req: Request, context: RouteContext) {
  const handler = await initHandler();
  const params = await context.params;
  return handler(req, { params });
}
```

### 3. Signup Route

```typescript
// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then(rows => rows[0]);

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const user = await createUser(email, password, name);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
```

### 4. Hono Auth Middleware

```typescript
// src/server/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { HonoEnv } from '@/types/cloudflare';
import type { AuthenticatedUser, AuthConfig, UserRole } from '@/types/auth.types';
import { AUTH_ROLES } from '@/types/auth.types';

export const authMiddleware = createMiddleware(async (c, next) => {
  try {
    const request = c.req.raw;
    const cookieHeader = request.headers.get('Cookie');

    if (!cookieHeader) {
      throw new HTTPException(401, { message: 'No authentication token' });
    }

    // Parse cookies
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const token = cookies['next-auth.session-token'] ||
                 cookies['__Secure-next-auth.session-token'];

    if (!token) {
      throw new HTTPException(401, { message: 'No authentication token' });
    }

    const secret = c.env?.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new HTTPException(500, { message: 'Auth not configured' });
    }

    // Decode JWT using next-auth
    const { decode } = await import('next-auth/jwt');
    const decoded = await decode({ token, secret });

    if (!decoded || !decoded.sub || !decoded.email) {
      throw new HTTPException(401, { message: 'Invalid token' });
    }

    // Build user object
    const user: AuthenticatedUser = {
      id: String(decoded.sub),
      email: String(decoded.email),
      name: decoded.name ? String(decoded.name) : undefined,
      role: (decoded.role as UserRole) || AUTH_ROLES.STUDENT,
      permissions: [],
    };

    c.set('user', user);
    await next();
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(500, { message: 'Auth error' });
  }
});

// Higher-order middleware with role checking
export function requireAuth(config?: AuthConfig) {
  return createMiddleware(async (c, next) => {
    await authMiddleware(c, () => Promise.resolve());

    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Not authenticated' });
    }

    if (config?.requiredRole) {
      const roleHierarchy = { student: 0, teacher: 1, admin: 2 };
      const userLevel = roleHierarchy[user.role] ?? 0;
      const requiredLevel = roleHierarchy[config.requiredRole] ?? 0;

      if (userLevel < requiredLevel) {
        throw new HTTPException(403, { message: 'Insufficient permissions' });
      }
    }

    await next();
  });
}

// Convenience middlewares
export const requireAdmin = requireAuth({ requiredRole: 'admin' });
export const requireTeacher = requireAuth({ requiredRole: 'teacher' });
```

### 5. Server-Side Auth Helpers

```typescript
// src/lib/auth-server.ts
import { getServerSession } from "next-auth";
import { getAuthOptions } from "./auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types/auth.types";

export async function getAuthSession() {
  const authOptions = await getAuthOptions();
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/signin");
  }
  return session;
}

export async function getUserRole(): Promise<UserRole> {
  const session = await getAuthSession();
  return (session?.user?.role as UserRole) || 'student';
}

export async function hasRoleLevel(requiredRole: UserRole): Promise<boolean> {
  const userRole = await getUserRole();
  const hierarchy = { student: 0, teacher: 1, admin: 2 };
  return (hierarchy[userRole] ?? 0) >= (hierarchy[requiredRole] ?? 0);
}
```

### 6. Auth Types

```typescript
// src/types/auth.types.ts
export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: UserRole;
  permissions?: string[];
}

export interface AuthConfig {
  requiredRole?: UserRole;
  requiredPermissions?: string[];
  requireAll?: boolean;
}

export const AUTH_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof AUTH_ROLES[keyof typeof AUTH_ROLES];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 0,
  teacher: 1,
  admin: 2,
};
```

---

## Database (Drizzle + D1)

### 1. Database Connection

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/d1';
import { getEnv } from '../utils/helpers';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!dbInstance) {
    const env = await getEnv();
    dbInstance = drizzle(env.DB as D1Database, {
      schema,
      logger: env.NODE_ENV !== 'production',
    });
  }
  return dbInstance;
}
```

### 2. Schema Definition

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Users table (NextAuth compatible)
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  emailVerified: integer("email_verified", { mode: 'timestamp' }),
  image: text("image"),
  password: text("password"),
  role: text("role").notNull().default('student'),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// NextAuth accounts table
export const accounts = sqliteTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

// NextAuth sessions table
export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: 'timestamp' }).notNull(),
});

// NextAuth verification tokens
export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: 'timestamp' }).notNull(),
});

// Example: Files table
export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  r2Key: text("r2_key").notNull().unique(),
  sizeBytes: integer("size_bytes").notNull(),
  mime: text("mime").notNull(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'error'
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// Type exports
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type File = InferSelectModel<typeof files>;
export type NewFile = InferInsertModel<typeof files>;
```

### 3. Drizzle Configuration

```typescript
// drizzle.config.ts
import fs from 'node:fs';
import path from 'node:path';
import type { Config } from 'drizzle-kit';
import { defineConfig } from 'drizzle-kit';

const LOCAL_DB_PATH = path.join(
  process.cwd(),
  '.wrangler/state/v3/d1/miniflare-D1DatabaseObject',
);

function findLocalDbFile() {
  try {
    const files = fs.readdirSync(LOCAL_DB_PATH);
    const dbFile = files.find(file => file.endsWith('.sqlite'));
    return dbFile ? path.join(LOCAL_DB_PATH, dbFile) : null;
  } catch {
    return null;
  }
}

export default process.env.NEXT_PUBLIC_WEBAPP_ENV === 'local'
  ? defineConfig({
      schema: './src/db/schema.ts',
      out: './src/db/migrations',
      dialect: 'sqlite',
      dbCredentials: {
        url: findLocalDbFile() || path.join(LOCAL_DB_PATH, 'database.sqlite'),
      },
    })
  : defineConfig({
      schema: './src/db/schema.ts',
      out: './src/db/migrations',
      driver: 'd1-http',
      dialect: 'sqlite',
      dbCredentials: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        token: process.env.CLOUDFLARE_API_TOKEN!,
        databaseId: process.env.D1_DATABASE_ID!,
      },
    }) satisfies Config;
```

### 4. Migration Commands (package.json)

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply DB --local",
    "db:migrate:prod": "wrangler d1 migrations apply DB --remote",
    "db:studio:local": "NEXT_PUBLIC_WEBAPP_ENV=local drizzle-kit studio",
    "db:reset:local": "rm -rf .wrangler/state/v3/d1 && npm run db:migrate:local"
  }
}
```

---

## Storage (R2)

### Example R2 Service

```typescript
// src/server/services/storage/r2.service.ts
import type { CloudflareBindings } from '@/types/cloudflare';

interface StoreResult {
  r2Key: string;
}

export async function storeFile(
  env: CloudflareBindings,
  fileId: string,
  file: File
): Promise<StoreResult> {
  const r2Key = `uploads/${fileId}-${file.name}`;
  const arrayBuffer = await file.arrayBuffer();

  await env.FILES.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
  });

  return { r2Key };
}

export async function getFile(
  env: CloudflareBindings,
  r2Key: string
): Promise<ArrayBuffer | null> {
  const object = await env.FILES.get(r2Key);
  if (!object) return null;
  return object.arrayBuffer();
}

export async function deleteFile(
  env: CloudflareBindings,
  r2Key: string
): Promise<void> {
  await env.FILES.delete(r2Key);
}
```

---

## Type System

### Cloudflare Bindings Types

```typescript
// src/types/cloudflare.ts
import type { AuthenticatedUser } from './auth.types';

export type CloudflareBindings = {
  DB: D1Database;
  FILES: R2Bucket;
  KV?: KVNamespace;
  NEXT_INC_CACHE_KV?: KVNamespace;
  AI?: {
    run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
  };
  VECTORIZE?: {
    insert(vectors: Array<{ id: string; values: number[]; metadata?: Record<string, unknown> }>): Promise<{ mutationId: string }>;
    query(vector: number[], options?: { topK?: number; filter?: Record<string, unknown> }): Promise<{ matches: Array<{ id: string; score: number }> }>;
  };

  // Environment variables
  NEXTAUTH_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
};

export type HonoEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    user?: AuthenticatedUser;
    requestId?: string;
    [key: string]: unknown;
  };
};
```

---

## RPC Client Pattern

### Type-Safe API Client with Hono

```typescript
// src/lib/rpc/files.ts
import { hc } from 'hono/client';
import type { AppType } from '@/server/hono';

const client = hc<AppType>(
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
);

// Type-safe API calls
async function getFileById(id: string) {
  const res = await client.api.files[':id'].$get({
    param: { id },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch file: ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.data;
}

async function deleteFile(id: string) {
  const res = await client.api.files[':id'].$delete({
    param: { id },
  });

  if (!res.ok) {
    throw new Error(`Failed to delete file: ${res.status}`);
  }

  return res.json();
}

export const fileRpc = {
  getFileById,
  deleteFile,
};
```

---

## Environment Variables

### Required Variables

```bash
# .dev.vars (local development)

# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
```

### Cloudflare Secrets

```bash
# Set secrets via wrangler
wrangler secret put NEXTAUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

---

## Development Workflow

### NPM Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:cloudflare": "opennextjs-cloudflare build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "deploy:production": "opennextjs-cloudflare build && npx wrangler deploy --env=production",
    "deploy:preview": "opennextjs-cloudflare build && npx wrangler deploy --env=preview",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply DB --local",
    "db:migrate:prod": "wrangler d1 migrations apply DB --remote",
    "db:studio:local": "NEXT_PUBLIC_WEBAPP_ENV=local drizzle-kit studio"
  }
}
```

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Set up local environment
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your values

# 3. Initialize local D1 database
pnpm db:migrate:local

# 4. Start development server
pnpm dev

# OR run with Cloudflare bindings locally
pnpm build:cloudflare && pnpm preview
```

---

## Deployment

### Initial Setup

```bash
# 1. Create Cloudflare resources
wrangler d1 create your-db-name
wrangler r2 bucket create your-bucket-name
wrangler kv:namespace create NEXT_INC_CACHE_KV

# 2. Update wrangler.jsonc with IDs from output

# 3. Set secrets
wrangler secret put NEXTAUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

# 4. Run migrations
pnpm db:migrate:prod

# 5. Deploy
pnpm deploy:production
```

### CI/CD Deploy

```bash
# Build and deploy
opennextjs-cloudflare build && wrangler deploy --env=production
```

---

## Quick Reference

### Creating a New Route

1. Create route file in `src/server/routes/`
2. Define Hono routes with middleware
3. Register in `src/server/hono.ts`
4. Types are automatically inferred for RPC client

### Adding Authentication to a Route

```typescript
// Require any authenticated user
.get('/protected', requireAuth(), async (c) => { ... })

// Require specific role
.get('/admin-only', requireAuth({ requiredRole: 'admin' }), async (c) => { ... })

// Or use convenience middlewares
.get('/teachers', requireTeacher, async (c) => { ... })
```

### Database Operations

```typescript
// In a route handler
const db = drizzle(c.env.DB);

// Select
const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

// Insert
const [newUser] = await db.insert(users).values({ ... }).returning();

// Update
await db.update(users).set({ name: 'New Name' }).where(eq(users.id, id));

// Delete
await db.delete(users).where(eq(users.id, id));
```

---

This documentation provides all the context needed to set up a similar Next.js 15 + Cloudflare + Hono + NextAuth application from scratch.
