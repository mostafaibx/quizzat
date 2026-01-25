/// <reference types="@cloudflare/workers-types" />

import { drizzle } from 'drizzle-orm/d1';

import { getEnv } from '../utils/helpers';

import * as schema from './schema';

// Initialize with null and create on first use
let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!dbInstance) {
    const env = await getEnv();
    // Get DB from Cloudflare env - cast through unknown for safety
    const db = (env as unknown as { DB: D1Database }).DB;
    if (!db) {
      throw new Error('D1 Database binding not found. Make sure DB is configured in wrangler.toml');
    }
    dbInstance = drizzle(db, {
      schema,
      logger: env.NODE_ENV !== 'production',
    });
  }

  return dbInstance;
}
